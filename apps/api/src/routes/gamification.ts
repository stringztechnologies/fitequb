import type { ApiResponse, BadgeDefinition, LevelInfo, PointsLedgerEntry } from "@fitequb/shared";
import { LEVEL_THRESHOLDS, getNextLevel } from "@fitequb/shared";
import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const gamification = new Hono<{ Variables: AppVariables }>();

// GET /gamification/profile — user's gamification profile
gamification.get("/profile", async (c) => {
	const telegramUser = c.get("telegramUser");

	const { data: user } = await supabase
		.from("users")
		.select("id, total_points, level, badges, referral_code")
		.eq("telegram_id", telegramUser.id)
		.single();

	if (!user) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	const currentLevel = LEVEL_THRESHOLDS.find((l) => l.level === user.level) ?? LEVEL_THRESHOLDS[0];
	const nextLevel = getNextLevel(user.level);

	// Get earned badges with definitions
	const { data: badgeDefs } = await supabase
		.from("badge_definitions")
		.select("*")
		.order("category");

	const earnedBadgeIds = new Set(user.badges ?? []);

	const badges = (badgeDefs ?? []).map((b) => ({
		...b,
		earned: earnedBadgeIds.has(b.id),
	}));

	return c.json({
		data: {
			total_points: user.total_points,
			level: currentLevel,
			next_level: nextLevel,
			points_to_next: nextLevel ? nextLevel.min_points - user.total_points : 0,
			referral_code: user.referral_code,
			badges,
		},
		error: null,
	});
});

// GET /gamification/points — user's points history
gamification.get("/points", async (c) => {
	const telegramUser = c.get("telegramUser");

	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("telegram_id", telegramUser.id)
		.single();

	if (!user) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	const { data, error } = await supabase
		.from("points_ledger")
		.select("*")
		.eq("user_id", user.id)
		.order("created_at", { ascending: false })
		.limit(50);

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	return c.json<ApiResponse<PointsLedgerEntry[]>>({
		data: data as PointsLedgerEntry[],
		error: null,
	});
});

// GET /gamification/badges — all badge definitions
gamification.get("/badges", async (c) => {
	const { data, error } = await supabase.from("badge_definitions").select("*").order("category");

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	return c.json<ApiResponse<BadgeDefinition[]>>({
		data: data as BadgeDefinition[],
		error: null,
	});
});

// GET /gamification/levels — all level definitions
gamification.get("/levels", async (c) => {
	return c.json<ApiResponse<readonly LevelInfo[]>>({
		data: LEVEL_THRESHOLDS,
		error: null,
	});
});

// POST /gamification/referral — apply a referral code
gamification.post("/referral", async (c) => {
	const telegramUser = c.get("telegramUser");
	const body = await c.req.json();
	const code = body.code as string;

	if (!code) {
		return c.json<ApiResponse<null>>({ data: null, error: "Referral code is required" }, 400);
	}

	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("telegram_id", telegramUser.id)
		.single();

	if (!user) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not found" }, 404);
	}

	// Find referrer by code
	const { data: referrer } = await supabase
		.from("users")
		.select("id")
		.eq("referral_code", code)
		.single();

	if (!referrer) {
		return c.json<ApiResponse<null>>({ data: null, error: "Invalid referral code" }, 400);
	}

	if (referrer.id === user.id) {
		return c.json<ApiResponse<null>>({ data: null, error: "Cannot refer yourself" }, 400);
	}

	// Check if already referred
	const { data: existing } = await supabase
		.from("referrals")
		.select("id")
		.eq("referred_id", user.id)
		.single();

	if (existing) {
		return c.json<ApiResponse<null>>({ data: null, error: "Already used a referral code" }, 400);
	}

	// Create referral
	await supabase.from("referrals").insert({
		referrer_id: referrer.id,
		referred_id: user.id,
	});

	// Award points to referrer
	await supabase.rpc("award_points", {
		p_user_id: referrer.id,
		p_points: 100,
		p_reason: "Referral bonus",
		p_source_type: "referral",
	});

	return c.json({ data: { success: true }, error: null });
});

// GET /gamification/leaderboard — top users by points
gamification.get("/leaderboard", async (c) => {
	const { data, error } = await supabase
		.from("users")
		.select("id, full_name, username, total_points, level")
		.order("total_points", { ascending: false })
		.limit(50);

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	return c.json({ data, error: null });
});

export { gamification };
