-- ============================================================================
-- S2 — Schema reconciliation cutover (v1 -> v2 code shape)
-- Canonical spec: KNOWLEDGE.md ADR-0002. Evidence: supabase/snapshots/20260706_prod_v1_before.sql
--
-- Ordering: this migration MUST run BEFORE 20260705210000_money_correctness_
-- launch_hardening.sql (its timestamp is deliberately earlier). It reconciles
-- the core schema to the v2 vocabulary the money migration and all code expect.
--
-- Strategy (ADR-0002): rebuild-empty / alter-populated.
--   - Guard: assert every rebuild-target table is empty before dropping it.
--   - Rebuild the 14 drifted empty tables from the v2 code shape (no DROP CASCADE).
--   - Alter the populated/auth-coupled tables (equb_rooms, users) in place.
--   - Drop ghost tables (points_ledger, gym_settlements).
--   - Rewrite all legacy functions to canonical vocabulary (room_id / p_room_id /
--     settled / six ledger types). payment_intents, payout_jobs and the five
--     money RPCs remain owned by the money migration (runs after this).
--   - Deny-by-default RLS on every table; EXECUTE locked to service_role.
--   - Drop retired v1 enum types once no column references them.
--
-- Idempotency: safe to re-run BEFORE the money migration has run. Re-running
-- AFTER the money migration will fail on the equb_ledger DROP (payout_jobs FK) —
-- intended: re-apply the whole ordered sequence on a fresh branch instead.
-- ============================================================================

begin;

-- ── 0. Emptiness guards ─────────────────────────────────────────────────────
-- Abort the entire transaction if any rebuild-target table gained rows since the
-- 2026-07-06 verification. Protects the "safe to drop" premise at apply time.
do $$
declare
  t text;
  n bigint;
  targets text[] := array[
    'equb_members','equb_ledger','workout_buddies','workouts',
    'workout_verifications','daily_verification_summary','day_passes',
    'trainers','trainer_earnings','trainer_payouts','coach_sessions',
    'coach_passes','challenge_participants','referrals',
    'points_ledger','gym_settlements'
  ];
begin
  foreach t in array targets loop
    if to_regclass('public.'||t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      if n <> 0 then
        raise exception 'S2 abort: table % is not empty (% rows). Rebuild-empty premise violated.', t, n;
      end if;
    end if;
  end loop;
end $$;

-- Existing public policies can depend on columns we alter below (notably
-- equb_rooms.status enum -> text). Drop inherited policies up front; the final
-- RLS section re-enables deny-by-default grants after all DDL completes.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Preserved users has a live FK into trainers. trainers is empty and rebuilt
-- below, so drop only that inbound FK explicitly instead of using DROP CASCADE.
do $$
declare r record;
begin
  if to_regclass('public.users') is not null and to_regclass('public.trainers') is not null then
    for r in
      select conname
        from pg_constraint
       where conrelid = 'public.users'::regclass
         and confrelid = 'public.trainers'::regclass
         and contype = 'f'
    loop
      execute format('alter table public.users drop constraint %I', r.conname);
    end loop;
  end if;
end $$;

-- ── 1. Drop ghost tables ────────────────────────────────────────────────────
-- points_ledger: superseded by point_events. gym_settlements: dead, zero refs.
drop table if exists public.points_ledger;
drop table if exists public.gym_settlements;

-- ── 2. Drop the 14 drifted tables (dependents first; NO CASCADE) ────────────
drop table if exists public.coach_passes;
drop table if exists public.coach_sessions;
drop table if exists public.trainer_earnings;
drop table if exists public.trainer_payouts;
drop table if exists public.trainers;
drop table if exists public.workout_buddies;
drop table if exists public.workout_verifications;
drop table if exists public.daily_verification_summary;
drop table if exists public.workouts;
drop table if exists public.day_passes;
drop table if exists public.challenge_participants;
drop table if exists public.referrals;
drop table if exists public.equb_members;
drop table if exists public.equb_ledger;

-- ── 3. Alter populated / auth-coupled tables in place ───────────────────────

-- 3a. users (0 rows, but auth-coupled: never dropped). Rename v1 -> v2, add v2 columns.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='users' and column_name='display_name')
     and not exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='users' and column_name='full_name') then
    alter table public.users rename column display_name to full_name;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='users' and column_name='telegram_handle')
     and not exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='users' and column_name='username') then
    alter table public.users rename column telegram_handle to username;
  end if;
