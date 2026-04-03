// ── Equb Room ──

export type EqubRoomStatus =
  | "pending"
  | "active"
  | "settling"
  | "settled"
  | "cancelled";
export type EqubRoomType = "public" | "private" | "sponsored";
export type EqubTier = "starter" | "regular" | "elite";

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
  is_tsom: boolean;
  tsom_workout_target: number | null;
  tsom_completion_pct: number | null;
  created_at: string;
  room_type: EqubRoomType;
  tier: EqubTier;
  invite_code: string | null;
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

export type LedgerEntryType =
  | "stake"
  | "payout"
  | "fee"
  | "refund"
  | "day_pass_purchase";

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
  telegram_id: number | null;
  supabase_uid: string | null;
  email: string | null;
  full_name: string;
  username: string | null;
  phone: string | null;
  total_points: number;
  level: number;
  badges: string[];
  referral_code: string;
  referred_by_trainer: string | null;
  created_at: string;
}

// ── Trainer / Affiliate ──

export type TrainerStatus = "pending" | "active" | "suspended";

export interface Trainer {
  id: string;
  user_id: string;
  affiliate_code: string;
  gym_name: string | null;
  phone: string | null;
  commission_rate: number;
  status: TrainerStatus;
  total_earned: number;
  pending_balance: number;
  created_at: string;
}

export interface TrainerEarning {
  id: string;
  trainer_id: string;
  equb_id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

export interface TrainerPayout {
  id: string;
  trainer_id: string;
  amount: number;
  tx_ref: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

// ── Coach Day Pass ──

export type CoachPassStatus =
  | "pending"
  | "active"
  | "confirmed"
  | "completed"
  | "expired"
  | "cancelled";
export type SessionType = "in_person" | "virtual";

export interface CoachSession {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  session_type: SessionType;
  duration_minutes: number;
  price: number;
  active: boolean;
  created_at: string;
}

export interface CoachPass {
  id: string;
  user_id: string;
  trainer_id: string;
  session_id: string;
  status: CoachPassStatus;
  price_paid: number;
  trainer_payout: number;
  platform_fee: number;
  scheduled_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  qr_token: string;
  notes: string | null;
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

export type BadgeCategory =
  | "workout"
  | "streak"
  | "equb"
  | "social"
  | "special";

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
  target_steps: number;
  reward_desc: string | null;
  sponsor_name: string | null;
  is_active: boolean;
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
