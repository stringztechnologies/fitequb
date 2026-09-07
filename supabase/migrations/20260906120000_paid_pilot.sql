-- Forward-only after S2 and money correctness. Never recreates existing tables.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.payment_intents') IS NULL THEN
    RAISE EXCEPTION 'Apply/rehearse S2 and money correctness before the paid pilot migration';
  END IF;
END $$;
-- Production v1 preserved dates/amounts through S2. Convert dates as EAT midnight,
-- and preserve cent precision rather than silently rounding into integer columns.
DO $$ DECLARE col text; BEGIN
 FOREACH col IN ARRAY ARRAY['start_date','end_date'] LOOP
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equb_rooms' AND column_name=col AND data_type='date') THEN
 EXECUTE format('ALTER TABLE equb_rooms ALTER COLUMN %I TYPE timestamptz USING %I::timestamp AT TIME ZONE %L',col,col,'Africa/Addis_Ababa');
 END IF;
 END LOOP;
END $$;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM equb_rooms WHERE stake_amount<>round(stake_amount::numeric,2) OR total_pot<>round(total_pot::numeric,2)
   OR abs(stake_amount)>9999999999.99 OR abs(total_pot)>9999999999.99) THEN
   RAISE EXCEPTION 'Existing room amounts cannot be converted to cents without data loss; reconcile before migration';
 END IF;
