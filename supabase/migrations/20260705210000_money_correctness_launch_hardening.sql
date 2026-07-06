-- Money-correctness launch hardening.
-- Supabase CLI is not installed in this local environment, so this migration
-- was created manually instead of via `supabase migration new`.

CREATE TABLE IF NOT EXISTS public.payment_intents (
  tx_ref TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('stake', 'daypass', 'duel', 'coach')),
  target_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expected_amount NUMERIC NOT NULL CHECK (expected_amount > 0),
  currency TEXT NOT NULL DEFAULT 'ETB' CHECK (currency = 'ETB'),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'credited', 'mismatch', 'failed')),
  provider_status TEXT,
  provider_amount NUMERIC,
  mismatch_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_user ON public.payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_kind_status ON public.payment_intents(kind, status);

CREATE TABLE IF NOT EXISTS public.payout_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID NOT NULL REFERENCES public.equb_ledger(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ETB' CHECK (currency = 'ETB'),
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'confirmed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT,
  provider_response JSONB,
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ledger_id),
  UNIQUE (reference)
);

CREATE INDEX IF NOT EXISTS idx_payout_jobs_status ON public.payout_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payout_jobs_user ON public.payout_jobs(user_id);

ALTER TABLE public.day_passes ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.day_passes ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.day_passes ADD COLUMN IF NOT EXISTS payment_tx_ref TEXT;

