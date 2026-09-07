# Paid pilot technical rollout

This checklist deploys the paid-pilot schema and applications while keeping all collection disabled. It does not include a real Chapa payment, refund, payout, or cohort launch.

## Immutable finish state

- `PAYMENTS_ENABLED=false`
- `PILOT_CHECKOUT_ENABLED=false`
- every `pilot_configs.checkout_ready=false`
- no rows in `payment_intents`, `payout_jobs`, `pilot_enrollments`, or `equb_ledger`
- n8n schedules restored only after `/health/ready` succeeds

## Rehearsal

1. Create an isolated branch or PostgreSQL 16 restore from current production.
2. Run `scripts/rollout/preflight.sql` and save its output. Every S2 guard count must be zero.
3. Mark local migration version `20260323` applied in the clone without executing `20260323_coach_passes.sql`.
4. Dry-run in one transaction, then apply these files in order:
   - `20260705120000_s2_schema_reconciliation.sql`
   - `20260705210000_money_correctness_launch_hardening.sql`
   - `20260906120000_paid_pilot.sql`
   - `20260907193000_fix_pilot_trigger_search_paths.sql`
5. Run `scripts/rollout/verify.sql`. Preserve five rooms, three gyms, and three challenges. Confirm protected tables have RLS, only `service_role` can call money/pilot RPCs, and both ledger guards exist.
6. On a second disposable database, insert one row into an S2 rebuild target and prove S2 aborts without changing the schema.
7. Run lint, typecheck, production build, unit tests, database tests, browser journeys, and production-container health smoke against the migrated clone.

## Production cutover

1. Record the deployed SHA. Pause Coolify automatic deployment, n8n schedules, and both payment switches.
2. Create encrypted schema/data backups outside the repository. Restore them into an empty disposable PostgreSQL database and record the restore evidence.
3. Immediately rerun `scripts/rollout/preflight.sql`. Abort if any S2 guard count is nonzero or the preserved counts differ from the rehearsal.
4. Mark `20260323` applied without running its SQL, then apply the three rehearsed migrations in order.
5. Run `scripts/rollout/verify.sql` and save the output.
6. Merge and deploy the reviewed SHA. Verify API liveness/readiness, web health and compiled URLs, native web authentication, Telegram pilot deep links, `/pilot-admin`, cron authorization, and Sentry browser/API ingestion.
7. Restore n8n schedules. Recheck all financial queues and keep every collection switch false.

## Evidence record

Durable results are recorded in `docs/pilot/ROLLOUT_EVIDENCE.md`. Record the following before closing the rollout:

| Evidence | Value |
| --- | --- |
| Rehearsal database/branch | |
| Rehearsal preflight and verification | |
| Negative S2 guard result | |
| Production backup identifier | |
| Restore verification target | |
| Prior deployed SHA | |
| New deployed SHA | |
| Applied migration versions | |
| API liveness/readiness | |
| Web health and compiled API URL | |
| Native/Telegram route checks | |
| Sentry synthetic event IDs | |
| n8n schedules restored | |
| Financial queue counts | |
| Payment switches and cohort readiness | |

If the application fails before any financial record exists, redeploy the prior SHA. Prefer a forward database fix after migration. Never restore a snapshot after a payment, refund, payout, or ledger record exists.