END $$;
ALTER TABLE equb_rooms ALTER COLUMN stake_amount TYPE numeric(12,2), ALTER COLUMN total_pot TYPE numeric(12,2);
CREATE TABLE pilot_admins (user_id uuid PRIMARY KEY REFERENCES users(id));
CREATE TABLE pilot_configs (
  room_id uuid PRIMARY KEY REFERENCES equb_rooms(id), gym_id uuid NOT NULL REFERENCES partner_gyms(id),
  coach_id uuid NOT NULL REFERENCES users(id), program_fee numeric(12,2) NOT NULL DEFAULT 300 CHECK(program_fee > 0),
  terms_version text NOT NULL DEFAULT 'pilot-v1', enrollment_deadline timestamptz NOT NULL,
  verification_mode text NOT NULL DEFAULT 'staff_approved' CHECK(verification_mode='staff_approved'),
  published boolean NOT NULL DEFAULT false, checkout_ready boolean NOT NULL DEFAULT false,
  settlement_hold boolean NOT NULL DEFAULT false, frozen_at timestamptz,
  next_room_id uuid REFERENCES equb_rooms(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pilot_staff (room_id uuid REFERENCES pilot_configs(room_id), user_id uuid REFERENCES users(id), PRIMARY KEY(room_id,user_id));
ALTER TABLE payment_intents DROP CONSTRAINT payment_intents_kind_check;
ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_kind_check CHECK(kind IN ('stake','daypass','duel','coach','pilot_enrollment'));
ALTER TABLE payment_intents DROP CONSTRAINT payment_intents_status_check;
ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_status_check CHECK(status IN ('created','paid','credited','mismatch','failed','refund_requested','refunded'));
ALTER TABLE payment_intents ADD COLUMN provider_currency text;
ALTER TABLE payment_intents ADD COLUMN checkout_url text;
ALTER TABLE payment_intents ADD COLUMN checkout_status text NOT NULL DEFAULT 'initializing' CHECK(checkout_status IN ('initializing','ready','failed','unknown'));
CREATE TABLE pilot_enrollments (
  tx_ref text PRIMARY KEY REFERENCES payment_intents(tx_ref), room_id uuid NOT NULL REFERENCES pilot_configs(room_id),
  user_id uuid NOT NULL REFERENCES users(id), program_fee numeric(12,2) NOT NULL, stake_amount numeric(12,2) NOT NULL,
  terms_version text NOT NULL, offer_snapshot jsonb NOT NULL, source text NOT NULL DEFAULT 'direct', bank_code text NOT NULL,
  account_number text NOT NULL, account_name text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','enrolled','withdrawn','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(), enrolled_at timestamptz
);
CREATE UNIQUE INDEX pilot_open_enrollment ON pilot_enrollments(room_id,user_id) WHERE state IN ('pending','enrolled');
ALTER TABLE equb_ledger DROP CONSTRAINT equb_ledger_type_check;
ALTER TABLE equb_ledger ADD CONSTRAINT equb_ledger_type_check CHECK(type IN ('stake','payout','fee','refund','day_pass_purchase','sponsor','program_fee','program_refund','payment_refund'));
ALTER TABLE equb_ledger ADD COLUMN payment_intent_ref text REFERENCES payment_intents(tx_ref);
CREATE UNIQUE INDEX pilot_receipt_components ON equb_ledger(payment_intent_ref,type) WHERE payment_intent_ref IS NOT NULL;
ALTER TABLE payout_jobs ADD COLUMN account_name text;
ALTER TABLE payout_jobs ADD COLUMN account_number text;
ALTER TABLE payout_jobs ADD COLUMN bank_code text;
ALTER TABLE payout_jobs ADD COLUMN provider_reference text UNIQUE;
CREATE TABLE pilot_attendance (
  room_id uuid NOT NULL REFERENCES pilot_configs(room_id), user_id uuid NOT NULL REFERENCES users(id),
  attendance_date date NOT NULL, approved boolean NOT NULL DEFAULT true, actor_id uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(room_id,user_id,attendance_date)
);
CREATE TABLE pilot_attendance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL, user_id uuid NOT NULL,
  attendance_date date NOT NULL, approved boolean NOT NULL, actor_id uuid NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pilot_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES pilot_configs(room_id), user_id uuid NOT NULL REFERENCES users(id),
  attendance_date date NOT NULL, reason text NOT NULL, resolution text, resolved_by uuid REFERENCES users(id), resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(room_id,user_id,attendance_date)
);
CREATE TABLE pilot_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES pilot_configs(room_id),
  label text NOT NULL, source text NOT NULL, stage text NOT NULL CHECK(stage IN ('introduced','offered','declined','renewal_offered')),
  user_id uuid REFERENCES users(id), note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pilot_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES pilot_configs(room_id),
  description text NOT NULL, amount numeric(12,2) NOT NULL DEFAULT 0 CHECK(amount>=0), minutes integer NOT NULL DEFAULT 0 CHECK(minutes>=0),
  estimated boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION pilot_is_admin(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM pilot_admins WHERE user_id=p_user)
$$;
CREATE OR REPLACE FUNCTION pilot_reject_ledger_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Financial ledger and attendance audit are append-only'; END $$;
CREATE TRIGGER immutable_money BEFORE UPDATE OR DELETE ON equb_ledger FOR EACH ROW EXECUTE FUNCTION pilot_reject_ledger_change();
CREATE TRIGGER immutable_attendance_audit BEFORE UPDATE OR DELETE ON pilot_attendance_audit FOR EACH ROW EXECUTE FUNCTION pilot_reject_ledger_change();
CREATE OR REPLACE FUNCTION pilot_freeze_config() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE f timestamptz;
BEGIN
 IF TG_TABLE_NAME='pilot_configs' THEN
   f:=OLD.frozen_at;
   IF f IS NOT NULL AND (NEW.gym_id,NEW.coach_id,NEW.program_fee,NEW.terms_version,NEW.enrollment_deadline,NEW.verification_mode,NEW.frozen_at)
      IS DISTINCT FROM (OLD.gym_id,OLD.coach_id,OLD.program_fee,OLD.terms_version,OLD.enrollment_deadline,OLD.verification_mode,OLD.frozen_at) THEN RAISE EXCEPTION 'Paid cohort configuration is frozen'; END IF;
 ELSE
   SELECT frozen_at INTO f FROM pilot_configs WHERE room_id=OLD.id;
   IF f IS NOT NULL AND (NEW.stake_amount,NEW.start_date,NEW.end_date,NEW.duration_days,NEW.workout_target,NEW.completion_pct,NEW.min_members,NEW.max_members,NEW.house_fee_pct,NEW.is_tsom)
      IS DISTINCT FROM (OLD.stake_amount,OLD.start_date,OLD.end_date,OLD.duration_days,OLD.workout_target,OLD.completion_pct,OLD.min_members,OLD.max_members,OLD.house_fee_pct,OLD.is_tsom) THEN RAISE EXCEPTION 'Paid cohort rules are frozen'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER freeze_pilot_config BEFORE UPDATE ON pilot_configs FOR EACH ROW EXECUTE FUNCTION pilot_freeze_config();
CREATE TRIGGER freeze_pilot_room BEFORE UPDATE ON equb_rooms FOR EACH ROW EXECUTE FUNCTION pilot_freeze_config();

CREATE OR REPLACE FUNCTION pilot_configure(p_actor uuid,p_room uuid,p_config jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r uuid:=coalesce(p_room,gen_random_uuid()); s timestamptz; d integer;
BEGIN
 IF NOT pilot_is_admin(p_actor) THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_room IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pilot_configs WHERE room_id=p_room) THEN RAISE EXCEPTION 'Only existing pilot drafts may be edited'; END IF;
 s:=(p_config->>'start_date')::timestamptz; d:=coalesce((p_config->>'duration_days')::integer,30);
 IF (s AT TIME ZONE 'Africa/Addis_Ababa')::time <> time '00:00' THEN RAISE EXCEPTION 'Cohorts start at midnight Addis Ababa time'; END IF;
 IF s<=now() OR d<1 OR d>90 THEN RAISE EXCEPTION 'Future start and duration 1-90 required'; END IF;
 IF coalesce((p_config->>'min_members')::integer,20)>coalesce((p_config->>'max_members')::integer,20) THEN RAISE EXCEPTION 'Invalid capacity'; END IF;
 IF (p_config->>'enrollment_deadline')::timestamptz>s THEN RAISE EXCEPTION 'Enrollment must close by start'; END IF;
 INSERT INTO equb_rooms(id,name,creator_id,stake_amount,start_date,end_date,duration_days,workout_target,completion_pct,min_members,max_members,room_type,house_fee_pct)
 VALUES(r,p_config->>'name',p_actor,coalesce((p_config->>'stake_amount')::numeric,500),s,s+make_interval(days=>d),d,
 coalesce((p_config->>'workout_target')::integer,12),coalesce((p_config->>'completion_pct')::numeric,0.8),coalesce((p_config->>'min_members')::integer,20),coalesce((p_config->>'max_members')::integer,20),'private',5)
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,stake_amount=excluded.stake_amount,start_date=excluded.start_date,end_date=excluded.end_date,duration_days=excluded.duration_days,workout_target=excluded.workout_target,completion_pct=excluded.completion_pct,min_members=excluded.min_members,max_members=excluded.max_members;
 INSERT INTO pilot_configs(room_id,gym_id,coach_id,program_fee,terms_version,enrollment_deadline)
 VALUES(r,(p_config->>'gym_id')::uuid,(p_config->>'coach_id')::uuid,coalesce((p_config->>'program_fee')::numeric,300),coalesce(p_config->>'terms_version','pilot-v1'),coalesce((p_config->>'enrollment_deadline')::timestamptz,s))
 ON CONFLICT(room_id) DO UPDATE SET gym_id=excluded.gym_id,coach_id=excluded.coach_id,program_fee=excluded.program_fee,terms_version=excluded.terms_version,enrollment_deadline=excluded.enrollment_deadline;
 RETURN r;
END $$;

CREATE FUNCTION pilot_offer_snapshot(p_room uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT jsonb_build_object('gym',c.gym_id,'coach',c.coach_id,'fee',c.program_fee,'terms',c.terms_version,'deadline',c.enrollment_deadline,'start',r.start_date,'end',r.end_date,'stake',r.stake_amount,'target',r.workout_target,'threshold',r.completion_pct,'minimum',r.min_members,'maximum',r.max_members,'house_fee',r.house_fee_pct)
 FROM pilot_configs c JOIN equb_rooms r ON r.id=c.room_id WHERE c.room_id=p_room
$$;
CREATE OR REPLACE FUNCTION pilot_prepare_enrollment(p_room uuid,p_user uuid,p_terms text,p_source text,p_bank text,p_account text,p_name text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r equb_rooms%rowtype; c pilot_configs%rowtype; i payment_intents%rowtype; ref text;
BEGIN
 SELECT * INTO r FROM equb_rooms WHERE id=p_room FOR UPDATE;
 SELECT * INTO c FROM pilot_configs WHERE room_id=p_room;
 IF c.room_id IS NULL OR NOT c.published OR NOT c.checkout_ready OR r.status<>'pending' OR now()>=least(c.enrollment_deadline,r.start_date) THEN RAISE EXCEPTION 'Enrollment unavailable'; END IF;
 IF p_terms<>c.terms_version THEN RAISE EXCEPTION 'Accept current terms'; END IF;
 IF length(trim(p_bank))=0 OR length(trim(p_account))<5 OR length(trim(p_name))<2 THEN RAISE EXCEPTION 'Valid payout details required'; END IF;
 SELECT pi.* INTO i FROM payment_intents pi JOIN pilot_enrollments e USING(tx_ref) WHERE e.room_id=p_room AND e.user_id=p_user AND e.state IN ('pending','enrolled');
 IF FOUND THEN RETURN to_jsonb(i)||jsonb_build_object('created',false); END IF;
 -- A pending verification remains unresolved even after withdrawal. Never replace it.
 SELECT pi.* INTO i FROM payment_intents pi JOIN pilot_enrollments e USING(tx_ref)
 WHERE e.room_id=p_room AND e.user_id=p_user AND pi.status IN ('created','paid') ORDER BY pi.created_at DESC LIMIT 1;
 IF FOUND THEN RETURN to_jsonb(i)||jsonb_build_object('created',false,'checkout_url',null); END IF;
 IF (SELECT count(*) FROM pilot_enrollments WHERE room_id=p_room AND state='enrolled')>=r.max_members THEN RAISE EXCEPTION 'Room full'; END IF;
 ref:='pi_pilot_enrollment_'||gen_random_uuid();
 INSERT INTO payment_intents(tx_ref,kind,target_id,user_id,expected_amount) VALUES(ref,'pilot_enrollment',p_room,p_user,c.program_fee+r.stake_amount) RETURNING * INTO i;
 INSERT INTO pilot_enrollments(tx_ref,room_id,user_id,program_fee,stake_amount,terms_version,offer_snapshot,source,bank_code,account_number,account_name)
 VALUES(ref,p_room,p_user,c.program_fee,r.stake_amount,c.terms_version,pilot_offer_snapshot(p_room),left(coalesce(p_source,'direct'),100),p_bank,p_account,p_name);
 RETURN to_jsonb(i)||jsonb_build_object('created',true);
END $$;

CREATE OR REPLACE FUNCTION pilot_credit_payment(p_tx_ref text,p_amount numeric,p_currency text,p_status text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i payment_intents%rowtype; e pilot_enrollments%rowtype; r equb_rooms%rowtype; c pilot_configs%rowtype; why text;
BEGIN
 -- Every cohort mutation locks room before receipt, avoiding refund/enrollment deadlocks.
 SELECT * INTO i FROM payment_intents WHERE tx_ref=p_tx_ref;
 IF NOT FOUND OR i.kind<>'pilot_enrollment' THEN RAISE EXCEPTION 'Unknown pilot receipt'; END IF;
 SELECT * INTO r FROM equb_rooms WHERE id=i.target_id FOR UPDATE;
 SELECT * INTO i FROM payment_intents WHERE tx_ref=p_tx_ref FOR UPDATE;
 IF i.status IN ('credited','refund_requested','refunded','mismatch') THEN RETURN jsonb_build_object('status',i.status); END IF;
 SELECT * INTO e FROM pilot_enrollments WHERE tx_ref=p_tx_ref;
 SELECT * INTO c FROM pilot_configs WHERE room_id=r.id;
 IF p_status IN ('failed','cancelled','canceled') THEN
   -- A failure notification cannot overwrite a verified receipt.
   IF i.provider_amount IS NULL THEN UPDATE payment_intents SET status='failed' WHERE tx_ref=p_tx_ref; UPDATE pilot_enrollments SET state='rejected' WHERE tx_ref=p_tx_ref; END IF;
   RETURN jsonb_build_object('status','failed');
 END IF;
 IF p_status IS DISTINCT FROM 'success' THEN RETURN jsonb_build_object('status','pending'); END IF;
 IF p_amount IS NULL OR p_amount<=0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
 IF p_currency IS DISTINCT FROM 'ETB' THEN why:='wrong_currency';
 ELSIF p_amount<>i.expected_amount THEN why:='wrong_amount';
 ELSIF e.state<>'pending' THEN why:='duplicate_or_withdrawn';
 ELSIF r.status<>'pending' OR now()>=least(c.enrollment_deadline,r.start_date) THEN why:='late_payment';
 ELSIF e.offer_snapshot IS DISTINCT FROM pilot_offer_snapshot(r.id) THEN why:='offer_changed';
 ELSIF EXISTS(SELECT 1 FROM equb_members WHERE room_id=r.id AND user_id=e.user_id) THEN why:='already_member';
 ELSIF (SELECT count(*) FROM pilot_enrollments WHERE room_id=r.id AND state='enrolled')>=r.max_members THEN why:='room_full'; END IF;
 UPDATE payment_intents SET provider_amount=p_amount,provider_currency=p_currency,provider_status=p_status WHERE tx_ref=p_tx_ref;
 IF why IS NOT NULL THEN
   UPDATE payment_intents SET status='mismatch',mismatch_reason=why WHERE tx_ref=p_tx_ref;
   UPDATE pilot_enrollments SET state='rejected' WHERE tx_ref=p_tx_ref;
   RETURN jsonb_build_object('status','mismatch','reason',why);
 END IF;
 INSERT INTO equb_members(room_id,user_id) VALUES(r.id,e.user_id);
 INSERT INTO equb_ledger(room_id,user_id,type,amount,tx_ref,payment_intent_ref) VALUES(r.id,e.user_id,'stake',e.stake_amount,p_tx_ref,p_tx_ref);
 INSERT INTO equb_ledger(room_id,user_id,type,amount,payment_intent_ref) VALUES(r.id,e.user_id,'program_fee',e.program_fee,p_tx_ref);
 UPDATE pilot_enrollments SET state='enrolled',enrolled_at=now() WHERE tx_ref=p_tx_ref;
 UPDATE pilot_configs SET frozen_at=coalesce(frozen_at,now()) WHERE room_id=r.id;
 UPDATE payment_intents SET status='credited',credited_at=now() WHERE tx_ref=p_tx_ref;
 RETURN jsonb_build_object('status','credited');
END $$;

CREATE OR REPLACE FUNCTION pilot_enqueue_jobs(p_room uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
 INSERT INTO payout_jobs(ledger_id,user_id,amount,reference,account_name,account_number,bank_code)
 SELECT l.id,l.user_id,l.amount,'payout-'||l.id,e.account_name,e.account_number,e.bank_code
 FROM equb_ledger l JOIN pilot_enrollments e ON e.tx_ref=l.payment_intent_ref
 WHERE l.room_id=p_room AND l.type IN ('payout','refund','program_refund','payment_refund') AND l.amount>0
 ON CONFLICT(ledger_id) DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
CREATE OR REPLACE FUNCTION pilot_refund_enrollment(p_ref text,p_fee numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e pilot_enrollments%rowtype;
BEGIN
 SELECT * INTO e FROM pilot_enrollments WHERE tx_ref=p_ref;
 IF e.state<>'enrolled' THEN RETURN; END IF;
 INSERT INTO equb_ledger(room_id,user_id,type,amount,payment_intent_ref) VALUES(e.room_id,e.user_id,'refund',e.stake_amount,p_ref) ON CONFLICT DO NOTHING;
 IF p_fee>0 THEN INSERT INTO equb_ledger(room_id,user_id,type,amount,payment_intent_ref) VALUES(e.room_id,e.user_id,'program_refund',least(e.program_fee,p_fee),p_ref) ON CONFLICT DO NOTHING; END IF;
 UPDATE pilot_enrollments SET state='withdrawn' WHERE tx_ref=p_ref;
 UPDATE payment_intents SET status='refund_requested' WHERE tx_ref=p_ref;
 DELETE FROM equb_members WHERE room_id=e.room_id AND user_id=e.user_id;
 PERFORM pilot_enqueue_jobs(e.room_id);
END $$;
CREATE OR REPLACE FUNCTION pilot_withdraw(p_room uuid,p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r equb_rooms%rowtype; e pilot_enrollments%rowtype;
BEGIN
 SELECT * INTO r FROM equb_rooms WHERE id=p_room FOR UPDATE;
 IF r.status<>'pending' OR now()>=r.start_date THEN RAISE EXCEPTION 'Withdrawal refunds close at scheduled start'; END IF;
 SELECT * INTO e FROM pilot_enrollments WHERE room_id=p_room AND user_id=p_user AND state='enrolled';
 IF FOUND THEN PERFORM pilot_refund_enrollment(e.tx_ref,e.program_fee); END IF;
 -- A withdrawal while verification is pending must also block a delayed enrollment.
 UPDATE pilot_enrollments SET state='withdrawn' WHERE room_id=p_room AND user_id=p_user AND state='pending';
END $$;
CREATE OR REPLACE FUNCTION pilot_cancel(p_actor uuid,p_room uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r equb_rooms%rowtype; e pilot_enrollments%rowtype; fraction numeric;
BEGIN
 IF NOT pilot_is_admin(p_actor) THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pilot_configs WHERE room_id=p_room) THEN RAISE EXCEPTION 'Pilot cohort required'; END IF;
 SELECT * INTO r FROM equb_rooms WHERE id=p_room FOR UPDATE;
 IF r.status='cancelled' THEN RETURN; END IF;
 IF r.status NOT IN ('pending','active') THEN RAISE EXCEPTION 'Cannot cancel settled room'; END IF;
 fraction:=greatest(0,least(1,extract(epoch FROM (r.end_date-now()))/extract(epoch FROM (r.end_date-r.start_date))));
 FOR e IN SELECT * FROM pilot_enrollments WHERE room_id=p_room AND state='enrolled' LOOP
   PERFORM pilot_refund_enrollment(e.tx_ref,round(e.program_fee*fraction,2));
 END LOOP;
 UPDATE equb_rooms SET status='cancelled' WHERE id=p_room;
 UPDATE pilot_configs SET checkout_ready=false WHERE room_id=p_room;
END $$;
CREATE OR REPLACE FUNCTION pilot_lifecycle() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; e record; n integer;
BEGIN
 FOR r IN SELECT er.* FROM equb_rooms er JOIN pilot_configs c ON c.room_id=er.id WHERE er.status='pending' AND now()>=c.enrollment_deadline FOR UPDATE OF er LOOP
   SELECT count(*) INTO n FROM pilot_enrollments WHERE room_id=r.id AND state='enrolled';
   IF n<r.min_members THEN
     FOR e IN SELECT * FROM pilot_enrollments WHERE room_id=r.id AND state='enrolled' LOOP PERFORM pilot_refund_enrollment(e.tx_ref,e.program_fee); END LOOP;
     UPDATE equb_rooms SET status='cancelled' WHERE id=r.id;
   ELSIF now()>=r.start_date THEN UPDATE equb_rooms SET status='active' WHERE id=r.id;
   END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION pilot_refund_mismatch(p_actor uuid,p_ref text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i payment_intents%rowtype;
BEGIN
 IF NOT pilot_is_admin(p_actor) THEN RAISE EXCEPTION 'Admin required'; END IF;
 SELECT * INTO i FROM payment_intents WHERE tx_ref=p_ref;
 PERFORM 1 FROM equb_rooms WHERE id=i.target_id FOR UPDATE;
 SELECT * INTO i FROM payment_intents WHERE tx_ref=p_ref FOR UPDATE;
 IF i.status IN ('refund_requested','refunded') THEN RETURN; END IF;
 IF i.kind<>'pilot_enrollment' OR i.status<>'mismatch' OR i.provider_currency<>'ETB' OR i.provider_amount<=0 THEN RAISE EXCEPTION 'Verified ETB mismatch required; other currencies require provider resolution'; END IF;
 INSERT INTO equb_ledger(room_id,user_id,type,amount,payment_intent_ref) VALUES(i.target_id,i.user_id,'payment_refund',i.provider_amount,p_ref) ON CONFLICT DO NOTHING;
 UPDATE payment_intents SET status='refund_requested' WHERE tx_ref=p_ref;
 PERFORM pilot_enqueue_jobs(i.target_id);
END $$;

CREATE OR REPLACE FUNCTION pilot_record_attendance(p_actor uuid,p_room uuid,p_user uuid,p_date date,p_approved boolean,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r equb_rooms%rowtype; admin boolean:=pilot_is_admin(p_actor);
BEGIN
 SELECT * INTO r FROM equb_rooms WHERE id=p_room FOR UPDATE;
 IF NOT admin AND NOT EXISTS(SELECT 1 FROM pilot_staff WHERE room_id=p_room AND user_id=p_actor) THEN RAISE EXCEPTION 'Assigned staff required'; END IF;
 IF p_actor=p_user THEN RAISE EXCEPTION 'Cannot approve own attendance'; END IF;
 IF r.status<>'active' THEN RAISE EXCEPTION 'Attendance corrections require an unsettled active cohort'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pilot_enrollments WHERE room_id=p_room AND user_id=p_user AND state='enrolled') THEN RAISE EXCEPTION 'Enrolled member required'; END IF;
 IF p_date<(r.start_date AT TIME ZONE 'Africa/Addis_Ababa')::date OR p_date>=(r.end_date AT TIME ZONE 'Africa/Addis_Ababa')::date OR p_date>(now() AT TIME ZONE 'Africa/Addis_Ababa')::date THEN RAISE EXCEPTION 'Date outside cohort'; END IF;
 IF NOT admin AND (p_date<>(now() AT TIME ZONE 'Africa/Addis_Ababa')::date OR NOT p_approved OR now()<r.start_date OR now()>=r.end_date) THEN RAISE EXCEPTION 'Staff may only confirm today during program'; END IF;
 IF length(trim(p_reason))<3 THEN RAISE EXCEPTION 'Reason required'; END IF;
 IF NOT admin AND EXISTS(SELECT 1 FROM pilot_attendance WHERE room_id=p_room AND user_id=p_user AND attendance_date=p_date) THEN RETURN; END IF;
 INSERT INTO pilot_attendance(room_id,user_id,attendance_date,approved,actor_id,reason) VALUES(p_room,p_user,p_date,p_approved,p_actor,p_reason)
 ON CONFLICT(room_id,user_id,attendance_date) DO UPDATE SET approved=excluded.approved,actor_id=excluded.actor_id,reason=excluded.reason,updated_at=now();
 INSERT INTO pilot_attendance_audit(room_id,user_id,attendance_date,approved,actor_id,reason) VALUES(p_room,p_user,p_date,p_approved,p_actor,p_reason);
 UPDATE equb_members SET completed_days=(SELECT count(*) FROM pilot_attendance WHERE room_id=p_room AND user_id=p_user AND approved) WHERE room_id=p_room AND user_id=p_user;
END $$;
CREATE OR REPLACE FUNCTION pilot_open_dispute(p_user uuid,p_room uuid,p_date date,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r equb_rooms%rowtype;
BEGIN
 SELECT * INTO r FROM equb_rooms WHERE id=p_room FOR UPDATE;
 IF r.status<>'active' OR now()>=r.end_date+interval '24 hours' OR now()<r.start_date THEN RAISE EXCEPTION 'Dispute window closed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pilot_enrollments WHERE room_id=p_room AND user_id=p_user AND state='enrolled') THEN RAISE EXCEPTION 'Enrolled member required'; END IF;
 IF p_date<(r.start_date AT TIME ZONE 'Africa/Addis_Ababa')::date OR p_date>(now() AT TIME ZONE 'Africa/Addis_Ababa')::date OR p_date>=(r.end_date AT TIME ZONE 'Africa/Addis_Ababa')::date OR length(trim(p_reason))<3 THEN RAISE EXCEPTION 'Invalid dispute'; END IF;
 INSERT INTO pilot_disputes(room_id,user_id,attendance_date,reason) VALUES(p_room,p_user,p_date,p_reason) ON CONFLICT DO NOTHING;
END $$;
-- Block legacy credits at the SQL seam as well as in routes/cron.
CREATE OR REPLACE FUNCTION increment_completed_days(p_user_id uuid,p_room_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM pilot_configs WHERE room_id=p_room_id) THEN RAISE EXCEPTION 'Pilot credit requires staff attendance'; END IF;
 UPDATE equb_members SET completed_days=coalesce(completed_days,0)+1 WHERE room_id=p_room_id AND user_id=p_user_id;
END $$;
-- Preserve the legacy function behind a wrapper, blocking pilot bypasses.
ALTER FUNCTION apply_stake_payment(text,numeric) RENAME TO apply_legacy_stake_payment;
CREATE FUNCTION apply_stake_payment(p_tx_ref text,p_paid_amount numeric) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM payment_intents i JOIN pilot_configs c ON c.room_id=i.target_id WHERE i.tx_ref=p_tx_ref) THEN RAISE EXCEPTION 'Use pilot enrollment'; END IF;
 RETURN apply_legacy_stake_payment(p_tx_ref,p_paid_amount);
END $$;
ALTER FUNCTION settle_equb(uuid) RENAME TO settle_legacy_equb;
CREATE FUNCTION settle_equb(p_room_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r equb_rooms%rowtype; c pilot_configs%rowtype; e record; winners integer; pot numeric; fee numeric; cents bigint; position integer:=0; each_cents bigint; extra bigint;
BEGIN
 SELECT * INTO r FROM equb_rooms WHERE id=p_room_id FOR UPDATE;
 IF r.status<>'active' OR r.end_date>now() THEN RETURN jsonb_build_object('status','skipped'); END IF;
 SELECT * INTO c FROM pilot_configs WHERE room_id=p_room_id;
 IF NOT FOUND THEN RETURN settle_legacy_equb(p_room_id); END IF;
 IF now()<r.end_date+interval '24 hours' OR c.settlement_hold OR EXISTS(SELECT 1 FROM pilot_disputes WHERE room_id=p_room_id AND resolved_at IS NULL) THEN RETURN jsonb_build_object('status','held'); END IF;
 UPDATE equb_members m SET completed_days=(SELECT count(*) FROM pilot_attendance a WHERE a.room_id=m.room_id AND a.user_id=m.user_id AND a.approved) WHERE m.room_id=p_room_id;
 UPDATE equb_members SET qualified=completed_days>=ceil(r.workout_target*r.completion_pct) WHERE room_id=p_room_id;
 SELECT count(*) INTO winners FROM equb_members WHERE room_id=p_room_id AND qualified;
 SELECT coalesce(sum(pe.stake_amount),0) INTO pot FROM pilot_enrollments pe WHERE pe.room_id=p_room_id AND pe.state='enrolled';
 SELECT coalesce(sum(pe.stake_amount),0)*r.house_fee_pct/100 INTO fee FROM pilot_enrollments pe JOIN equb_members m ON m.room_id=pe.room_id AND m.user_id=pe.user_id WHERE pe.room_id=p_room_id AND pe.state='enrolled' AND NOT m.qualified;
 fee:=CASE WHEN winners=0 THEN 0 ELSE trunc(fee,2) END;
 IF fee>0 THEN INSERT INTO equb_ledger(room_id,type,amount) VALUES(p_room_id,'fee',fee); END IF;
 IF winners>0 THEN cents:=round((pot-fee)*100); each_cents:=cents/winners; extra:=cents%winners; END IF;
 FOR e IN SELECT pe.*,m.qualified FROM pilot_enrollments pe JOIN equb_members m ON m.room_id=pe.room_id AND m.user_id=pe.user_id WHERE pe.room_id=p_room_id AND pe.state='enrolled' ORDER BY pe.user_id LOOP
   IF winners=0 THEN
     INSERT INTO equb_ledger(room_id,user_id,type,amount,payment_intent_ref) VALUES(p_room_id,e.user_id,'refund',e.stake_amount,e.tx_ref);
     UPDATE equb_members SET payout_amount=e.stake_amount WHERE room_id=p_room_id AND user_id=e.user_id;
   ELSIF e.qualified THEN
     position:=position+1;
     INSERT INTO equb_ledger(room_id,user_id,type,amount,payment_intent_ref) VALUES(p_room_id,e.user_id,'payout',(each_cents+CASE WHEN position<=extra THEN 1 ELSE 0 END)/100.0,e.tx_ref);
     UPDATE equb_members SET payout_amount=(each_cents+CASE WHEN position<=extra THEN 1 ELSE 0 END)/100.0 WHERE room_id=p_room_id AND user_id=e.user_id;
   END IF;
 END LOOP;
 UPDATE equb_rooms SET status='settled',total_pot=pot,settled_at=now() WHERE id=p_room_id;
 PERFORM pilot_enqueue_jobs(p_room_id);
 RETURN jsonb_build_object('status','settled','house_fee',fee,'total_pot',pot,'qualified',winners);
END $$;

-- Protect frozen receipt allocations and monotonic verified statuses, including legacy webhooks.
CREATE FUNCTION pilot_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.kind='pilot_enrollment' AND (NEW.kind,NEW.target_id,NEW.user_id,NEW.expected_amount,NEW.currency) IS DISTINCT FROM (OLD.kind,OLD.target_id,OLD.user_id,OLD.expected_amount,OLD.currency) THEN RAISE EXCEPTION 'Receipt allocation is immutable'; END IF;
 IF OLD.status IN ('credited','refund_requested','refunded','mismatch') AND NEW.status IN ('created','paid','failed') THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_receipt BEFORE UPDATE ON payment_intents FOR EACH ROW EXECUTE FUNCTION pilot_receipt_guard();
CREATE FUNCTION pilot_enrollment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.tx_ref,NEW.room_id,NEW.user_id,NEW.program_fee,NEW.stake_amount,NEW.terms_version,NEW.offer_snapshot,NEW.bank_code,NEW.account_number,NEW.account_name) IS DISTINCT FROM (OLD.tx_ref,OLD.room_id,OLD.user_id,OLD.program_fee,OLD.stake_amount,OLD.terms_version,OLD.offer_snapshot,OLD.bank_code,OLD.account_number,OLD.account_name) THEN RAISE EXCEPTION 'Enrollment allocation is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_enrollment BEFORE UPDATE ON pilot_enrollments FOR EACH ROW EXECUTE FUNCTION pilot_enrollment_guard();
CREATE FUNCTION pilot_finish_refunds() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE payment_intents i SET status='refunded'
 WHERE i.status='refund_requested'
 AND EXISTS(SELECT 1 FROM equb_ledger l JOIN payout_jobs j ON j.ledger_id=l.id WHERE l.payment_intent_ref=i.tx_ref)
 AND NOT EXISTS(SELECT 1 FROM equb_ledger l JOIN payout_jobs j ON j.ledger_id=l.id WHERE l.payment_intent_ref=i.tx_ref AND j.status<>'confirmed');
END $$;
CREATE FUNCTION pilot_counter_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM pilot_configs WHERE room_id=NEW.room_id) THEN
 NEW.completed_days:=(SELECT count(*) FROM pilot_attendance WHERE room_id=NEW.room_id AND user_id=NEW.user_id AND approved);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pilot_counter_source BEFORE INSERT OR UPDATE ON equb_members FOR EACH ROW EXECUTE FUNCTION pilot_counter_guard();
DO $$ DECLARE t text; f record; BEGIN
 FOREACH t IN ARRAY ARRAY['pilot_admins','pilot_configs','pilot_staff','pilot_enrollments','pilot_attendance','pilot_attendance_audit','pilot_disputes','pilot_prospects','pilot_costs'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON %I TO service_role',t);
 END LOOP;
 FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='public'::regnamespace AND (proname LIKE 'pilot_%' OR proname IN ('settle_equb','settle_legacy_equb','apply_stake_payment','apply_legacy_stake_payment','increment_completed_days')) LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
