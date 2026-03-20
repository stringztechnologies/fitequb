import type { ApiResponse, Workout } from "@fitequb/shared";
import { POINTS_WORKOUT, POINTS_WORKOUT_TSOM } from "@fitequb/shared";
import { Hono } from "hono";
import { z } from "zod";
import { checkAndNotifyLevelUp } from "../lib/notifications.js";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const workouts = new Hono<{ Variables: AppVariables }>();

const logWorkoutSchema = z.object({
	room_id: z.string().uuid(),
	type: z.enum(["qr_checkin", "step_count", "photo_proof", "gps"]),
	step_count: z.number().min(0).optional(),
	proof_url: z.string().url().optional(),
	lat: z.number().optional(),
	lng: z.number().optional(),
});

// POST /workouts — log a workout
workouts.post("/", async (c) => {
	const telegramUser = c.get("telegramUser");
	const body = await c.req.json();
	const parsed = logWorkoutSchema.safeParse(body);

	if (!parsed.success) {
		return c.json<ApiResponse<null>>(
			{
				data: null,
				error: parsed.error.issues.map((i) => i.message).join(", "),
			},
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

	// Verify user is a member of this room
	const { data: membership } = await supabase
		.from("equb_members")
		.select("id")
		.eq("room_id", parsed.data.room_id)
		.eq("user_id", user.id)
		.single();

	if (!membership) {
		return c.json<ApiResponse<null>>({ data: null, error: "Not a member of this room" }, 403);
	}

	// Check room is active
	const { data: room } = await supabase
		.from("equb_rooms")
		.select("status")
		.eq("id", parsed.data.room_id)
		.single();

	if (!room || room.status !== "active") {
		return c.json<ApiResponse<null>>({ data: null, error: "Room is not active" }, 400);
	}

	// Check if already logged today
	const today = new Date().toISOString().split("T")[0];
	const { data: existingWorkout } = await supabase
		.from("workouts")
		.select("id")
		.eq("user_id", user.id)
		.eq("room_id", parsed.data.room_id)
		.gte("logged_at", `${today}T00:00:00Z`)
		.lt("logged_at", `${today}T23:59:59Z`)
		.single();

	if (existingWorkout) {
		return c.json<ApiResponse<null>>({ data: null, error: "Already logged a workout today" }, 400);
	}

	// Create workout
	const { data: workout, error } = await supabase
		.from("workouts")
		.insert({
			user_id: user.id,
			room_id: parsed.data.room_id,
			type: parsed.data.type,
			step_count: parsed.data.step_count ?? null,
			proof_url: parsed.data.proof_url ?? null,
			lat: parsed.data.lat ?? null,
			lng: parsed.data.lng ?? null,
		})
		.select()
		.single();

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	// Increment completed_days on equb_members
	await supabase.rpc("increment_completed_days", {
		p_equb_id: parsed.data.room_id,
		p_user_id: user.id,
	});

	// Get current points before awarding (for level-up check)
	const { data: userBefore } = await supabase
		.from("users")
		.select("total_points")
		.eq("id", user.id)
		.single();
	const pointsBefore = userBefore?.total_points ?? 0;

	// Award points for workout (Tsom bonus during Ethiopian fasting)
	const now = new Date();
	const month = now.getMonth();
	const day = now.getDate();
	const isTsom = month === 2 || month === 3 || (month === 0 && day <= 7);
	const pointsAmount = isTsom ? POINTS_WORKOUT_TSOM : POINTS_WORKOUT;
	const reason = isTsom ? "Workout logged (Tsom bonus)" : "Workout logged";

	await supabase.rpc("award_points", {
		p_user_id: user.id,
		p_points: pointsAmount,
		p_reason: reason,
		p_source_type: isTsom ? "tsom_bonus" : "workout",
	});

	// Check streak badges and level-up notification (fire-and-forget)
	checkStreakBadges(user.id).catch(() => {});
	checkAndNotifyLevelUp(user.id, pointsBefore).catch(() => {});

	return c.json<ApiResponse<Workout>>({ data: workout as Workout, error: null }, 201);
});

async function checkStreakBadges(userId: string) {
	// Count consecutive days with workouts
	const { data: recentWorkouts } = await supabase
		.from("workouts")
		.select("logged_at")
		.eq("user_id", userId)
		.order("logged_at", { ascending: false })
		.limit(31);

	if (!recentWorkouts) return;

	// Count streak from unique days
	const days = new Set(recentWorkouts.map((w) => w.logged_at.split("T")[0]));
	let streak = 0;
	const d = new Date();
	for (let i = 0; i < 31; i++) {
		const dateStr = d.toISOString().split("T")[0];
		if (days.has(dateStr)) {
			streak++;
		} else if (i > 0) {
			break;
		}
		d.setDate(d.getDate() - 1);
	}

	// 7-day streak badge
	if (streak >= 7) {
		const { data: badge } = await supabase
			.from("badge_definitions")
			.select("id")
			.eq("name", "7-Day Streak")
			.single();
		if (badge) {
			await supabase.rpc("grant_badge", {
				p_user_id: userId,
				p_badge_id: badge.id,
			});
		}
	}

	// 30-day streak badge
	if (streak >= 30) {
		const { data: badge } = await supabase
			.from("badge_definitions")
			.select("id")
			.eq("name", "30-Day Streak")
			.single();
		if (badge) {
			await supabase.rpc("grant_badge", {
				p_user_id: userId,
				p_badge_id: badge.id,
			});
		}
	}
}

export { workouts };
