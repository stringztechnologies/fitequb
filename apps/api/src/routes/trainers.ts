import type { ApiResponse, Trainer, TrainerEarning, TrainerPayout } from "@fitequb/shared";
import { Hono } from "hono";
import { z } from "zod";
import { initiateTransfer } from "../lib/chapa.js";
import type { ChapaTransferResponse } from "../lib/chapa.js";
import { resolveUserId } from "../lib/resolve-user.js";
import { supabase } from "../lib/supabase.js";
import { rateLimit } from "../middleware/rate-limit.js";
import type { AppVariables } from "../types/context.js";

const trainers = new Hono<{ Variables: AppVariables }>();

trainers.use("/request-payout", rateLimit(3, 60 * 1000));

const registerSchema = z.object({
	gym_name: z.string().min(2).max(100).optional(),
	phone: z.string().min(9).max(15),
});

// POST /trainers/register — trainer signs up
trainers.post("/register", async (c) => {
	const telegramUser = c.get("telegramUser");
	const body = await c.req.json();
	const parsed = registerSchema.safeParse(body);

	if (!parsed.success) {
		return c.json<ApiResponse<null>>(
			{
				data: null,
				error: parsed.error.issues.map((i) => i.message).join(", "),
			},
			400,
		);
	}

	const userId = await resolveUserId(c);
	if (!userId) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	// Check if already a trainer
	const { data: existing } = await supabase
		.from("trainers")
		.select("id")
		.eq("user_id", userId)
		.single();

	if (existing) {
		return c.json<ApiResponse<null>>({ data: null, error: "Already registered as a trainer" }, 400);
	}

	// Generate unique affiliate code
	const code = `FIT-${telegramUser?.username ?? userId}`.toUpperCase().slice(0, 20);

	const { data: trainer, error } = await supabase
		.from("trainers")
		.insert({
			user_id: userId,
			affiliate_code: code,
			gym_name: parsed.data.gym_name ?? null,
			phone: parsed.data.phone,
			commission_rate: 0.1,
			status: "active",
			total_earned: 0,
			pending_balance: 0,
		})
		.select()
		.single();

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	return c.json<ApiResponse<Trainer>>({ data: trainer as Trainer, error: null }, 201);
});

// GET /trainers/dashboard — trainer's earnings, referred users, payouts
trainers.get("/dashboard", async (c) => {
	const userId = await resolveUserId(c);
	if (!userId) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	const { data: trainer } = await supabase
		.from("trainers")
		.select("*")
		.eq("user_id", userId)
		.single();

	if (!trainer) {
		return c.json<ApiResponse<null>>({ data: null, error: "Not a trainer" }, 404);
	}

	// Get referred users
	const { data: referredUsers } = await supabase
		.from("users")
		.select("id, full_name, username, created_at")
		.eq("referred_by_trainer", trainer.id);

	// Get recent earnings
	const { data: earnings } = await supabase
		.from("trainer_earnings")
		.select("*")
		.eq("trainer_id", trainer.id)
		.order("created_at", { ascending: false })
		.limit(50);

	// Get payout history
	const { data: payouts } = await supabase
		.from("trainer_payouts")
		.select("*")
		.eq("trainer_id", trainer.id)
		.order("created_at", { ascending: false })
		.limit(20);

	return c.json({
		data: {
			trainer: trainer as Trainer,
			referred_users: referredUsers ?? [],
			earnings: (earnings ?? []) as TrainerEarning[],
			payouts: (payouts ?? []) as TrainerPayout[],
		},
		error: null,
	});
});

// POST /trainers/request-payout — triggers Chapa transfer
trainers.post("/request-payout", async (c) => {
	const userId = await resolveUserId(c);
	if (!userId) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	const { data: user } = await supabase
		.from("users")
		.select("id, full_name")
		.eq("id", userId)
		.single();

	if (!user) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	const { data: trainer } = await supabase
		.from("trainers")
		.select("*")
		.eq("user_id", userId)
		.single();

	if (!trainer) {
		return c.json<ApiResponse<null>>({ data: null, error: "Not a trainer" }, 404);
	}

	if (trainer.pending_balance <= 0) {
		return c.json<ApiResponse<null>>({ data: null, error: "No pending balance" }, 400);
	}

	if (trainer.status !== "active") {
		return c.json<ApiResponse<null>>({ data: null, error: "Trainer account not active" }, 403);
	}

	if (!trainer.phone) {
		return c.json<ApiResponse<null>>(
			{ data: null, error: "Trainer phone number is required for payout" },
			400,
		);
	}

	const { data: payoutData, error: payoutError } = await supabase.rpc("claim_trainer_payout", {
		p_trainer_id: trainer.id,
	});

	const payout = payoutData as TrainerPayout | null;
	if (payoutError || !payout) {
		return c.json<ApiResponse<null>>(
			{
				data: null,
				error: payoutError?.message ?? "No pending balance",
			},
			payoutError ? 500 : 400,
		);
	}

	// Initiate Chapa transfer. If the request state is ambiguous, keep the
	// claimed payout pending for manual reconciliation instead of refunding.
	let transferResult: ChapaTransferResponse;
	try {
		transferResult = await initiateTransfer({
			account_name: user.full_name ?? "Trainer",
			account_number: trainer.phone,
			amount: payout.amount,
			currency: "ETB",
			reference: payout.tx_ref,
			bank_code: "telebirr",
		});
	} catch (error) {
		return c.json(
			{
				data: {
					success: false,
					amount: payout.amount,
					tx_ref: payout.tx_ref,
					review_required: true,
				},
				error: error instanceof Error ? error.message : "Transfer request state is unknown",
			},
			503,
		);
	}

	const success = transferResult?.status === "success";

	if (success) {
		const { error: updateError } = await supabase
			.from("trainer_payouts")
			.update({ status: "completed" })
			.eq("id", payout.id);

		if (updateError) {
			return c.json<ApiResponse<null>>({ data: null, error: updateError.message }, 500);
		}
	} else {
		await supabase.rpc("refund_trainer_payout", {
			p_payout_id: payout.id,
			p_error: transferResult?.message ?? "Transfer failed",
		});
	}

	return c.json({
		data: { success, amount: payout.amount, tx_ref: payout.tx_ref },
		error: success ? null : "Transfer failed — please try again later",
	});
});

// GET /trainers/:code — validate affiliate code (public-ish, used during signup)
trainers.get("/:code", async (c) => {
	const code = c.req.param("code");

	const { data: trainer } = await supabase
		.from("trainers")
		.select("id, affiliate_code, gym_name, status")
		.eq("affiliate_code", code.toUpperCase())
		.eq("status", "active")
		.single();

	if (!trainer) {
		return c.json<ApiResponse<null>>({ data: null, error: "Invalid trainer code" }, 404);
	}

	return c.json({
		data: { trainer_id: trainer.id, gym_name: trainer.gym_name },
		error: null,
	});
});

export { trainers };
