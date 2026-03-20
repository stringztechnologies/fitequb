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
	created_at: string;
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