end $$;

alter table public.users add column if not exists full_name          text;
alter table public.users add column if not exists username           text;
alter table public.users add column if not exists supabase_uid       uuid unique;
alter table public.users add column if not exists email              text;
alter table public.users add column if not exists phone              text;
alter table public.users add column if not exists telegram_id        bigint unique;
alter table public.users add column if not exists total_points       integer      not null default 0;
alter table public.users add column if not exists level              integer      not null default 1;
alter table public.users add column if not exists badges             text[]       not null default '{}';
alter table public.users add column if not exists referral_code      text;
alter table public.users add column if not exists referred_by_trainer uuid;
alter table public.users add column if not exists created_at         timestamptz  not null default now();

-- 3b. equb_rooms (5 rows preserved). Rename v1 -> v2, status enum -> TEXT+CHECK,
--     add v2 columns, drop funding_type. Sponsor funding is backed only by
--     explicit sponsor ledger rows; the room column is display/config, not cash.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='equb_rooms' and column_name='created_by')
     and not exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='equb_rooms' and column_name='creator_id') then
    alter table public.equb_rooms rename column created_by to creator_id;
  end if;
end $$;

-- creator_id and duration_days must exist. creator_id is intentionally NULLABLE:
-- legacy seed rooms may have no owner, and settle_equb no longer references it
-- (platform ledger rows carry user_id = NULL). All code paths tolerate null
-- creator_id (duels compares `=== userId`, which is false for null).
alter table public.equb_rooms add column if not exists creator_id    uuid;
alter table public.equb_rooms add column if not exists duration_days integer;
alter table public.equb_rooms add column if not exists description   text;
alter table public.equb_rooms add column if not exists house_fee_pct numeric not null default 5;
alter table public.equb_rooms add column if not exists tier          text not null default 'starter';
alter table public.equb_rooms add column if not exists invite_code   text;
alter table public.equb_rooms add column if not exists daily_verification_threshold integer;
alter table public.equb_rooms add column if not exists allowed_verification_methods text[] not null default '{}';
alter table public.equb_rooms add column if not exists is_tsom       boolean not null default false;
alter table public.equb_rooms add column if not exists tsom_workout_target integer;
alter table public.equb_rooms add column if not exists tsom_completion_pct numeric;

-- Backfill duration_days for the 5 preserved rooms: derive from the date span,
-- fall back to 30 if either date is missing. Never leave it null.
update public.equb_rooms
   set duration_days = greatest(
     1,
     round(extract(epoch from (end_date::timestamptz - start_date::timestamptz)) / 86400.0)::integer
   )
 where duration_days is null and start_date is not null and end_date is not null;
update public.equb_rooms
   set duration_days = 30
 where duration_days is null;

-- Canonical completion units are fractions (0.8 = 80%). Live v1 stored percent
-- values (80), and one pre-S2 route did too. Normalize preserved seed rows.
update public.equb_rooms
   set completion_pct = completion_pct / 100
 where completion_pct > 1;
update public.equb_rooms
   set tsom_completion_pct = tsom_completion_pct / 100
 where tsom_completion_pct > 1;
update public.equb_rooms
   set completion_pct = 0.8
 where completion_pct is null;
update public.equb_rooms
   set house_fee_pct = 5
 where house_fee_pct is null;

alter table public.equb_rooms
  alter column completion_pct set default 0.8,
  alter column completion_pct set not null,
  alter column house_fee_pct set default 5,
  alter column house_fee_pct set not null;

alter table public.equb_rooms
  alter column status drop default;
