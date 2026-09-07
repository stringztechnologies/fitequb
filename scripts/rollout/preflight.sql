\set ON_ERROR_STOP on

-- Read-only cutover evidence. Run before any production mutation.
select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 10;

with guard_counts(table_name, row_count) as (
  select 'equb_members', count(*) from public.equb_members union all
  select 'equb_ledger', count(*) from public.equb_ledger union all
  select 'workout_buddies', count(*) from public.workout_buddies union all
  select 'workouts', count(*) from public.workouts union all
  select 'workout_verifications', count(*) from public.workout_verifications union all
  select 'daily_verification_summary', count(*) from public.daily_verification_summary union all
  select 'day_passes', count(*) from public.day_passes union all
  select 'trainers', count(*) from public.trainers union all
  select 'trainer_earnings', count(*) from public.trainer_earnings union all
  select 'trainer_payouts', count(*) from public.trainer_payouts union all
  select 'coach_sessions', count(*) from public.coach_sessions union all
  select 'coach_passes', count(*) from public.coach_passes union all
  select 'challenge_participants', count(*) from public.challenge_participants union all
  select 'referrals', count(*) from public.referrals union all
  select 'points_ledger', count(*) from public.points_ledger union all
  select 'gym_settlements', count(*) from public.gym_settlements
)
select table_name, row_count, row_count = 0 as s2_guard_clear
from guard_counts
order by table_name;

select
  (select count(*) from public.equb_rooms) as equb_rooms,
  (select count(*) from public.partner_gyms) as partner_gyms,
  (select count(*) from public.challenges) as challenges,
  to_regclass('public.payment_intents') as payment_intents,
  to_regclass('public.pilot_configs') as pilot_configs,
  to_regprocedure('public.settle_equb(uuid)') as settle_equb;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'select,insert,update,delete') as anon_money_access,
  has_table_privilege('authenticated', c.oid, 'select,insert,update,delete') as authenticated_money_access
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('equb_ledger', 'trainer_payouts')
order by c.relname;
