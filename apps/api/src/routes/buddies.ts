import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const buddies = new Hono<{ Variables: AppVariables }>();

async function getUserId(telegramId: number): Promise<string | null> {
	const { data } = await supabase.from("users").select("id").eq("telegram_id", telegramId).single();
	return data?.id ?? null;
}

const requestSchema = z.object({
	equb_id: z.string().uuid(),
	partner_user_id: z.string().uuid(),
});

const acceptSchema = z.object({
	buddy_id: z.string().uuid(),
});

// POST /buddies/request — request a buddy pairing
buddies.post("/request", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const parsed = requestSchema.safeParse(await c.req.json());
	if (!parsed.success) return c.json({ data: null, error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);

	const { equb_id, partner_user_id } = parsed.data;

	if (userId === partner_user_id) {
		return c.json({ data: null, error: "Cannot buddy with yourself" }, 400);
	}

	// Check both are in the same equb
	const { data: members } = await supabase
		.from("equb_members")
		.select("user_id")
		.eq("equb_room_id", equb_id)
		.in("user_id", [userId, partner_user_id]);

	if (!members || members.length < 2) {
		return c.json({ data: null, error: "Both users must be in the same Equb" }, 400);
	}

	// Check for existing pairing
	const { data: existing } = await supabase
		.from("workout_buddies")
		.select("id, status")
		.eq("equb_room_id", equb_id)
		.or(`and(user_id.eq.${userId},buddy_id.eq.${partner_user_id}),and(user_id.eq.${partner_user_id},buddy_id.eq.${userId})`)
		.single();

	if (existing) {
		return c.json({ data: { buddy_id: existing.id, status: existing.status }, error: null });
	}

	const { data: buddy, error } = await supabase
		.from("workout_buddies")
		.insert({ equb_room_id: equb_id, user_id: userId, buddy_id: partner_user_id, status: "pending" })
		.select()
		.single();

	if (error) return c.json({ data: null, error: error.message }, 500);

	return c.json({ data: { buddy_id: buddy.id, status: "pending" }, error: null }, 201);
});

// POST /buddies/accept — accept a buddy request
buddies.post("/accept", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const parsed = acceptSchema.safeParse(await c.req.json());
	if (!parsed.success) return c.json({ data: null, error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);

	const { data: buddy, error } = await supabase
		.from("workout_buddies")
		.update({ status: "active" })
		.eq("id", parsed.data.buddy_id)
		.eq("buddy_id", userId) // only the recipient can accept
		.eq("status", "pending")
		.select()
		.single();

	if (error || !buddy) {
		return c.json({ data: null, error: "Buddy request not found or already accepted" }, 404);
	}

	return c.json({ data: { buddy_id: buddy.id, status: "active" }, error: null });
});

// GET /buddies/my-buddy?equb_id=xxx
buddies.get("/my-buddy", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const equbId = c.req.query("equb_id");
	if (!equbId) return c.json({ data: null, error: "equb_id is required" }, 400);

	const { data: pairing } = await supabase
		.from("workout_buddies")
		.select("id, user_id, buddy_id, status")
		.eq("equb_room_id", equbId)
		.eq("status", "active")
		.or(`user_id.eq.${userId},buddy_id.eq.${userId}`)
		.single();

	if (!pairing) {
		return c.json({ data: { buddy: null }, error: null });
	}

	const buddyUserId = pairing.user_id === userId ? pairing.buddy_id : pairing.user_id;

	const { data: buddyUser } = await supabase
		.from("users")
		.select("id, full_name, username")
		.eq("id", buddyUserId)
		.single();

	return c.json({
		data: {
			buddy: buddyUser ? { user_id: buddyUser.id, name: buddyUser.full_name, username: buddyUser.username } : null,
		},
		error: null,
	});
});

export { buddies };