alter table public.equb_rooms
  alter column status type text using status::text;
alter table public.equb_rooms
  alter column status set default 'pending';

do $$
begin
  if not exists (select 1 from pg_constraint where conname='equb_rooms_status_check') then
    alter table public.equb_rooms
      add constraint equb_rooms_status_check
      check (status in ('pending','active','settling','settled','cancelled'));
  end if;
end $$;

alter table public.equb_rooms add column if not exists room_type   text not null default 'public';
alter table public.equb_rooms add column if not exists total_pot   numeric not null default 0;
alter table public.equb_rooms add column if not exists settled_at  timestamptz;

do $$
begin
	  if not exists (select 1 from pg_constraint where conname='equb_rooms_room_type_check') then
	    alter table public.equb_rooms
	      add constraint equb_rooms_room_type_check
	      check (room_type in ('public','private','sponsored'));
	  end if;
	  if not exists (select 1 from pg_constraint where conname='equb_rooms_completion_pct_check') then
	    alter table public.equb_rooms
	      add constraint equb_rooms_completion_pct_check
	      check (completion_pct > 0 and completion_pct <= 1);
	  end if;
	  if not exists (select 1 from pg_constraint where conname='equb_rooms_tsom_completion_pct_check') then
	    alter table public.equb_rooms
	      add constraint equb_rooms_tsom_completion_pct_check
	      check (tsom_completion_pct is null or (tsom_completion_pct > 0 and tsom_completion_pct <= 1));
	  end if;
	  if not exists (select 1 from pg_constraint where conname='equb_rooms_house_fee_pct_check') then
	    alter table public.equb_rooms
	      add constraint equb_rooms_house_fee_pct_check
	      check (house_fee_pct >= 0 and house_fee_pct <= 100);
	  end if;
	  if not exists (select 1 from pg_constraint where conname='equb_rooms_tier_check') then
	    alter table public.equb_rooms
	      add constraint equb_rooms_tier_check
	      check (tier in ('starter','regular','elite'));
	  end if;
	end $$;

alter table public.equb_rooms drop column if exists funding_type;

-- Retire duplicate v1 indexes kept by earlier migrations. These are plain
-- btree indexes, not constraint-owned indexes; keeping one per column is enough.
drop index if exists public.idx_equb_status;
drop index if exists public.idx_users_telegram;

-- 3c. partner_gyms (3 rows preserved). Rename v1 -> v2 code vocabulary.
--     Canonical: location, day_pass_cost, active, lat, lng (shared PartnerGym).
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='partner_gyms' and column_name='area')
     and not exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='partner_gyms' and column_name='location') then
    alter table public.partner_gyms rename column area to location;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='partner_gyms' and column_name='regular_day_pass')
     and not exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='partner_gyms' and column_name='day_pass_cost') then
    alter table public.partner_gyms rename column regular_day_pass to day_pass_cost;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='partner_gyms' and column_name='is_active')
     and not exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='partner_gyms' and column_name='active') then
    alter table public.partner_gyms rename column is_active to active;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='partner_gyms' and column_name='latitude')
     and not exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='partner_gyms' and column_name='lat') then
    alter table public.partner_gyms rename column latitude to lat;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='partner_gyms' and column_name='longitude')
     and not exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='partner_gyms' and column_name='lng') then
    alter table public.partner_gyms rename column longitude to lng;
  end if;
end $$;

-- Columns the code depends on that may be absent live.
alter table public.partner_gyms add column if not exists location      text;
alter table public.partner_gyms add column if not exists day_pass_cost numeric;
alter table public.partner_gyms add column if not exists app_day_pass  numeric;
alter table public.partner_gyms add column if not exists lat           double precision;
alter table public.partner_gyms add column if not exists lng           double precision;
alter table public.partner_gyms add column if not exists active        boolean not null default true;

