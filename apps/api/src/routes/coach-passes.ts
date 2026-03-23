import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { initializePayment } from "../lib/chapa.js";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const PLATFORM_FEE_PCT = 0.20; // 20% platform fee on coach sessions

const coachPasses = new Hono<{ Variables: AppVariables }>();

// --- Schemas ---

const createSessionSchema = z.object({
	title: z.string().min(2).max(100),
	description: z.string().max(500).optional(),
	session_type: z.enum(["in_person", "virtual"]),
	duration_minutes: z.number().int().min(15).max(240),
	price: z.number().min(50).max(10000),
});

const updateSessionSchema = z.object({
	title: z.string().min(2).max(100).optional(),
	description: z.string().max(500).optional(),
	session_type: z.enum(["in_person", "virtual"]).optional(),
	duration_minutes: z.number().int().min(15).max(240).optional(),
	price: z.number().min(50).max(10000).optional(),
	active: z.boolean().optional(),
});

const purchaseSchema = z.object({
	session_id: z.string().uuid(),
	scheduled_at: z.string().optional(),
	notes: z.string().max(500).optional(),
});

// --- Helper ---

async function getUserId(telegramId: number): Promise<string | null> {
	const { data } = await supabase.from("users").select("id").eq("telegram_id", telegramId).single();
	return data?.id ?? null;
}

async function getTrainerId(userId: string): Promise<string | null> {
	const { data } = await supabase.from("trainers").select("id").eq("user_id", userId).eq("status", "active").single();
	return data?.id ?? null;
}

// ============================================================
// TRAINER ENDPOINTS (manage sessions)
// ============================================================

// POST /coach-passes/sessions — trainer creates a session offering
coachPasses.post("/sessions", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const trainerId = await getTrainerId(userId);
	if (!trainerId) return c.json({ data: null, error: "Not a registered trainer" }, 403);

	const parsed = createSessionSchema.safeParse(await c.req.json());
	if (!parsed.success) return c.json({ data: null, error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);

	const { data: session, error } = await supabase
		.from("coach_sessions")
		.insert({ trainer_id: trainerId, ...parsed.data, active: true })
		.select()
		.single();

	if (error) return c.json({ data: null, error: error.message }, 500);

	return c.json({ data: session, error: null }, 201);
});

// GET /coach-passes/sessions/mine — trainer's own sessions
coachPasses.get("/sessions/mine", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const trainerId = await getTrainerId(userId);
	if (!trainerId) return c.json({ data: null, error: "Not a registered trainer" }, 403);

	const { data: sessions } = await supabase
		.from("coach_sessions")
		.select("*")
		.eq("trainer_id", trainerId)
		.order("created_at", { ascending: false });

	return c.json({ data: sessions ?? [], error: null });
});

