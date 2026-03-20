// Equb constraints
export const EQUB_MIN_STAKE = 0;
export const EQUB_MAX_STAKE = 1000;
export const EQUB_MIN_MEMBERS = 3;
export const EQUB_MAX_MEMBERS = 15;
export const EQUB_DEFAULT_DURATION_DAYS = 30;
export const EQUB_DEFAULT_COMPLETION_PCT = 0.8;
export const EQUB_HOUSE_FEE_PCT = 0.05;

// Day pass
export const DAY_PASS_EXPIRY_MINUTES = 15;

// Currency
export const CURRENCY = "ETB";

// Timezone
export const TIMEZONE = "Africa/Addis_Ababa";
export const UTC_OFFSET_HOURS = 3;

// Gamification — Points
export const POINTS_WORKOUT = 10;
export const POINTS_WORKOUT_TSOM = 15;
export const POINTS_EQUB_COMPLETE = 50;
export const POINTS_EQUB_WIN = 100;
export const POINTS_STREAK_7 = 100;
export const POINTS_STREAK_30 = 500;
export const POINTS_REFERRAL = 100;

// Gamification — Levels
export const LEVEL_THRESHOLDS = [
	{ level: 1, name: "Beginner", min_points: 0, perk: null },
	{ level: 2, name: "Active", min_points: 200, perk: null },
	{ level: 3, name: "Committed", min_points: 500, perk: "Create Equb rooms" },
	{ level: 4, name: "Dedicated", min_points: 1000, perk: null },
	{
		level: 5,
		name: "Strong",
		min_points: 2000,
		perk: "10% gym day pass discount",
	},
	{ level: 6, name: "Warrior", min_points: 4000, perk: null },
	{
		level: 7,
		name: "Champion",
		min_points: 7000,
		perk: "Priority sponsored Equbs",
	},
	{ level: 8, name: "Elite", min_points: 11000, perk: null },
	{ level: 9, name: "Master", min_points: 16000, perk: null },
	{
		level: 10,
		name: "Legend",
		min_points: 22000,
		perk: "Free sponsored Equb entry",
	},
] as const;

export function getLevelForPoints(points: number): (typeof LEVEL_THRESHOLDS)[number] {
	for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
		const level = LEVEL_THRESHOLDS[i];
		if (level && points >= level.min_points) {
			return level;
		}
	}
	return LEVEL_THRESHOLDS[0] as (typeof LEVEL_THRESHOLDS)[number];
}

export function getNextLevel(currentLevel: number): (typeof LEVEL_THRESHOLDS)[number] | null {
	const next = LEVEL_THRESHOLDS.find((l) => l.level === currentLevel + 1);
	return next ?? null;
}
