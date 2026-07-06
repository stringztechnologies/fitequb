import { randomBytes } from "node:crypto";
import type { ApiResponse } from "@fitequb/shared";
import { Hono } from "hono";
import { z } from "zod";
import { resolveUserId } from "../lib/resolve-user.js";
import { supabase } from "../lib/supabase.js";
import { rateLimit } from "../middleware/rate-limit.js";
import type { AppVariables } from "../types/context.js";

const duels = new Hono<{ Variables: AppVariables }>();

duels.use("/create", rateLimit(5, 60 * 1000));

const createDuelSchema = z.object({
	opponent_username: z.string().min(1).max(50),
	stake_amount: z.literal(0).default(0),
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

	const { opponent_username, stake_amount, duration_days, daily_target } = parsed.data;
	const inviteCode = `DUEL-${randomBytes(4).toString("hex").toUpperCase()}`;
	const startDate = new Date();
	const endDate = new Date(startDate.getTime() + duration_days * 24 * 60 * 60 * 1000);

	const { data: room, error } = await supabase
		.from("equb_rooms")
		.insert({
			name: `Duel: @${telegramUser?.username ?? "you"} vs @${opponent_username}`,
			description: `1v1 duel — ${daily_target.toLocaleString()} steps/day for ${duration_days} days`,
			stake_amount,
			room_type: "private",
			tier: "starter",
			max_members: 2,
			min_members: 2,
			workout_target: duration_days,
			daily_verification_threshold: daily_target,
			completion_pct: 0.8,
			start_date: startDate.toISOString(),
			end_date: endDate.toISOString(),
			status: "pending",
			creator_id: userId,
			invite_code: inviteCode,
		})
		.select()
		.single();

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	await supabase.from("equb_members").insert({
		room_id: room.id,
		user_id: userId,
		completed_days: 0,
	});

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

	const userId = await resolveUserId(c);
	if (!userId) {
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
		return c.json<ApiResponse<null>>(
			{ data: null, error: "Duel is no longer accepting challengers" },
			400,
		);
	}

	// Check not the creator
	if (room.creator_id === userId) {
		return c.json<ApiResponse<null>>({ data: null, error: "Cannot accept your own duel" }, 400);
	}

	// Check not already joined
	const { data: existing } = await supabase
		.from("equb_members")
		.select("id")
		.eq("room_id", duelId)
		.eq("user_id", userId)
		.single();

	if (existing) {
		return c.json<ApiResponse<null>>({ data: null, error: "Already joined this duel" }, 400);
	}

	if (room.stake_amount !== 0) {
		return c.json<ApiResponse<null>>(
			{ data: null, error: "Paid duels are disabled for launch" },
			400,
		);
	}

	await supabase.from("equb_members").insert({
		room_id: duelId,
		user_id: userId,
		completed_days: 0,
	});

	await supabase.from("equb_rooms").update({ status: "active" }).eq("id", duelId);
	return c.json({
		data: { duel_id: duelId, status: "active", checkout_url: null },
		error: null,
	});
});

// GET /duels/mine — user's active duels
duels.get("/mine", async (c) => {
	const userId = await resolveUserId(c);
	if (!userId) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	// Get rooms where user is a member and room is a 2-person private duel
	const { data: memberships } = await supabase
		.from("equb_members")
		.select("room_id")
		.eq("user_id", userId);

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
		.eq("creator_id", userId)
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