-- 3d. badge_definitions (18 rows preserved). Canonical: bonus_points (shared).
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='badge_definitions' and column_name='points_reward')
     and not exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='badge_definitions' and column_name='bonus_points') then
    alter table public.badge_definitions rename column points_reward to bonus_points;
  end if;
end $$;
alter table public.badge_definitions add column if not exists bonus_points integer not null default 0;

-- 3e. challenges (3 rows preserved). Canonical names already match live:
--     code uses is_active + reward_desc (shared Challenge), live has both — NO rename.
--     Code filters challenges only by end_date; it never queries `active` or
--     `reward_description` by name. Add the remaining shared-type fields defensively
--     so the `as Challenge[]` cast is honest; no backfill needed on 3 seed rows.
alter table public.challenges add column if not exists reward_description text;
alter table public.challenges add column if not exists reward_desc        text;
alter table public.challenges add column if not exists sponsor_name       text;
alter table public.challenges add column if not exists target_steps       integer not null default 0;
alter table public.challenges add column if not exists is_active          boolean not null default true;

-- ── 4. Recreate the drifted tables in v2 code shape ─────────────────────────
-- Dependency order: independents first, then trainers, then coach_* / trainer_*.

create table public.equb_ledger (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid references public.equb_rooms(id) on delete set null,
  -- Nullable by design: platform/system rows (fee, sponsor) are not owed to any
  -- user and carry user_id = NULL. Stake/payout/day_pass_purchase rows always set it.
  user_id    uuid references public.users(id) on delete cascade,
  type       text not null check (type in ('stake','payout','fee','refund','day_pass_purchase','sponsor')),
  amount     numeric not null check (amount >= 0),
  tx_ref     text,               -- Chapa ref for inbound; NULL for internal (payout/fee/sponsor) rows
  paid_at    timestamptz,        -- retained: money migration probes it; NULL under v2 (execution lives in payout_jobs)
  created_at timestamptz not null default now()
);
-- Named to match the money migration's IF NOT EXISTS creation (composes as a no-op there).
create unique index if not exists idx_equb_ledger_tx_ref_unique
  on public.equb_ledger(tx_ref) where tx_ref is not null;
create index if not exists idx_equb_ledger_room on public.equb_ledger(room_id);
create index if not exists idx_equb_ledger_type on public.equb_ledger(type);

create table public.equb_members (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.equb_rooms(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  completed_days integer not null default 0,
  qualified     boolean,
  payout_amount numeric not null default 0,
  result_seen   boolean not null default false,
  joined_at     timestamptz not null default now()
);
create unique index if not exists idx_equb_members_room_user_unique
  on public.equb_members(room_id, user_id);

create table public.workout_buddies (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.equb_rooms(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  buddy_id   uuid not null references public.users(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','active')),
  created_at timestamptz not null default now()
);
create index if not exists idx_workout_buddies_room on public.workout_buddies(room_id);

create table public.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  room_id    uuid not null references public.equb_rooms(id) on delete cascade,
  type       text not null check (type in ('qr_checkin','step_count','photo_proof','gps')),
  proof_url  text,
  step_count integer,
  lat        double precision,
  lng        double precision,
  logged_at  timestamptz not null default now()
);
create index if not exists idx_workouts_user_room on public.workouts(user_id, room_id);
create index if not exists idx_workouts_logged_at on public.workouts(logged_at);

create table public.workout_verifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  type        text not null check (type in ('steps','qr_scan','photo','buddy','gps')),
  points      integer not null default 0,
  metadata    jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default now()
);
create index if not exists idx_workout_verifications_user_date
  on public.workout_verifications(user_id, verified_at);

create table public.daily_verification_summary (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  date            date not null,
  total_points    integer not null default 0,
  methods_used    text[] not null default '{}',
  is_day_complete boolean not null default false,
  unique (user_id, date)
);

create table public.day_passes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  gym_id         uuid not null references public.partner_gyms(id) on delete cascade,
  qr_token       text not null,
  status         text not null default 'pending' check (status in ('pending','active','redeemed','expired')),
  amount         numeric,
  payment_tx_ref text,
  purchased_at   timestamptz not null default now(),
  expires_at     timestamptz,
  activated_at   timestamptz,
  redeemed_at    timestamptz
);
create unique index if not exists idx_day_passes_payment_tx_ref_unique
  on public.day_passes(payment_tx_ref) where payment_tx_ref is not null;
