# Paid pilot rollout evidence

This record tracks the production rollout that keeps payment collection disabled. It contains no credentials or decryption material.

## Isolated rehearsal — 2026-09-07

- Source: fresh production schema, data, and migration-history dumps from Supabase project `ufkkisleoimltqbnexpf`.
- Target: disposable PostgreSQL 16 databases on the local rollout cluster.
- Baseline counts: 5 Equb rooms, 3 partner gyms, 3 challenges, and zero rows in all 16 S2 rebuild targets.
- Historical migration `20260323` was marked applied without executing `20260323_coach_passes.sql`.
- Applied in order: `20260705120000`, `20260705210000`, `20260906120000`, then the security-advisor follow-up `20260907193000`.
- Verification: preserved counts and room values matched the source; v2 columns, required functions, RLS, service-role RPC grants, and append-only ledger/receipt triggers passed `scripts/rollout/verify.sql`.
- Financial result: `payment_intents`, `payout_jobs`, `pilot_enrollments`, and `equb_ledger` remained empty.

## Negative S2 guard — 2026-09-07

A second disposable restore received one row in `equb_members` before S2 ran. The migration aborted with `S2 abort: table equb_members is not empty (1 rows)`. The inserted row remained, the v1 `equb_id` column remained, and the v2 `room_id` column was absent, proving the migration aborted atomically without a partial schema change.

## Backup restore proof — 2026-09-07

- Encrypted backup: `~/Library/Application Support/FitEqub/rollout-backups/2026-09-07/production-before-paid-pilot.tar.gz.enc`
- SHA-256: `ffd657ee4074da7c02bca2887e5d717336175abe179f6eca6c48b71142a70a96`
- Key storage: macOS Keychain service `fitequb-rollout-20260907`; the key is not stored in the repository.
- Restore target: a third empty disposable PostgreSQL 16 database.
- Restore verification: 5 rooms, 3 gyms, 3 challenges, latest migration `20260403091652`, and no `payment_intents` table before cutover.

## Production cutover

The production database cutover completed on 2026-09-07 while payment collection remained disabled. Immediately before mutation, all 16 S2 guard targets were empty and the preserved counts were 5 rooms, 3 gyms, and 3 challenges. Migration `20260323` was marked applied without executing its historical SQL. The four rehearsed migrations then applied in order. Post-migration verification confirmed the preserved counts, empty financial tables and queues, service-role-only pilot RPC access, RLS, append-only guards, and fixed trigger-function search paths. The final Supabase security-advisor pass reported no warnings or errors.

| Evidence | Value |
| --- | --- |
| Prior deployed SHA | `7335eda24079c87d7742779254389c86ad6ab113` |
| New deployed SHA | Pending |
| Applied migration versions | `20260323` (history marker only), `20260705120000`, `20260705210000`, `20260906120000`, `20260907193000` |
| API liveness/readiness | Pending |
| Web health and compiled API URL | Pending |
| Native/Telegram route checks | Pending |
| Sentry synthetic event IDs | API `11112dd3cd914d88b5b6ee1d22e9ab5d`; browser `8ffbff2a63a8491cbe24753b0f5b7e77` (ingestion HTTP 200) |
| n8n schedules restored | Pending |
| Financial queue counts | 0 payment intents, 0 payout jobs, 0 pilot enrollments, 0 ledger entries after migration |
| Payment switches and cohort readiness | Coolify API environment has both switches false; 0 cohorts have `checkout_ready=true` |
