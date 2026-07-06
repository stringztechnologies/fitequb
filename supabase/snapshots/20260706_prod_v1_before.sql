-- ============================================================================
-- FitEqub — Production "before" snapshot (project ufkkisleoimltqbnexpf)
-- Captured 2026-07-06, read-only, via the Codex Supabase connector.
-- This is the evidence S2 (20260705120000_s2_schema_reconciliation.sql) was
-- authored against. It is a documentation artifact, NOT an executable schema.
-- ============================================================================

-- ── Verdict ─────────────────────────────────────────────────────────────────
-- Live production is the original v1 schema. All committed code (incl.
-- origin/main, which Coolify deploys) speaks v2 vocabulary. The half-finished
-- in-code rename was never accompanied by a DDL migration, so the deployed app
-- has never successfully executed an equb operation against this database.

-- ── Row counts (money domain is virgin; only seed/reference data exists) ─────
--   equb_rooms .................... 5   (all status=pending, funding_type=peer, room_type=public)
--   partner_gyms .................. 3
--   challenges .................... 3
--   badge_definitions ............ 18
--   users ......................... 0
--   equb_members .................. 0
--   equb_ledger ................... 0
--   workout_buddies ............... 0
--   workouts ...................... 0
--   workout_verifications ......... 0
--   daily_verification_summary .... 0
--   day_passes .................... 0
--   coach_sessions ................ 0
--   coach_passes .................. 0
--   trainers ...................... 0
--   trainer_earnings .............. 0
--   trainer_payouts ............... 0
--   points_ledger ................. 0
--   referrals ..................... 0
--   gym_settlements ............... 0
--   challenge_participants ........ 0

-- ── Confirmed v1 column drift (live column  ->  v2 code column) ──────────────
-- equb_ledger:   equb_id->room_id, entry_type->type, external_ref->tx_ref, paid_at (retired)
-- equb_members:  equb_id->room_id, workouts_done->completed_days,
--                payment_ref/payout_ref/payout_at/paid_at/progress_pct/status (retired)
-- workout_buddies: equb_id->room_id, user_a->user_id, user_b->buddy_id
-- workouts:      source->type, steps->step_count, photo_url->proof_url, workout_date->logged_at
-- workout_verifications: equb_id (retired), verification_type->type, keeps verified_at
-- daily_verification_summary: equb_id (retired; keyed by user_id + date)
-- users:         display_name->full_name, telegram_handle->username; ADD supabase_uid, email
-- trainers:      pending_payout->pending_balance (+ code expects total_earned, status, commission_rate)
-- day_passes:    amount_paid->amount; ADD activated_at, payment_tx_ref
-- gamification:  points_ledger (v1)  ->  point_events (v2)

-- ── Live public functions (6), all referencing v1 columns ───────────────────
--   award_points(...)                          -> rewritten in S2 (writes point_events)
--   grant_badge(...)                           -> rewritten in S2
--   increment_completed_days(p_user_id, p_equb_id) -> rewritten: p_room_id, completed_days
--   increment_trainer_balance(p_trainer_id, p_amount) -> re-created: trainers.pending_balance
--   process_trainer_commissions(p_equb_id)     -> rewritten: p_room_id, v2 columns  [PARITY RISK]
--   settle_equb(p_equb_id)                     -> rewritten: p_room_id, v2 columns  [PARITY RISK]
-- Code also calls increment_points(uid, pts) — ABSENT live, created in S2.
-- claim_trainer_payout / refund_trainer_payout — created by the money migration.

-- ── Other live objects ──────────────────────────────────────────────────────
--   Triggers: none in public.
--   Views:    none in public.
--   RLS:      enabled on all tables; sparse public-SELECT policies (dropped by S2).
--             No unsafe FOR ALL policy on coach tables live (the unsafe policies
--             exist only in 20260323_coach_passes.sql, which was never applied
--             to prod as-written).
--   Enums (retired by S2, replaced with TEXT + CHECK):
--     equb_funding(sponsored, peer)
--     equb_status(pending, active, settling, completed, cancelled)
--     ledger_type(stake_in, sponsor_in, payout, house_fee, refund)
--     member_status(joined, paid, completed, failed, refunded)
--     verification_status(pending, verified, rejected)
--     workout_source(steps, gym_checkin, manual, telegram_photo)

