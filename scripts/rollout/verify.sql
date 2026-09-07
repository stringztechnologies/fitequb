\set ON_ERROR_STOP on

-- Read-only post-migration evidence. Every boolean in the access report must be true.
select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 10;

select
  (select count(*) from public.equb_rooms) as equb_rooms,
  (select count(*) from public.partner_gyms) as partner_gyms,
  (select count(*) from public.challenges) as challenges,
  (select count(*) from public.payment_intents) as payment_intents,
  (select count(*) from public.payout_jobs) as payout_jobs,
  (select count(*) from public.pilot_configs) as pilot_configs,
  (select count(*) from public.pilot_enrollments) as pilot_enrollments,
  (select count(*) from public.equb_ledger) as ledger_entries;

select table_name, column_name, data_type, numeric_scale
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'equb_rooms' and column_name in ('stake_amount', 'start_date', 'end_date'))
    or (table_name = 'equb_members' and column_name in ('payout_amount', 'completed_days'))
    or (table_name = 'equb_ledger' and column_name in ('amount', 'payment_intent_ref'))
    or (table_name = 'payment_intents' and column_name in ('expected_amount', 'provider_amount'))
  )
order by table_name, column_name;

with protected_tables(table_name) as (
  values
    ('payment_intents'), ('payout_jobs'), ('pilot_admins'), ('pilot_configs'), ('pilot_staff'),
    ('pilot_enrollments'), ('pilot_attendance'), ('pilot_attendance_audit'),
    ('pilot_disputes'), ('pilot_prospects'), ('pilot_costs')
)
select
  p.table_name,
  c.relrowsecurity as rls_enabled,
  not has_table_privilege('anon', c.oid, 'select,insert,update,delete') as anon_blocked,
  not has_table_privilege('authenticated', c.oid, 'select,insert,update,delete') as authenticated_blocked,
  has_table_privilege('service_role', c.oid, 'select') as service_role_access
from protected_tables p
join pg_class c on c.relname = p.table_name
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
order by p.table_name;

with required_functions(signature) as (
  values
    ('pilot_prepare_enrollment(uuid,uuid,text,text,text,text,text)'),
    ('pilot_credit_payment(text,numeric,text,text)'),
    ('pilot_withdraw(uuid,uuid)'),
    ('pilot_cancel(uuid,uuid)'),
    ('pilot_record_attendance(uuid,uuid,uuid,date,boolean,text)'),
    ('pilot_open_dispute(uuid,uuid,date,text)'),
    ('settle_equb(uuid)'),
    ('pilot_finish_refunds()')
)
select
  signature,
  to_regprocedure('public.' || signature) is not null as exists,
  not has_function_privilege('anon', 'public.' || signature, 'execute') as anon_blocked,
  not has_function_privilege('authenticated', 'public.' || signature, 'execute') as authenticated_blocked,
  has_function_privilege('service_role', 'public.' || signature, 'execute') as service_role_access
from required_functions
order by signature;

select
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.equb_ledger'::regclass
      and tgname = 'immutable_money'
      and not tgisinternal
  ) as ledger_append_only,
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.payment_intents'::regclass
      and tgname = 'guard_receipt'
      and not tgisinternal
  ) as receipt_guarded;

select status, count(*) as jobs, coalesce(sum(amount), 0) as amount
from public.payout_jobs
where status <> 'confirmed'
group by status
order by status;

select status, count(*) as intents, coalesce(sum(expected_amount), 0) as amount
from public.payment_intents
where status in ('created', 'paid', 'mismatch', 'refund_requested')
group by status
order by status;