// PATCH /coach-passes/sessions/:id — trainer updates a session
coachPasses.patch("/sessions/:id", async (c) => {
	const sessionId = c.req.param("id");
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const trainerId = await getTrainerId(userId);
	if (!trainerId) return c.json({ data: null, error: "Not a registered trainer" }, 403);

	const parsed = updateSessionSchema.safeParse(await c.req.json());
	if (!parsed.success) return c.json({ data: null, error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);

	const { data: session, error } = await supabase
		.from("coach_sessions")
		.update(parsed.data)
		.eq("id", sessionId)
		.eq("trainer_id", trainerId)
		.select()
		.single();

	if (error || !session) return c.json({ data: null, error: "Session not found or not yours" }, 404);

	return c.json({ data: session, error: null });
});

// ============================================================
// USER ENDPOINTS (browse & purchase)
// ============================================================

// GET /coach-passes/browse — list available coaches + sessions
coachPasses.get("/browse", async (c) => {
	const { data: sessions } = await supabase
		.from("coach_sessions")
		.select(`
			*,
			trainers (
				id,
				gym_name,
				users ( full_name, username )
			)
		`)
		.eq("active", true)
		.order("price", { ascending: true });

	if (!sessions) return c.json({ data: [], error: null });

	const formatted = sessions.map((s: Record<string, unknown>) => {
		const trainer = s.trainers as Record<string, unknown> | null;
		const user = trainer?.users as Record<string, unknown> | null;
		return {
			id: s.id,
			title: s.title,
			description: s.description,
			session_type: s.session_type,
			duration_minutes: s.duration_minutes,
			price: s.price,
			trainer_name: user?.full_name ?? "Coach",
			trainer_username: user?.username ?? null,
			gym_name: trainer?.gym_name ?? null,
			trainer_id: trainer?.id,
		};
	});

	return c.json({ data: formatted, error: null });
});

// POST /coach-passes/purchase — buy a coach day pass
coachPasses.post("/purchase", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const parsed = purchaseSchema.safeParse(await c.req.json());
	if (!parsed.success) return c.json({ data: null, error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);

	// Get session details
	const { data: session } = await supabase
		.from("coach_sessions")
		.select("*, trainers(id, user_id)")
		.eq("id", parsed.data.session_id)
		.eq("active", true)
		.single();

	if (!session) return c.json({ data: null, error: "Session not found or unavailable" }, 404);

	const trainer = session.trainers as Record<string, unknown> | null;
	if (!trainer) return c.json({ data: null, error: "Trainer not found" }, 404);

	// Can't buy your own session
	if (trainer.user_id === userId) {
		return c.json({ data: null, error: "Cannot purchase your own session" }, 400);
	}

	const pricePaid = session.price as number;
	const platformFee = Math.round(pricePaid * PLATFORM_FEE_PCT);
	const trainerPayout = pricePaid - platformFee;
	const qrToken = randomUUID();

	const { data: pass, error } = await supabase
		.from("coach_passes")
		.insert({
			user_id: userId,
			trainer_id: trainer.id as string,
			session_id: parsed.data.session_id,
			status: "pending",
			price_paid: pricePaid,
			trainer_payout: trainerPayout,
			platform_fee: platformFee,
			scheduled_at: parsed.data.scheduled_at ?? null,
			notes: parsed.data.notes ?? null,
			qr_token: qrToken,
		})
		.select()
		.single();

	if (error) return c.json({ data: null, error: error.message }, 500);

	// Init Chapa payment
	const txRef = `coach-${pass.id}-${Date.now()}`;

	const chapaRes = await initializePayment({
		amount: pricePaid,
		currency: "ETB",
		tx_ref: txRef,
		callback_url: `${process.env.API_URL}/webhooks/chapa`,
		return_url: `${process.env.TELEGRAM_MINI_APP_URL}/coach-passes/${pass.id}`,
		first_name: telegramUser.first_name,
		last_name: telegramUser.last_name,
	});

	if (chapaRes.status !== "success") {
		await supabase.from("coach_passes").delete().eq("id", pass.id);
		return c.json({ data: null, error: "Payment initialization failed" }, 500);
	}

	return c.json({
		data: { pass, checkout_url: chapaRes.data.checkout_url },
		error: null,
	}, 201);
});

// GET /coach-passes/mine — user's purchased coach passes
coachPasses.get("/mine", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const { data: passes } = await supabase
		.from("coach_passes")
		.select(`
			*,
			coach_sessions ( title, session_type, duration_minutes ),
			trainers ( gym_name, users ( full_name ) )
		`)
		.eq("user_id", userId)
		.order("created_at", { ascending: false });

	return c.json({ data: passes ?? [], error: null });
});

// GET /coach-passes/:id — pass detail
coachPasses.get("/:id", async (c) => {
	const passId = c.req.param("id");
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const { data: pass } = await supabase
		.from("coach_passes")
		.select(`
			*,
			coach_sessions ( title, description, session_type, duration_minutes ),
			trainers ( gym_name, phone, users ( full_name, username ) )
		`)
		.eq("id", passId)
		.or(`user_id.eq.${userId},trainer_id.in.(select id from trainers where user_id='${userId}')`)
		.single();

	if (!pass) return c.json({ data: null, error: "Pass not found" }, 404);

	return c.json({ data: pass, error: null });
});

// POST /coach-passes/:id/confirm — trainer confirms session happened
coachPasses.post("/:id/confirm", async (c) => {
	const passId = c.req.param("id");
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const trainerId = await getTrainerId(userId);
	if (!trainerId) return c.json({ data: null, error: "Not a trainer" }, 403);

	const { data: pass, error } = await supabase
		.from("coach_passes")
		.update({
			status: "completed",
			confirmed_at: new Date().toISOString(),
			completed_at: new Date().toISOString(),
		})
		.eq("id", passId)
		.eq("trainer_id", trainerId)
		.eq("status", "active")
		.select()
		.single();

	if (error || !pass) return c.json({ data: null, error: "Pass not found or already completed" }, 400);

	// Credit trainer's pending balance
	await supabase.rpc("increment_trainer_balance", {
		p_trainer_id: trainerId,
		p_amount: pass.trainer_payout,
	});

	// Award verification points to user
	await supabase.from("point_events").insert({
		user_id: pass.user_id,
		points: 40,
		reason: "Coach session completed",
	});

	return c.json({ data: pass, error: null });
});

// GET /coach-passes/trainer/bookings — trainer sees incoming bookings
coachPasses.get("/trainer/bookings", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const trainerId = await getTrainerId(userId);
	if (!trainerId) return c.json({ data: null, error: "Not a trainer" }, 403);

	const { data: bookings } = await supabase
		.from("coach_passes")
		.select(`
			*,
			coach_sessions ( title, session_type, duration_minutes ),
			users!coach_passes_user_id_fkey ( full_name, username )
		`)
		.eq("trainer_id", trainerId)
		.in("status", ["active", "confirmed"])
		.order("scheduled_at", { ascending: true });

	return c.json({ data: bookings ?? [], error: null });
});

export { coachPasses };