-- ── Read-only queries used to produce this snapshot (rerun to re-verify) ─────
-- select table_name, column_name, data_type, is_nullable, column_default
--   from information_schema.columns where table_schema='public'
--   order by table_name, ordinal_position;
-- select p.proname, pg_get_functiondef(p.oid) from pg_proc p
--   join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';
-- select event_object_table, trigger_name from information_schema.triggers where trigger_schema='public';
-- select tablename, policyname, roles, cmd, qual, with_check from pg_policies where schemaname='public';
-- select table_name, view_definition from information_schema.views where table_schema='public';
-- select t.typname, e.enumlabel from pg_type t join pg_enum e on e.enumtypid=t.oid order by t.typname, e.enumsortorder;

-- ============================================================================
-- EXACT LIVE FUNCTION BODIES  —  STATUS: COMPLETE
-- ----------------------------------------------------------------------------
-- Captured via the Codex Supabase connector with this read-only query:
--
-- select p.proname, p.oid::regprocedure::text as signature,
--        pg_get_functiondef(p.oid) as definition
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.proname in ('settle_equb','process_trainer_commissions',
--                      'award_points','grant_badge','increment_completed_days',
--                      'increment_trainer_balance','increment_points')
--  order by p.proname, signature;
--
-- Parity checklist for S2 review:
--   - settle_equb: qualification threshold (>= vs >, ceil vs floor of
--     workout_target*completion_pct), rounding of payout_each, whether it writes
--     fee/sponsor/payout ledger rows or leaves that to the cron, and the exact
--     terminal status it sets (must become 'settled').
--   - process_trainer_commissions: commission BASIS — S2 assumed per-referred-member
--     stake * commission_rate. Confirm whether live instead derives it from the
--     house fee, and whether it inserts trainer_earnings + bumps pending_balance.
-- ============================================================================

