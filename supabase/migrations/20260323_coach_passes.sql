-- Coach Sessions: trainers list their available session types
CREATE TABLE IF NOT EXISTS coach_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  session_type TEXT NOT NULL CHECK (session_type IN ('in_person', 'virtual')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 15 AND duration_minutes <= 240),
  price NUMERIC NOT NULL CHECK (price >= 50 AND price <= 10000),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coach Passes: purchased session passes
CREATE TABLE IF NOT EXISTS coach_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES coach_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'confirmed', 'completed', 'expired', 'cancelled')),
  price_paid NUMERIC NOT NULL,
  trainer_payout NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  scheduled_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  qr_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coach_sessions_trainer ON coach_sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_coach_sessions_active ON coach_sessions(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_coach_passes_user ON coach_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_passes_trainer ON coach_passes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_coach_passes_status ON coach_passes(status);

-- Helper: increment trainer pending balance
CREATE OR REPLACE FUNCTION increment_trainer_balance(p_trainer_id UUID, p_amount NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE trainers
  SET pending_balance = pending_balance + p_amount,
      total_earned = total_earned + p_amount
  WHERE id = p_trainer_id;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_passes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active sessions
CREATE POLICY "Anyone can view active sessions"
  ON coach_sessions FOR SELECT
  USING (active = true);

-- Trainers can manage their own sessions
CREATE POLICY "Trainers manage own sessions"
  ON coach_sessions FOR ALL
  USING (true);

-- Users can view their own passes
CREATE POLICY "Users view own passes"
  ON coach_passes FOR SELECT
  USING (true);

-- Service role can do everything (API uses service key)
CREATE POLICY "Service role full access sessions"
  ON coach_sessions FOR ALL
  USING (true);

CREATE POLICY "Service role full access passes"
  ON coach_passes FOR ALL
  USING (true);
