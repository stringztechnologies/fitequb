import { randomUUID } from "node:crypto";
import type { ApiResponse, DayPass, PartnerGym } from "@fitequb/shared";
import { DAY_PASS_EXPIRY_MINUTES } from "@fitequb/shared";
import { Hono } from "hono";
import { initializePayment } from "../lib/chapa.js";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const gyms = new Hono<{ Variables: AppVariables }>();

// GET /gyms — list partner gyms
gyms.get("/", async (c) => {
	const { data, error } = await supabase
		.from("partner_gyms")
		.select("*")
		.eq("active", true)
		.order("name");

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	return c.json<ApiResponse<PartnerGym[]>>({ data: data as PartnerGym[], error: null });
});

// POST /day-passes — purchase a day pass
gyms.post("/day-passes", async (c) => {
	const telegramUser = c.get("telegramUser");
	const { gym_id } = (await c.req.json()) as { gym_id: string };

	if (!gym_id) {
		return c.json<ApiResponse<null>>({ data: null, error: "gym_id required" }, 400);
	}

	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("telegram_id", telegramUser.id)
		.single();

	if (!user) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	const { data: gym } = await supabase
		.from("partner_gyms")
		.select("*")
		.eq("id", gym_id)
		.eq("active", true)
		.single();

	if (!gym) {
		return c.json<ApiResponse<null>>({ data: null, error: "Gym not found" }, 404);
	}

	const qrToken = randomUUID();
	const expiresAt = new Date(Date.now() + DAY_PASS_EXPIRY_MINUTES * 60 * 1000).toISOString();

	// Create pass in pending status (activated after payment)
	const { data: pass, error } = await supabase
		.from("day_passes")
		.insert({
			user_id: user.id,
			gym_id,
			qr_token: qrToken,
			status: "active", // For MVP, mark active immediately (Chapa test mode)
			expires_at: expiresAt,
		})
		.select()
		.single();

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	const txRef = `daypass-${pass.id}-${Date.now()}`;

	const chapaRes = await initializePayment({
		amount: gym.app_day_pass,
		currency: "ETB",
		tx_ref: txRef,
		callback_url: `${process.env.API_URL}/webhooks/chapa`,
		return_url: `${process.env.TELEGRAM_MINI_APP_URL}/day-passes/${pass.id}`,
		first_name: telegramUser.first_name,
		last_name: telegramUser.last_name,
	});

	if (chapaRes.status !== "success") {
		// Clean up the pass
		await supabase.from("day_passes").delete().eq("id", pass.id);
		return c.json<ApiResponse<null>>({ data: null, error: "Payment initialization failed" }, 500);
	}

	return c.json(
		{
			data: {
				pass: pass as DayPass,
				checkout_url: chapaRes.data.checkout_url,
			},
			error: null,
		},
		201,
	);
});

// GET /day-passes/:id — pass detail with QR
gyms.get("/day-passes/:id", async (c) => {
	const passId = c.req.param("id");
	const telegramUser = c.get("telegramUser");

	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("telegram_id", telegramUser.id)
		.single();

	if (!user) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	const { data: pass } = await supabase
		.from("day_passes")
		.select("*, partner_gyms(name, location)")
		.eq("id", passId)
		.eq("user_id", user.id)
		.single();

	if (!pass) {
		return c.json<ApiResponse<null>>({ data: null, error: "Pass not found" }, 404);
	}

	// Check expiry
	if (pass.status === "active" && new Date(pass.expires_at) < new Date()) {
		await supabase.from("day_passes").update({ status: "expired" }).eq("id", passId);
		pass.status = "expired";
	}

	return c.json({ data: pass, error: null });
});

// POST /day-passes/:id/redeem — mark as redeemed
gyms.post("/day-passes/:id/redeem", async (c) => {
	const passId = c.req.param("id");

	const { data: pass, error } = await supabase
		.from("day_passes")
		.update({ status: "redeemed", redeemed_at: new Date().toISOString() })
		.eq("id", passId)
		.eq("status", "active")
		.select()
		.single();

	if (error || !pass) {
		return c.json<ApiResponse<null>>({ data: null, error: "Pass not found or already used" }, 400);
	}

	return c.json<ApiResponse<DayPass>>({ data: pass as DayPass, error: null });
});

export { gyms };