ALTER TABLE public.coach_passes ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.coach_passes ADD COLUMN IF NOT EXISTS payment_tx_ref TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_equb_ledger_tx_ref_unique
  ON public.equb_ledger(tx_ref)
  WHERE tx_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_equb_members_room_user_unique
  ON public.equb_members(room_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trainer_payouts_tx_ref_unique
  ON public.trainer_payouts(tx_ref);

CREATE UNIQUE INDEX IF NOT EXISTS idx_day_passes_payment_tx_ref_unique
  ON public.day_passes(payment_tx_ref)
  WHERE payment_tx_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_passes_payment_tx_ref_unique
  ON public.coach_passes(payment_tx_ref)
  WHERE payment_tx_ref IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_payment_intents_updated_at ON public.payment_intents;
CREATE TRIGGER set_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_payout_jobs_updated_at ON public.payout_jobs;
CREATE TRIGGER set_payout_jobs_updated_at
  BEFORE UPDATE ON public.payout_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_intents service role full access" ON public.payment_intents;
CREATE POLICY "payment_intents service role full access"
  ON public.payment_intents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "payout_jobs service role full access" ON public.payout_jobs;
CREATE POLICY "payout_jobs service role full access"
  ON public.payout_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_intents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_jobs TO service_role;

DROP POLICY IF EXISTS "Anyone can view active sessions" ON public.coach_sessions;
DROP POLICY IF EXISTS "Trainers manage own sessions" ON public.coach_sessions;
DROP POLICY IF EXISTS "Users view own passes" ON public.coach_passes;
DROP POLICY IF EXISTS "Service role full access sessions" ON public.coach_sessions;
DROP POLICY IF EXISTS "Service role full access passes" ON public.coach_passes;

REVOKE ALL ON TABLE public.coach_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.coach_passes FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_trainer_balance(UUID, NUMERIC) FROM PUBLIC;

GRANT SELECT ON TABLE public.coach_sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coach_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coach_passes TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_trainer_balance(UUID, NUMERIC) TO service_role;

CREATE POLICY "coach_sessions public can read active"
  ON public.coach_sessions
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "coach_sessions service role full access"
  ON public.coach_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "coach_passes service role full access"
  ON public.coach_passes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.apply_stake_payment(
  p_tx_ref TEXT,
  p_paid_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent public.payment_intents%ROWTYPE;
  v_room public.equb_rooms%ROWTYPE;
  v_member_count INTEGER;
  v_ledger_id UUID;
BEGIN
  SELECT *
    INTO v_intent
    FROM public.payment_intents
   WHERE tx_ref = p_tx_ref
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'unknown_tx_ref');
  END IF;

  IF v_intent.kind NOT IN ('stake', 'duel') THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'wrong_intent_kind', 'kind', v_intent.kind);
  END IF;

  IF v_intent.status = 'credited' THEN
    RETURN jsonb_build_object('status', 'already_processed');
  END IF;

  IF p_paid_amount < v_intent.expected_amount THEN
    UPDATE public.payment_intents
       SET status = 'mismatch',
           provider_amount = p_paid_amount,
           mismatch_reason = 'amount_below_expected'
     WHERE tx_ref = p_tx_ref;
    RETURN jsonb_build_object('status', 'mismatch', 'reason', 'amount_below_expected');
  END IF;

  SELECT *
    INTO v_room
    FROM public.equb_rooms
   WHERE id = v_intent.target_id
   FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.payment_intents
       SET status = 'mismatch',
           mismatch_reason = 'room_not_found'
     WHERE tx_ref = p_tx_ref;
    RETURN jsonb_build_object('status', 'mismatch', 'reason', 'room_not_found');
  END IF;

  IF v_room.status <> 'pending' THEN
    UPDATE public.payment_intents
       SET status = 'mismatch',
           mismatch_reason = 'room_not_accepting_members'
     WHERE tx_ref = p_tx_ref;
    RETURN jsonb_build_object('status', 'mismatch', 'reason', 'room_not_accepting_members');
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.equb_members
     WHERE room_id = v_room.id
       AND user_id = v_intent.user_id
  ) THEN
    UPDATE public.payment_intents
       SET status = 'mismatch',
           mismatch_reason = 'user_already_member'
     WHERE tx_ref = p_tx_ref;
    RETURN jsonb_build_object('status', 'mismatch', 'reason', 'user_already_member');
  END IF;

  SELECT count(*)
    INTO v_member_count
    FROM public.equb_members
   WHERE room_id = v_room.id;

  IF v_member_count >= v_room.max_members THEN
    UPDATE public.payment_intents
       SET status = 'mismatch',
           mismatch_reason = 'room_full'
     WHERE tx_ref = p_tx_ref;
    RETURN jsonb_build_object('status', 'mismatch', 'reason', 'room_full');
  END IF;

  INSERT INTO public.equb_ledger (room_id, user_id, type, amount, tx_ref)
  VALUES (v_room.id, v_intent.user_id, 'stake', v_intent.expected_amount, p_tx_ref)
  ON CONFLICT (tx_ref) WHERE tx_ref IS NOT NULL DO NOTHING
  RETURNING id INTO v_ledger_id;

  IF v_ledger_id IS NULL THEN
    UPDATE public.payment_intents
       SET status = 'credited',
           provider_amount = p_paid_amount,
           credited_at = now()
     WHERE tx_ref = p_tx_ref;
    RETURN jsonb_build_object('status', 'already_processed');
  END IF;

  INSERT INTO public.equb_members (room_id, user_id, completed_days)
  VALUES (v_room.id, v_intent.user_id, 0);

  SELECT count(*)
    INTO v_member_count
    FROM public.equb_members
   WHERE room_id = v_room.id;

  IF v_room.status = 'pending' AND v_member_count >= v_room.min_members THEN
    UPDATE public.equb_rooms
       SET status = 'active'
     WHERE id = v_room.id;
  END IF;

  UPDATE public.payment_intents
     SET status = 'credited',
         provider_amount = p_paid_amount,
         credited_at = now()
   WHERE tx_ref = p_tx_ref;

  RETURN jsonb_build_object('status', 'credited', 'room_id', v_room.id, 'user_id', v_intent.user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_day_pass_payment(
  p_tx_ref TEXT,
  p_paid_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent public.payment_intents%ROWTYPE;
  v_pass_id UUID;
  v_ledger_id UUID;
BEGIN
  SELECT *
    INTO v_intent
    FROM public.payment_intents
   WHERE tx_ref = p_tx_ref
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'unknown_tx_ref');
  END IF;

  IF v_intent.kind <> 'daypass' THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'wrong_intent_kind', 'kind', v_intent.kind);
  END IF;

  IF v_intent.status = 'credited' THEN
    RETURN jsonb_build_object('status', 'already_processed');
  END IF;

  IF p_paid_amount < v_intent.expected_amount THEN
    UPDATE public.payment_intents
       SET status = 'mismatch',
           provider_amount = p_paid_amount,
           mismatch_reason = 'amount_below_expected'
     WHERE tx_ref = p_tx_ref;
    RETURN jsonb_build_object('status', 'mismatch', 'reason', 'amount_below_expected');
  END IF;

  UPDATE public.day_passes
     SET status = 'active',
         amount = v_intent.expected_amount,
         expires_at = now() + interval '15 minutes',
         activated_at = now(),
         payment_tx_ref = p_tx_ref
   WHERE id = v_intent.target_id
     AND user_id = v_intent.user_id
     AND status = 'pending'
  RETURNING id INTO v_pass_id;

  IF v_pass_id IS NULL THEN
    UPDATE public.payment_intents
       SET status = 'mismatch',
           mismatch_reason = 'day_pass_not_pending'
     WHERE tx_ref = p_tx_ref;
    RETURN jsonb_build_object('status', 'mismatch', 'reason', 'day_pass_not_pending');
  END IF;

  INSERT INTO public.equb_ledger (room_id, user_id, type, amount, tx_ref)
  VALUES (NULL, v_intent.user_id, 'day_pass_purchase', v_intent.expected_amount, p_tx_ref)
  ON CONFLICT (tx_ref) WHERE tx_ref IS NOT NULL DO NOTHING
  RETURNING id INTO v_ledger_id;

  UPDATE public.payment_intents
     SET status = 'credited',
         provider_amount = p_paid_amount,
         credited_at = now()
   WHERE tx_ref = p_tx_ref;

  RETURN jsonb_build_object('status', 'credited', 'pass_id', v_pass_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_coach_pass_payment(
  p_tx_ref TEXT,
  p_paid_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent public.payment_intents%ROWTYPE;
  v_pass_id UUID;
BEGIN
  SELECT *
    INTO v_intent
    FROM public.payment_intents
   WHERE tx_ref = p_tx_ref
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'unknown_tx_ref');
  END IF;

  IF v_intent.kind <> 'coach' THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'wrong_intent_kind', 'kind', v_intent.kind);
  END IF;

  IF v_intent.status = 'credited' THEN
    RETURN jsonb_build_object('status', 'already_processed');
  END IF;

  IF p_paid_amount < v_intent.expected_amount THEN
    UPDATE public.payment_intents
       SET status = 'mismatch',
           provider_amount = p_paid_amount,
           mismatch_reason = 'amount_below_expected'
     WHERE tx_ref = p_tx_ref;
    RETURN jsonb_build_object('status', 'mismatch', 'reason', 'amount_below_expected');
  END IF;

  UPDATE public.coach_passes
     SET status = 'active',
         activated_at = now(),
         payment_tx_ref = p_tx_ref
   WHERE id = v_intent.target_id
     AND user_id = v_intent.user_id
     AND status = 'pending'
  RETURNING id INTO v_pass_id;

  IF v_pass_id IS NULL THEN
    UPDATE public.payment_intents
       SET status = 'mismatch',
           mismatch_reason = 'coach_pass_not_pending'
     WHERE tx_ref = p_tx_ref;
    RETURN jsonb_build_object('status', 'mismatch', 'reason', 'coach_pass_not_pending');
  END IF;

  UPDATE public.payment_intents
     SET status = 'credited',
         provider_amount = p_paid_amount,
         credited_at = now()
   WHERE tx_ref = p_tx_ref;

  RETURN jsonb_build_object('status', 'credited', 'pass_id', v_pass_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_trainer_payout(p_trainer_id UUID)
RETURNS public.trainer_payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount NUMERIC;
  v_payout public.trainer_payouts%ROWTYPE;
  v_tx_ref TEXT;
BEGIN
  SELECT pending_balance
    INTO v_amount
    FROM public.trainers
   WHERE id = p_trainer_id
     AND status = 'active'
   FOR UPDATE;

  IF NOT FOUND OR v_amount <= 0 THEN
    RETURN NULL;
  END IF;

  v_tx_ref := 'trainer-payout-' || p_trainer_id::text || '-' || gen_random_uuid()::text;

  UPDATE public.trainers
     SET pending_balance = pending_balance - v_amount
   WHERE id = p_trainer_id;

  INSERT INTO public.trainer_payouts (trainer_id, amount, tx_ref, status)
  VALUES (p_trainer_id, v_amount, v_tx_ref, 'pending')
  RETURNING * INTO v_payout;

  RETURN v_payout;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_trainer_payout(
  p_payout_id UUID,
  p_error TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.trainer_payouts%ROWTYPE;
BEGIN
  SELECT *
    INTO v_payout
    FROM public.trainer_payouts
   WHERE id = p_payout_id
   FOR UPDATE;

  IF NOT FOUND OR v_payout.status <> 'pending' THEN
    RETURN;
  END IF;

  UPDATE public.trainers
     SET pending_balance = pending_balance + v_payout.amount
   WHERE id = v_payout.trainer_id;

  UPDATE public.trainer_payouts
     SET status = 'failed'
   WHERE id = p_payout_id;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'equb_ledger'
       AND column_name = 'paid_at'
  ) THEN
    EXECUTE $sql$
      INSERT INTO public.payout_jobs (ledger_id, user_id, amount, reference, status)
      SELECT id, user_id, amount, 'payout-' || id::text, 'pending'
        FROM public.equb_ledger
       WHERE type = 'payout'
         AND paid_at IS NULL
      ON CONFLICT (ledger_id) DO NOTHING
    $sql$;
  ELSE
    INSERT INTO public.payout_jobs (ledger_id, user_id, amount, reference, status)
    SELECT id, user_id, amount, 'payout-' || id::text, 'pending'
      FROM public.equb_ledger
     WHERE type = 'payout'
    ON CONFLICT (ledger_id) DO NOTHING;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_stake_payment(TEXT, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_day_pass_payment(TEXT, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_coach_pass_payment(TEXT, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_trainer_payout(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_trainer_payout(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.apply_stake_payment(TEXT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_day_pass_payment(TEXT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_coach_pass_payment(TEXT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_trainer_payout(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_trainer_payout(UUID, TEXT) TO service_role;