-- award_points(uuid,integer,text,character varying,uuid)
CREATE OR REPLACE FUNCTION public.award_points(p_user_id uuid, p_points integer, p_reason text, p_source_type character varying, p_source_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_new_total INT;
    v_new_level INT;
BEGIN
    -- Insert into points ledger
    INSERT INTO points_ledger (user_id, points, reason, source_type, source_id)
    VALUES (p_user_id, p_points, p_reason, p_source_type, p_source_id);

    -- Update total and calculate level
    UPDATE users
    SET total_points = total_points + p_points
    WHERE id = p_user_id
    RETURNING total_points INTO v_new_total;

    -- Level thresholds: 1=0, 2=200, 3=500, 4=1000, 5=2000, 6=4000, 7=7000, 8=11000, 9=16000, 10=22000
    v_new_level := CASE
        WHEN v_new_total >= 22000 THEN 10
        WHEN v_new_total >= 16000 THEN 9
        WHEN v_new_total >= 11000 THEN 8
        WHEN v_new_total >= 7000  THEN 7
        WHEN v_new_total >= 4000  THEN 6
        WHEN v_new_total >= 2000  THEN 5
        WHEN v_new_total >= 1000  THEN 4
        WHEN v_new_total >= 500   THEN 3
        WHEN v_new_total >= 200   THEN 2
        ELSE 1
    END;

    UPDATE users SET level = v_new_level WHERE id = p_user_id;
END;
$function$;

-- grant_badge(uuid,character varying)
CREATE OR REPLACE FUNCTION public.grant_badge(p_user_id uuid, p_badge_id character varying)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_badge badge_definitions%ROWTYPE;
    v_current_badges TEXT[];
BEGIN
    -- Check if user already has this badge
    SELECT badges INTO v_current_badges FROM users WHERE id = p_user_id;

    IF p_badge_id = ANY(v_current_badges) THEN
        RETURN FALSE; -- Already has it
    END IF;

    -- Get badge details
    SELECT * INTO v_badge FROM badge_definitions WHERE id = p_badge_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Grant badge
    UPDATE users
    SET badges = array_append(badges, p_badge_id)
    WHERE id = p_user_id;

    -- Award points for earning the badge
    IF v_badge.points_reward > 0 THEN
        PERFORM award_points(p_user_id, v_badge.points_reward,
            FORMAT('Badge earned: %s', v_badge.name), 'badge', NULL);
    END IF;

    RETURN TRUE;
END;
$function$;

-- increment_completed_days(uuid,uuid)
CREATE OR REPLACE FUNCTION public.increment_completed_days(p_user_id uuid, p_equb_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_workout_target INT;
  v_new_count INT;
BEGIN
  -- Get the workout target for this equb
  SELECT workout_target INTO v_workout_target
  FROM equb_rooms WHERE id = p_equb_id;

  -- Increment workouts_done
  UPDATE equb_members
  SET workouts_done = workouts_done + 1,
      progress_pct = LEAST(
        ((workouts_done + 1)::NUMERIC / NULLIF(v_workout_target, 0)) * 100,
        100
      )
  WHERE user_id = p_user_id
    AND equb_id = p_equb_id
    AND status IN ('joined', 'paid');

  -- Check if now qualified
  SELECT workouts_done INTO v_new_count
  FROM equb_members
  WHERE user_id = p_user_id AND equb_id = p_equb_id;

  IF v_new_count >= v_workout_target THEN
    UPDATE equb_members
    SET qualified = TRUE
    WHERE user_id = p_user_id AND equb_id = p_equb_id;
  END IF;
END;
$function$;

-- increment_trainer_balance(uuid,numeric)
CREATE OR REPLACE FUNCTION public.increment_trainer_balance(p_trainer_id uuid, p_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE trainers
  SET pending_balance = pending_balance + p_amount,
      total_earned = total_earned + p_amount
  WHERE id = p_trainer_id;
END;
$function$;

-- process_trainer_commissions(uuid)
CREATE OR REPLACE FUNCTION public.process_trainer_commissions(p_equb_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_house_fee_entry RECORD;
    v_member RECORD;
    v_trainer RECORD;
    v_commission INT;
BEGIN
    -- Get the house fee from this Equb settlement
    SELECT * INTO v_house_fee_entry
    FROM equb_ledger
    WHERE equb_id = p_equb_id AND entry_type = 'house_fee'
    LIMIT 1;

    -- No house fee = no commissions (everyone completed or sponsored Equb)
    IF NOT FOUND OR v_house_fee_entry.amount = 0 THEN
        RETURN;
    END IF;

    -- For each member in this Equb who was referred by a trainer
    FOR v_member IN
        SELECT em.user_id, u.referred_by_trainer
        FROM equb_members em
        JOIN users u ON u.id = em.user_id
        WHERE em.equb_id = p_equb_id
          AND u.referred_by_trainer IS NOT NULL
    LOOP
        -- Get trainer details
        SELECT * INTO v_trainer
        FROM trainers
        WHERE id = v_member.referred_by_trainer AND is_active = TRUE;

        IF FOUND THEN
            -- Commission = trainer's % of the house fee, proportional to their referred members
            v_commission := FLOOR(v_house_fee_entry.amount * v_trainer.commission_pct / 100 /
                (SELECT COUNT(*) FROM equb_members WHERE equb_id = p_equb_id));

            IF v_commission > 0 THEN
                INSERT INTO trainer_earnings (trainer_id, user_id, earning_type, amount, description, source_id)
                VALUES (v_trainer.id, v_member.user_id, 'equb_house_fee_share', v_commission,
                        FORMAT('Commission: %s ETB from Equb settlement', v_commission / 100),
                        p_equb_id);

                UPDATE trainers
                SET total_earned = total_earned + v_commission,
                    pending_payout = pending_payout + v_commission,
                    updated_at = NOW()
                WHERE id = v_trainer.id;
            END IF;
        END IF;
    END LOOP;
END;
$function$;

-- settle_equb(uuid)
CREATE OR REPLACE FUNCTION public.settle_equb(p_equb_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_room          equb_rooms%ROWTYPE;
    v_total_stakes  INT;
    v_house_fee     INT;
    v_winner_pool   INT;
    v_winner_count  INT;
    v_loser_count   INT;
    v_payout_each   INT;
    v_member        RECORD;
    v_effective_completion NUMERIC(5,2);
BEGIN
    SELECT * INTO v_room FROM equb_rooms WHERE id = p_equb_id FOR UPDATE;

    IF v_room.status != 'active' THEN
        RAISE EXCEPTION 'Equb % is not active (status: %)', p_equb_id, v_room.status;
    END IF;

    UPDATE equb_rooms SET status = 'settling' WHERE id = p_equb_id;

    -- Use Tsom completion threshold if this is a Tsom Equb
    v_effective_completion := CASE
        WHEN v_room.is_tsom AND v_room.tsom_completion_pct IS NOT NULL
        THEN v_room.tsom_completion_pct
        ELSE v_room.completion_pct
    END;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_stakes
    FROM equb_ledger
    WHERE equb_id = p_equb_id AND entry_type = 'stake_in';

    v_total_stakes := v_total_stakes + v_room.sponsor_prize;

    -- Mark winners and losers using effective completion threshold
    UPDATE equb_members
    SET qualified = TRUE, status = 'completed'
    WHERE equb_id = p_equb_id AND progress_pct >= v_effective_completion;

    UPDATE equb_members
    SET qualified = FALSE, status = 'failed'
    WHERE equb_id = p_equb_id AND progress_pct < v_effective_completion;

    SELECT COUNT(*) INTO v_winner_count
    FROM equb_members WHERE equb_id = p_equb_id AND qualified = TRUE;

    SELECT COUNT(*) INTO v_loser_count
    FROM equb_members WHERE equb_id = p_equb_id AND qualified = FALSE;

    -- ZERO RISK: everyone completes = full refund, no house fee
    IF v_winner_count = 0 THEN
        FOR v_member IN
            SELECT * FROM equb_members WHERE equb_id = p_equb_id
        LOOP
            UPDATE equb_members
            SET payout_amount = v_room.stake_amount, status = 'refunded'
            WHERE id = v_member.id;

            INSERT INTO equb_ledger (equb_id, user_id, entry_type, amount, description)
            VALUES (p_equb_id, v_member.user_id, 'refund', v_room.stake_amount,
                    'No winners — full refund');
        END LOOP;

    ELSIF v_loser_count = 0 THEN
        FOR v_member IN
            SELECT * FROM equb_members WHERE equb_id = p_equb_id AND qualified = TRUE
        LOOP
            v_payout_each := v_room.stake_amount + FLOOR(v_room.sponsor_prize / v_winner_count);

            UPDATE equb_members
            SET payout_amount = v_payout_each, payout_at = NOW()
            WHERE id = v_member.id;

            INSERT INTO equb_ledger (equb_id, user_id, entry_type, amount, description)
            VALUES (p_equb_id, v_member.user_id, 'payout', v_payout_each,
                    'Everyone completed — full refund + sponsor bonus');
        END LOOP;

    ELSE
        IF v_room.funding_type = 'peer' THEN
            v_house_fee := FLOOR((v_loser_count * v_room.stake_amount) * v_room.house_fee_pct / 100);
        ELSE
            v_house_fee := 0;
        END IF;

        v_winner_pool := v_total_stakes - v_house_fee;
        v_payout_each := FLOOR(v_winner_pool / v_winner_count);

        FOR v_member IN
            SELECT * FROM equb_members WHERE equb_id = p_equb_id AND qualified = TRUE
        LOOP
            UPDATE equb_members
            SET payout_amount = v_payout_each, payout_at = NOW()
            WHERE id = v_member.id;

            INSERT INTO equb_ledger (equb_id, user_id, entry_type, amount, description)
            VALUES (p_equb_id, v_member.user_id, 'payout', v_payout_each,
                    FORMAT('Equb payout: %s winners, %s losers, %s ETB each',
                           v_winner_count, v_loser_count, v_payout_each / 100));
        END LOOP;

        IF v_house_fee > 0 THEN
            INSERT INTO equb_ledger (equb_id, user_id, entry_type, amount, description)
            VALUES (p_equb_id, NULL, 'house_fee', v_house_fee,
                    FORMAT('Platform fee: %s%% on loser stakes only', v_room.house_fee_pct));
        END IF;
    END IF;

    UPDATE equb_rooms
    SET status = 'completed', settled_at = NOW(), total_pot = v_total_stakes
    WHERE id = p_equb_id;
END;
$function$;
