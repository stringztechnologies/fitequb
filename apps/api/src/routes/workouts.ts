import type { ApiResponse, Workout } from "@fitequb/shared";
import { Hono } from "hono";
import { z } from "zod";
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

	return c.json<ApiResponse<Workout>>({ data: workout as Workout, error: null }, 201);
});

export { workouts };