create index if not exists idx_day_passes_gym on public.day_passes(gym_id);

create table public.trainers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  affiliate_code  text not null unique,
  gym_name        text,
  phone           text,
  commission_rate numeric not null default 0.10 check (commission_rate >= 0 and commission_rate <= 1),
  status          text not null default 'pending' check (status in ('pending','active','suspended')),
  total_earned    numeric not null default 0,
  pending_balance numeric not null default 0 check (pending_balance >= 0),
  created_at      timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname='users_referred_by_trainer_fkey') then
    alter table public.users
      add constraint users_referred_by_trainer_fkey
      foreign key (referred_by_trainer) references public.trainers(id) on delete set null;
  end if;
end $$;

create table public.trainer_earnings (
  id         uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  room_id    uuid references public.equb_rooms(id) on delete set null,
  user_id    uuid references public.users(id) on delete set null,
  amount     numeric not null check (amount >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_trainer_earnings_trainer on public.trainer_earnings(trainer_id);
create unique index if not exists idx_trainer_earnings_room_trainer_user_unique
  on public.trainer_earnings(room_id, trainer_id, user_id)
  where room_id is not null and user_id is not null;

create table public.trainer_payouts (
  id         uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  amount     numeric not null check (amount > 0),
  tx_ref     text not null,
  status     text not null default 'pending' check (status in ('pending','completed','failed')),
  created_at timestamptz not null default now()
);
create unique index if not exists idx_trainer_payouts_tx_ref_unique
  on public.trainer_payouts(tx_ref);
create index if not exists idx_trainer_payouts_trainer on public.trainer_payouts(trainer_id);

create table public.coach_sessions (
  id               uuid primary key default gen_random_uuid(),
  trainer_id       uuid not null references public.trainers(id) on delete cascade,
  title            text not null,
  description      text,
  session_type     text not null check (session_type in ('in_person','virtual')),
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  price            numeric not null check (price >= 50 and price <= 10000),
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists idx_coach_sessions_trainer on public.coach_sessions(trainer_id);

create table public.coach_passes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  trainer_id     uuid not null references public.trainers(id) on delete cascade,
  session_id     uuid not null references public.coach_sessions(id) on delete cascade,
  status         text not null default 'pending'
                   check (status in ('pending','active','confirmed','completed','expired','cancelled')),
  price_paid     numeric not null,
  trainer_payout numeric not null,
  platform_fee   numeric not null,
  scheduled_at   timestamptz,
  confirmed_at   timestamptz,
  completed_at   timestamptz,
  activated_at   timestamptz,
  payment_tx_ref text,
  qr_token       text not null default gen_random_uuid()::text,
  notes          text,
  created_at     timestamptz not null default now()
);
create unique index if not exists idx_coach_passes_payment_tx_ref_unique
  on public.coach_passes(payment_tx_ref) where payment_tx_ref is not null;
create index if not exists idx_coach_passes_user on public.coach_passes(user_id);
create index if not exists idx_coach_passes_trainer on public.coach_passes(trainer_id);

create table public.challenge_participants (
  id             uuid primary key default gen_random_uuid(),
  challenge_id   uuid not null references public.challenges(id) on delete cascade,
  user_id        uuid not null references public.users(id) on delete cascade,
  total_steps    integer not null default 0,
  last_logged_at timestamptz,
  unique (challenge_id, user_id)
);

create table public.referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referred_id uuid not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (referred_id)
);

-- ── 5. Create net-new tables (point_events, notifications) ──────────────────
create table if not exists public.point_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  points      integer not null,
  reason      text,
  source_type text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_point_events_user on public.point_events(user_id);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id);

