import { randomBytes } from "node:crypto";
import type { ApiResponse } from "@fitequb/shared";
import { Hono } from "hono";
import { z } from "zod";
import { rateLimit } from "../middleware/rate-limit.js";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const duels = new Hono<{ Variables: AppVariables }>();

duels.use("/create", rateLimit(5, 60 * 1000));

const createDuelSchema = z.object({
	opponent_username: z.string().min(1).max(50),
	stake_amount: z.number().min(0).max(5000),
	duration_days: z.number().min(3).max(30).default(7),
	daily_target: z.number().min(1000).max(50000).default(10000),
});

// POST /duels/create — create a 1v1 duel
duels.post("/create", async (c) => {
	const telegramUser = c.get("telegramUser");
	const body = await c.req.json();
	const parsed = createDuelSchema.safeParse(body);

	if (!parsed.success) {
		return c.json<ApiResponse<null>>(
			{ data: null, error: parsed.error.issues.map((i) => i.message).join(", ") },
			400,
		);
	}

	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("telegram_id", telegramUser.id)
		.single();

	if (!user) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	const { opponent_username, stake_amount, duration_days, daily_target } = parsed.data;
	const inviteCode = `DUEL-${randomBytes(4).toString("hex").toUpperCase()}`;
	const startDate = new Date();
	const endDate = new Date(startDate.getTime() + duration_days * 24 * 60 * 60 * 1000);

	const { data: room, error } = await supabase
		.from("equb_rooms")
		.insert({
			name: `Duel: @${telegramUser.username ?? "you"} vs @${opponent_username}`,
			description: `1v1 duel — ${daily_target.toLocaleString()} steps/day for ${duration_days} days`,
			stake_amount,
			room_type: "private",
			tier: stake_amount <= 500 ? "starter" : stake_amount <= 2000 ? "regular" : "elite",
			max_members: 2,
			min_members: 2,
			workout_target: duration_days,
			daily_verification_threshold: daily_target,
			completion_pct: 80,
			start_date: startDate.toISOString(),
			end_date: endDate.toISOString(),
			status: "pending",
			created_by: user.id,
			invite_code: inviteCode,
		})
		.select()
		.single();

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	// Auto-join the creator (free or triggers payment later on accept)
	if (stake_amount === 0) {
		await supabase.from("equb_members").insert({
			room_id: room.id,
			user_id: user.id,
			completed_days: 0,
		});
	}

	const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL ?? "";
	const inviteLink = `${miniAppUrl}/equbs/${room.id}?invite=${inviteCode}`;

	return c.json(
		{
			data: {
				duel_id: room.id,
				invite_code: inviteCode,
				invite_link: inviteLink,
				opponent_username,
			},
			error: null,
		},
		201,
	);
});

// POST /duels/:id/accept — opponent accepts the duel
duels.post("/:id/accept", async (c) => {
	const duelId = c.req.param("id");
	const telegramUser = c.get("telegramUser");

	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("telegram_id", telegramUser.id)
		.single();

	if (!user) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	const { data: room } = await supabase
		.from("equb_rooms")
		.select("*")
		.eq("id", duelId)
		.eq("room_type", "private")
		.eq("max_members", 2)
		.single();

	if (!room) {
		return c.json<ApiResponse<null>>({ data: null, error: "Duel not found" }, 404);
	}

	if (room.status !== "pending") {
		return c.json<ApiResponse<null>>({ data: null, error: "Duel is no longer accepting challengers" }, 400);
	}

	// Check not the creator
	if (room.created_by === user.id) {
		return c.json<ApiResponse<null>>({ data: null, error: "Cannot accept your own duel" }, 400);
	}

	// Check not already joined
	const { data: existing } = await supabase
		.from("equb_members")
		.select("id")
		.eq("room_id", duelId)
		.eq("user_id", user.id)
		.single();

	if (existing) {
		return c.json<ApiResponse<null>>({ data: null, error: "Already joined this duel" }, 400);
	}

	// For free duels, join directly
	if (room.stake_amount === 0) {
		await supabase.from("equb_members").insert({
			room_id: duelId,
			user_id: user.id,
			completed_days: 0,
		});

		// Activate the duel (both members in)
		await supabase.from("equb_rooms").update({ status: "active" }).eq("id", duelId);

		return c.json({ data: { duel_id: duelId, status: "active", checkout_url: null }, error: null });
	}

	// For paid duels, initialize Chapa payment
	const { initializePayment } = await import("../lib/chapa.js");
	const txRef = `equb-${duelId}-${user.id}-${Date.now()}`;

	const chapaRes = await initializePayment({
		amount: room.stake_amount,
		currency: "ETB",
		tx_ref: txRef,
		callback_url: `${process.env.API_URL}/webhooks/chapa`,
		return_url: `${process.env.TELEGRAM_MINI_APP_URL}/equbs/${duelId}`,
		first_name: telegramUser.first_name,
		last_name: telegramUser.last_name,
		phone_number: undefined,
	});

	if (chapaRes.status !== "success") {
		return c.json<ApiResponse<null>>({ data: null, error: "Payment initialization failed" }, 500);
	}

	return c.json({
		data: {
			duel_id: duelId,
			checkout_url: chapaRes.data.checkout_url,
			tx_ref: txRef,
		},
		error: null,
	});
});

// GET /duels/mine — user's active duels
duels.get("/mine", async (c) => {
	const telegramUser = c.get("telegramUser");

	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("telegram_id", telegramUser.id)
		.single();

	if (!user) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	// Get rooms where user is a member and room is a 2-person private duel
	const { data: memberships } = await supabase
		.from("equb_members")
		.select("room_id")
		.eq("user_id", user.id);

	if (!memberships || memberships.length === 0) {
		return c.json({ data: [], error: null });
	}

	const roomIds = memberships.map((m) => m.room_id);

	const { data: duelRooms } = await supabase
		.from("equb_rooms")
		.select("*")
		.in("id", roomIds)
		.eq("room_type", "private")
		.eq("max_members", 2)
		.order("created_at", { ascending: false });

	// Also include duels the user created but hasn't been joined yet
	const { data: createdDuels } = await supabase
		.from("equb_rooms")
		.select("*")
		.eq("created_by", user.id)
		.eq("room_type", "private")
		.eq("max_members", 2)
		.eq("status", "pending")
		.order("created_at", { ascending: false });

	const allDuels = [...(duelRooms ?? []), ...(createdDuels ?? [])];
	// Deduplicate by id
	const seen = new Set<string>();
	const unique = allDuels.filter((d) => {
		if (seen.has(d.id)) return false;
		seen.add(d.id);
		return true;
	});

	return c.json({ data: unique, error: null });
});

export { duels };
