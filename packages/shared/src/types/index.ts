// ── Equb Room ──

export type EqubRoomStatus = "pending" | "active" | "settling" | "settled" | "cancelled";

export interface EqubRoom {
	id: string;
	name: string;
	creator_id: string;
	stake_amount: number;
	duration_days: number;
	workout_target: number;
	completion_pct: number;
	min_members: number;
	max_members: number;
	status: EqubRoomStatus;
	start_date: string;
	end_date: string;
	sponsor_prize: number;
	created_at: string;
}

// ── Equb Member ──

export interface EqubMember {
	id: string;
	room_id: string;
	user_id: string;
	joined_at: string;
	completed_days: number;
	qualified: boolean | null;
}

// ── Equb Ledger ──

export type LedgerEntryType = "stake" | "payout" | "fee" | "refund" | "day_pass_purchase";

export interface EqubLedgerEntry {
	id: string;
	room_id: string | null;
	user_id: string;
	type: LedgerEntryType;
	amount: number;
	tx_ref: string;
	created_at: string;
}

// ── User ──

export interface User {
	id: string;
	telegram_id: number;
	full_name: string;
	username: string | null;
	phone: string | null;
	total_points: number;
	level: number;
	badges: string[];
	referral_code: string;
	created_at: string;
}

// ── Gamification ──

export type PointSourceType =
	| "workout"
	| "equb_complete"
	| "equb_win"
	| "streak"
	| "referral"
	| "badge"
	| "challenge"
	| "tsom_bonus";

export interface PointsLedgerEntry {
	id: string;
	user_id: string;
	points: number;
	reason: string;
	source_type: PointSourceType;
	created_at: string;
}

export type BadgeCategory = "workout" | "streak" | "equb" | "social" | "special";

export interface BadgeDefinition {
	id: string;
	name: string;
	description: string;
	icon: string;
	category: BadgeCategory;
	bonus_points: number;
}

export interface Referral {
	id: string;
	referrer_id: string;
	referred_id: string;
	created_at: string;
}

export interface LevelInfo {
	level: number;
	name: string;
	min_points: number;
	perk: string | null;
}

// ── Partner Gym ──

export interface PartnerGym {
	id: string;
	name: string;
	location: string;
	lat: number | null;
	lng: number | null;
	day_pass_cost: number;
	app_day_pass: number;
	active: boolean;
}

// ── Day Pass ──

export type DayPassStatus = "active" | "redeemed" | "expired";

export interface DayPass {
	id: string;
	user_id: string;
	gym_id: string;
	qr_token: string;
	status: DayPassStatus;
	purchased_at: string;
	expires_at: string;
	redeemed_at: string | null;
}

// ── Workout ──

export type WorkoutType = "qr_checkin" | "step_count" | "photo_proof" | "gps";

export interface Workout {
	id: string;
	user_id: string;
	room_id: string;
	type: WorkoutType;
	proof_url: string | null;
	step_count: number | null;
	lat: number | null;
	lng: number | null;
	logged_at: string;
}

// ── Challenge ──

export interface Challenge {
	id: string;
	name: string;
	description: string | null;
	start_date: string;
	end_date: string;
	reward_description: string | null;
}

export interface ChallengeParticipant {
	id: string;
	challenge_id: string;
	user_id: string;
	total_steps: number;
	last_logged_at: string | null;
}

// ── API Response ──

export interface ApiResponse<T> {
	data: T | null;
	error: string | null;
}