-- ── 6. Rewrite legacy functions to v2 vocabulary ────────────────────────────
-- (payment_intents / payout_jobs / apply_stake_payment / activate_*_payment /
--  claim_trainer_payout / refund_trainer_payout are owned by the money migration.
--  Those five are net-new — absent from live per the snapshot — so the money
--  migration's CREATE OR REPLACE creates them fresh with no signature drift.)
--
-- CREATE OR REPLACE cannot change a function's return type or argument types, and
-- the live functions drift on both (settle_equb void->jsonb; grant_badge boolean->
-- void and varchar->text; award_points loses a param; increment_completed_days
-- renames p_equb_id->p_room_id). Drop EVERY overload of each name by its exact
-- signature first, so the recreations below apply cleanly (idempotent, no CASCADE:
-- the snapshot confirms no triggers/views depend on these).
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in (
         'settle_equb','process_trainer_commissions','award_points','grant_badge',
         'increment_completed_days','increment_trainer_balance','increment_points'
       )
  loop
    execute 'drop function if exists ' || r.sig;
  end loop;
end $$;

create or replace function public.increment_points(uid uuid, pts integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.users
     set total_points = coalesce(total_points,0) + pts,
         level = case
           when coalesce(total_points,0) + pts >= 22000 then 10
           when coalesce(total_points,0) + pts >= 16000 then 9
           when coalesce(total_points,0) + pts >= 11000 then 8
           when coalesce(total_points,0) + pts >= 7000  then 7
           when coalesce(total_points,0) + pts >= 4000  then 6
           when coalesce(total_points,0) + pts >= 2000  then 5
           when coalesce(total_points,0) + pts >= 1000  then 4
           when coalesce(total_points,0) + pts >= 500   then 3
           when coalesce(total_points,0) + pts >= 200   then 2
           else 1
         end
   where id = uid;
end $$;

create or replace function public.award_points(
  p_user_id uuid, p_points integer, p_reason text, p_source_type text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.point_events (user_id, points, reason, source_type)
  values (p_user_id, p_points, p_reason, p_source_type);
  update public.users
     set total_points = coalesce(total_points,0) + p_points,
         level = case
           when coalesce(total_points,0) + p_points >= 22000 then 10
           when coalesce(total_points,0) + p_points >= 16000 then 9
           when coalesce(total_points,0) + p_points >= 11000 then 8
           when coalesce(total_points,0) + p_points >= 7000  then 7
           when coalesce(total_points,0) + p_points >= 4000  then 6
           when coalesce(total_points,0) + p_points >= 2000  then 5
           when coalesce(total_points,0) + p_points >= 1000  then 4
           when coalesce(total_points,0) + p_points >= 500   then 3
           when coalesce(total_points,0) + p_points >= 200   then 2
           else 1
         end
   where id = p_user_id;
end $$;

create or replace function public.grant_badge(p_user_id uuid, p_badge_id text)
returns void language plpgsql security definer set search_path = public as $$
declare v_bonus integer := 0;
begin
  -- idempotent: only add the badge and its bonus once
  if exists (select 1 from public.users
              where id = p_user_id and p_badge_id = any(badges)) then
    return;
  end if;
  select coalesce(bonus_points,0) into v_bonus
    from public.badge_definitions where id::text = p_badge_id;
  update public.users
     set badges = array_append(coalesce(badges,'{}'), p_badge_id)
   where id = p_user_id;

  if v_bonus > 0 then
    perform public.award_points(p_user_id, v_bonus, 'Badge earned', 'badge');
  end if;
end $$;

create or replace function public.increment_completed_days(p_user_id uuid, p_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.equb_members
     set completed_days = coalesce(completed_days,0) + 1
   where user_id = p_user_id and room_id = p_room_id;
end $$;

create or replace function public.increment_trainer_balance(p_trainer_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.trainers
     set pending_balance = coalesce(pending_balance,0) + p_amount,
         total_earned    = coalesce(total_earned,0)    + p_amount
   where id = p_trainer_id;
end $$;

-- process_trainer_commissions: idempotently credit affiliate trainers from the
-- actual house-fee ledger row. Total commissions are bounded by platform revenue.
create or replace function public.process_trainer_commissions(p_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_fee numeric := 0;
  v_member_count integer := 0;
begin
  if exists (select 1 from public.trainer_earnings where room_id = p_room_id) then
    return;
  end if;

  select coalesce(sum(amount),0) into v_fee
    from public.equb_ledger
   where room_id = p_room_id and type = 'fee';

  if v_fee <= 0 then
    return;
  end if;

  select count(*) into v_member_count
    from public.equb_members
   where room_id = p_room_id;

  if v_member_count <= 0 then
    return;
  end if;

  with commissions as (
    select
      t.id as trainer_id,
      u.id as user_id,
      floor((v_fee * coalesce(t.commission_rate, 0.10) / v_member_count) * 100) / 100 as amount
      from public.equb_members m
      join public.users u    on u.id = m.user_id
      join public.trainers t on t.id = u.referred_by_trainer
     where m.room_id = p_room_id
       and u.referred_by_trainer is not null
       and t.status = 'active'
  ),
  inserted as (
    insert into public.trainer_earnings (trainer_id, room_id, user_id, amount)
    select trainer_id, p_room_id, user_id, amount
      from commissions
     where amount > 0
    on conflict do nothing
    returning trainer_id, amount
  )
  update public.trainers t
     set pending_balance = pending_balance + agg.total,
         total_earned    = total_earned    + agg.total
    from (
      select trainer_id, sum(amount) as total
        from inserted
       group by trainer_id
    ) agg
   where t.id = agg.trainer_id;
end $$;

-- settle_equb: atomic single settlement of an expired room.
-- Writes payout/refund/fee rows from paid stake ledger rows plus backed sponsor
-- ledger rows only. The room.sponsor_prize column is display/config, not money.
create or replace function public.settle_equb(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_room            public.equb_rooms%rowtype;
  v_stake_sum       numeric := 0;
  v_sponsor_sum     numeric := 0;
  v_total_pot       numeric := 0;
  v_house_fee       numeric := 0;
  v_distributable   numeric := 0;
  v_target          numeric;
  v_member_count    integer := 0;
  v_qualified_count integer := 0;
  v_loser_count     integer := 0;
  v_payout_each     numeric := 0;
begin
  -- Atomic claim: settle an 'active' room exactly once.
  update public.equb_rooms
     set status = 'settling'
   where id = p_room_id and status = 'active'
  returning * into v_room;

  if not found then
    return jsonb_build_object('status','skipped','reason','not_active_or_already_settling');
  end if;

  select coalesce(sum(amount),0) into v_stake_sum
    from public.equb_ledger where room_id = p_room_id and type = 'stake';

  select coalesce(sum(amount),0) into v_sponsor_sum
    from public.equb_ledger where room_id = p_room_id and type = 'sponsor';

  v_total_pot := v_stake_sum + v_sponsor_sum;

  v_target := ceil(
    (case when v_room.is_tsom
      then coalesce(v_room.tsom_workout_target, v_room.workout_target, 0)
      else coalesce(v_room.workout_target, 0)
    end)
    *
    (case when v_room.is_tsom
      then coalesce(v_room.tsom_completion_pct, v_room.completion_pct, 1)
      else coalesce(v_room.completion_pct, 1)
    end)
  );

  update public.equb_members
     set qualified = (coalesce(completed_days,0) >= v_target)
   where room_id = p_room_id;

  select count(*) into v_member_count
    from public.equb_members where room_id = p_room_id;

  select count(*) into v_qualified_count
    from public.equb_members where room_id = p_room_id and qualified = true;

  v_loser_count := v_member_count - v_qualified_count;

  -- No winners: refund each member's paid stake. No house fee, no payout rows.
  if v_qualified_count = 0 then
    with member_stakes as (
      select
        m.id,
        m.user_id,
        coalesce(sum(l.amount),0) as stake_paid
        from public.equb_members m
        left join public.equb_ledger l
          on l.room_id = m.room_id
         and l.user_id = m.user_id
         and l.type = 'stake'
       where m.room_id = p_room_id
       group by m.id, m.user_id
    )
    update public.equb_members m
       set qualified = false,
           payout_amount = ms.stake_paid
      from member_stakes ms
     where m.id = ms.id;

    insert into public.equb_ledger (room_id, user_id, type, amount)
    select p_room_id, user_id, 'refund', stake_paid
      from (
        select
          m.user_id,
          coalesce(sum(l.amount),0) as stake_paid
          from public.equb_members m
          left join public.equb_ledger l
            on l.room_id = m.room_id
           and l.user_id = m.user_id
           and l.type = 'stake'
         where m.room_id = p_room_id
         group by m.user_id
      ) refunds
     where stake_paid > 0;

    update public.equb_rooms
       set status = 'settled', total_pot = v_total_pot, settled_at = now()
     where id = p_room_id;

    return jsonb_build_object(
      'status','settled', 'room_id', p_room_id, 'total_pot', v_total_pot,
      'house_fee', 0, 'qualified', 0, 'refunds', v_member_count);
  end if;

  if v_room.room_type = 'sponsored' then
    v_house_fee := 0;
  else
    v_house_fee := floor((v_loser_count * coalesce(v_room.stake_amount,0) * coalesce(v_room.house_fee_pct,5) / 100) * 100) / 100;
  end if;
  v_distributable := v_total_pot - v_house_fee;

  if v_qualified_count > 0 then
    v_payout_each := floor((v_distributable / v_qualified_count) * 100) / 100;
  end if;

  update public.equb_members
     set payout_amount = case when qualified then v_payout_each else 0 end
   where room_id = p_room_id;

  -- Platform fee rows are house rows, not owed to any user: user_id = NULL.
  if v_house_fee > 0 then
    insert into public.equb_ledger (room_id, user_id, type, amount)
    values (p_room_id, null, 'fee', v_house_fee);
  end if;

  insert into public.equb_ledger (room_id, user_id, type, amount)
  select room_id, user_id, 'payout', v_payout_each
    from public.equb_members
   where room_id = p_room_id and qualified = true and v_payout_each > 0;

  update public.equb_rooms
     set status = 'settled', total_pot = v_total_pot, settled_at = now()
   where id = p_room_id;

  return jsonb_build_object(
    'status','settled', 'room_id', p_room_id, 'total_pot', v_total_pot,
    'house_fee', v_house_fee, 'qualified', v_qualified_count, 'payout_each', v_payout_each);
end $$;

-- ── 7. Deny-by-default RLS + service_role grants ────────────────────────────
-- Drop every existing public policy (flat iteration over pg_policies — no nested
-- dynamic SQL). Surviving preserved tables (equb_rooms, users, partner_gyms,
-- challenges, badge_definitions) lose their inherited public-SELECT policies here;
-- dropped tables lose theirs with the table. The API uses the service_role client,
-- which bypasses RLS, so no replacement policies are needed.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('revoke all on public.%I from anon, authenticated', r.tablename);
    execute format('grant all on public.%I to service_role', r.tablename);
  end loop;
end $$;

-- Lock EXECUTE on the rewritten functions to service_role.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.increment_points(uuid,integer)',
    'public.award_points(uuid,integer,text,text)',
    'public.grant_badge(uuid,text)',
    'public.increment_completed_days(uuid,uuid)',
    'public.increment_trainer_balance(uuid,numeric)',
    'public.process_trainer_commissions(uuid)',
    'public.settle_equb(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;

-- ── 8. Drop retired v1 enum types (now unreferenced) ────────────────────────
drop type if exists public.equb_status;
drop type if exists public.equb_funding;
drop type if exists public.ledger_type;
drop type if exists public.member_status;
drop type if exists public.verification_status;
drop type if exists public.workout_source;

commit;
