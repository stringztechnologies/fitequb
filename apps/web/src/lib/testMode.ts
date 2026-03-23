/**
 * QA Test Mode utilities — provides mock data when ?test=true
 * so the app is fully navigable without a running API server.
 */

let _isTestMode: boolean | null = null;

export function isQaTestMode(): boolean {
	if (_isTestMode !== null) return _isTestMode;
	_isTestMode =
		new URLSearchParams(window.location.search).get("test") === "true";
	return _isTestMode;
}

/** Call once at app boot to persist the flag across SPA navigations */
export function initTestMode(): void {
	if (isQaTestMode()) {
		_isTestMode = true;
	}
}

// ─── Mock Equb Rooms ────────────────────────────────────────
export const MOCK_EQUB_ROOMS = [
	{
		id: "room-1",
		name: "Morning Movers",
		tier: "starter",
		stake_amount: 500,
		max_members: 5,
		min_members: 3,
		workout_target: 10,
		room_type: "public" as const,
		is_tsom: false,
		end_date: new Date(Date.now() + 5 * 86400000).toISOString(),
		status: "active",
		created_by: "user-1",
		created_at: new Date().toISOString(),
	},
	{
		id: "room-2",
		name: "Tsom Walkers",
		tier: "starter",
		stake_amount: 300,
		max_members: 8,
		min_members: 4,
		workout_target: 8,
		room_type: "public" as const,
		is_tsom: true,
		end_date: new Date(Date.now() + 12 * 86400000).toISOString(),
		status: "active",
		created_by: "user-2",
		created_at: new Date().toISOString(),
	},
	{
		id: "room-3",
		name: "Bole Gym Squad",
		tier: "regular",
		stake_amount: 1000,
		max_members: 10,
		min_members: 6,
		workout_target: 15,
		room_type: "public" as const,
		is_tsom: false,
		end_date: new Date(Date.now() + 8 * 86400000).toISOString(),
		status: "active",
		created_by: "user-3",
		created_at: new Date().toISOString(),
	},
	{
		id: "room-4",
		name: "Elite Runners Club",
		tier: "elite",
		stake_amount: 2500,
		max_members: 6,
		min_members: 4,
		workout_target: 25,
		room_type: "private" as const,
		is_tsom: false,
		end_date: new Date(Date.now() + 3 * 86400000).toISOString(),
		status: "active",
		created_by: "user-4",
		created_at: new Date().toISOString(),
	},
	{
		id: "room-5",
		name: "Addis 100K Challenge",
		tier: "regular",
		stake_amount: 750,
		max_members: 15,
		min_members: 8,
		workout_target: 20,
		room_type: "public" as const,
		is_tsom: false,
		end_date: new Date(Date.now() + 20 * 86400000).toISOString(),
		status: "active",
		created_by: "user-5",
		created_at: new Date().toISOString(),
	},
];

// ─── Mock Partner Gyms ──────────────────────────────────────
export const MOCK_GYMS = [
	{
		id: "gym-1",
		name: "Yohannes Fitness",
		location: "Bole, Addis Ababa",
		walk_in_day_pass: 350,
		app_day_pass: 250,
		is_equb_eligible: true,
		amenities: ["weights", "cardio", "showers"],
		created_at: new Date().toISOString(),
	},
	{
		id: "gym-2",
		name: "Getfit Gym",
		location: "Kazanchis, Addis Ababa",
		walk_in_day_pass: 500,
		app_day_pass: 350,
		is_equb_eligible: true,
		amenities: ["weights", "cardio", "sauna", "pool"],
		created_at: new Date().toISOString(),
	},
	{
		id: "gym-3",
		name: "Atlas Sport Center",
		location: "Sarbet, Addis Ababa",
		walk_in_day_pass: 200,
		app_day_pass: 150,
		is_equb_eligible: true,
		amenities: ["weights", "cardio"],
		created_at: new Date().toISOString(),
	},
];

// ─── Mock Challenges ────────────────────────────────────────
export const MOCK_CHALLENGES = [
	{
		id: "ch-1",
		name: "Addis 100K Steps",
		description: "Walk 100,000 steps this week around Addis Ababa. Top 3 win ETB prizes!",
		type: "steps" as const,
		target_steps: 100000,
		reward_description: "Top 3 split 5,000 ETB",
		sponsor_name: "FitEqub",
		start_date: new Date().toISOString(),
		end_date: new Date(Date.now() + 7 * 86400000).toISOString(),
		status: "active",
		created_at: new Date().toISOString(),
	},
	{
		id: "ch-2",
		name: "Weekend Warrior",
		description: "Hit 15,000 steps on Saturday and Sunday. Free entry!",
		type: "steps" as const,
		target_steps: 30000,
		reward_description: "500 ETB for all who complete",
		start_date: new Date().toISOString(),
		end_date: new Date(Date.now() + 4 * 86400000).toISOString(),
		status: "active",
		created_at: new Date().toISOString(),
	},
];

// ─── Mock Leaderboard ───────────────────────────────────────
export const MOCK_LEADERBOARD = [
	{ name: "Dawit M.", steps: 142500, etb: 3200 },
	{ name: "Sara T.", steps: 128000, etb: 2100 },
	{ name: "Yonas K.", steps: 115200, etb: 1500 },
	{ name: "Meron A.", steps: 98400, etb: 800 },
	{ name: "Abebe G.", steps: 87300, etb: 500 },
];

// ─── Mock Profile ───────────────────────────────────────────
export const MOCK_PROFILE = {
	total_points: 15400,
	referral_code: "FITEQUB-TEST",
	total_steps: 245000,
	current_streak: 7,
	referral_invited: 5,
	referral_joined: 3,
	referral_earned: 300,
	badges: [
		{ id: "b1", name: "Early Bird", icon: "wb_sunny", earned: true },
		{ id: "b2", name: "100K Steps", icon: "directions_walk", earned: true },
		{ id: "b3", name: "Team Player", icon: "groups", earned: true },
		{ id: "b4", name: "Marathoner", icon: "directions_run", earned: false },
		{ id: "b5", name: "Gym Rat", icon: "fitness_center", earned: false },
		{ id: "b6", name: "Streak Master", icon: "bolt", earned: false },
		{ id: "b7", name: "Referral King", icon: "group_add", earned: false },
		{ id: "b8", name: "Champion", icon: "emoji_events", earned: false },
	],
};

export const MOCK_POINTS = [
	{ id: "p1", points: 5000, reason: "Won Morning Movers Equb", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
	{ id: "p2", points: 3200, reason: "Addis 100K Challenge Prize", created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
	{ id: "p3", points: 100, reason: "Referral bonus — Sara T.", created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
];
