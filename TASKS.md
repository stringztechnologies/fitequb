# FitEqub — Implementation Tasks

## Wave 1: Foundation + Auth ✅
> Branch: `feat/wave-1-foundation`

- [x] Initialize pnpm monorepo with workspace config
- [x] Scaffold `apps/web` — React + Vite + TypeScript + Tailwind + @telegram-apps/sdk-react
- [x] Scaffold `apps/api` — Hono + TypeScript
- [x] Scaffold `apps/bot` — Telegraf + TypeScript
- [x] Scaffold `packages/shared` — shared types, constants
- [x] Configure Biome (lint + format)
- [x] Configure tsconfig.base.json + per-app tsconfigs
- [x] Create .env.example with all required vars
- [x] Set up Supabase client (server + browser)
- [x] Implement Telegram initData validation middleware (Hono)
- [x] Implement auth flow: TMA opens → initData sent to API → validate → upsert user → return JWT
- [x] Bot: /start command + Mini App launch button
- [x] Sentry setup (api + web)
- [x] Verify: `pnpm dev` runs all three apps

## Wave 2: Equb Core ✅
> Branch: `feat/wave-2-equb`

- [x] API: POST /equb-rooms — create room (validated input)
- [x] API: GET /equb-rooms — list rooms (pending, active)
- [x] API: GET /equb-rooms/:id — room detail with members + progress
- [x] API: POST /equb-rooms/:id/join — join room (validates capacity, status)
- [x] API: POST /workouts — log workout (QR, steps, photo)
- [x] API: POST /equb-rooms/:id/settle — trigger settlement (admin/cron)
- [x] Chapa: initialize payment for stake
- [x] Chapa: webhook handler for payment confirmation
- [x] Chapa: transfer API for payouts
- [x] TMA: Equb rooms list page
- [x] TMA: Room detail page (members, progress, countdown)
- [x] TMA: Join room flow (payment → confirmation)
- [x] TMA: Log workout page (QR scanner, step input, photo upload)
- [x] Bot: notifications — room activated, member joined, workout reminder, settlement results
- [x] RLS policies for equb_rooms, equb_members, equb_ledger, workouts

## Wave 3: Gym Day Passes ✅
> Branch: `feat/wave-3-day-passes`

- [x] API: GET /gyms — list partner gyms
- [x] API: POST /day-passes — purchase pass (Chapa payment)
- [x] API: GET /day-passes/:id — pass detail with QR
- [x] API: POST /day-passes/:id/redeem — mark as redeemed
- [x] Chapa: payment flow for day pass purchase
- [x] QR generation: crypto random token, 15-min expiry
- [x] TMA: Gym list page (name, location, price)
- [x] TMA: Day pass purchase flow
- [x] TMA: QR display with countdown timer
- [x] RLS policies for partner_gyms, day_passes

## Wave 4: Step Challenge + Polish ✅
> Branch: `feat/wave-4-challenge`

- [x] API: GET /challenges — list active challenges
- [x] API: POST /challenges/:id/join — join challenge
- [x] API: POST /challenges/:id/log-steps — daily step entry
- [x] API: GET /challenges/:id/leaderboard — ranked participants
- [x] TMA: Challenge list page
- [x] TMA: Leaderboard page
- [x] TMA: Log steps page
- [x] TMA: Home page — dashboard with active Equbs, passes, challenge rank
- [x] TMA: Navigation (bottom tabs)
- [x] Bot: deep links to specific screens
- [x] RLS policies for challenges, challenge_participants
- [x] Error boundaries + loading states across all pages
- [x] Haptic feedback on key actions

## Wave 5: Deploy + QA ✅
> Branch: `feat/wave-5-deploy`

- [x] Dockerfiles for api + bot
- [x] Coolify deployment config
- [x] Environment variables set in Coolify
- [x] Vercel config for web (backup)
- [x] Health check endpoints
- [x] Settlement cron job (n8n)
- [x] Workout reminder cron (daily 8am EAT via n8n)
- [x] QA: full flow test — onboard → join Equb → log workouts → settle
- [x] QA: day pass purchase → QR → redeem
- [x] QA: challenge join → log steps → leaderboard
- [x] QA: payment failure handling
- [x] QA: edge cases — room full, expired pass, double join
- [ ] Performance: TMA loads < 2s on 4G — not formally measured

## Post-Wave: Additional Work

### Gamification System
- [x] Points system — earn points for workouts, challenges, referrals
- [x] Badges — achievement badges for milestones
- [x] Levels — user leveling based on accumulated points
- [x] Referral system — invite friends, earn bonus points

### Trainer / Affiliate System
- [x] Trainer profiles and commission tracking
- [x] Affiliate commission payouts

### UI Redesign (Stitch Design Exports)
- [x] Pixel-perfect dark theme matching Stitch design exports
- [x] Redesigned all TMA pages to match new design system

### Testing
- [x] Playwright E2E test suite (48 tests)

### Demo Mode & Error Handling
- [x] Demo data fallback for all pages (works without live backend)
- [x] Network error handling for demo mode

### UX Audit Fixes
- [x] Critical UX fixes across all pages from UX audit

## S2: Schema Reconciliation Cutover (agreed 2026-07-06 — see ADR-0001/0002 in KNOWLEDGE.md)
> Status: spec approved via grilling session; migration NOT yet authored. Prod `ufkkisleoimltqbnexpf` verified v1 + virgin (only seed data: 5 rooms, 3 gyms, 3 challenges, 18 badge defs).
> Gates: draft migration + runbook → Fable adversarial review → test on Supabase branch/clone → only then prod apply → deploy code → live-fire stake.

### S2 migration (one file, ordered; authored by Opus, reviewed by Fable)
- [ ] 1. `count(*) = 0` guards on every rebuild-target table (abort if any row appeared since verification)
- [ ] 2. Drop ghosts: `points_ledger` (after function rewrite), `gym_settlements`; drop 14 rebuild tables (no CASCADE)
- [ ] 3. Create 14 tables in code shape + `payment_intents`, `payout_jobs`, `point_events`, `notifications`
- [ ] 4. Alter populated tables: `equb_rooms` (status → TEXT+CHECK w/ `settled`, drop `funding_type`, normalize completion pct to fraction, preserve full insert column set), `users` (display_name→full_name, telegram_handle→username, + supabase_uid/email); align partner_gyms/challenges/badge_definitions if drifted
- [ ] 5. Rewrite all 6 live functions + 5 money RPCs to canonical vocabulary (`room_id`/`p_room_id`/`settled`/6 ledger types)
- [ ] 6. RLS: enable everywhere, drop public-SELECT policies, revoke anon/authenticated table privileges + function EXECUTE (service_role only unless intentionally public)
- [ ] 7. Drop 6 orphaned v1 enum types

### S2 companion code commit (same deploy)
- [ ] verify.ts + buddies.ts: `equb_room_id` → `room_id`
- [ ] equb-rooms.ts my-results: `"completed"` → `"settled"`
- [ ] gamification: single `points_ledger` reference → `point_events`
- [ ] workouts.ts: call rewritten increment function with `p_room_id`
- [ ] shared types: `LedgerEntryType` gains `"sponsor"`
- [ ] public room creation: no client-created `sponsored` rooms or sponsor prizes; duels are free-only for launch and use `completion_pct=0.8`
- [ ] cron: enqueue both `payout` and `refund`; settlement side effects only when RPC returns `status='settled'`
- [ ] Follow-up: mount `/api/notifications` route

### Pre-prod checklist
- [ ] Commit live schema snapshot ("before" artifact) alongside S2
- [ ] Rehearse full migration on Supabase branch/clone; verify tables/RPCs/policies
- [ ] Fable adversarial review of migration + runbook
- [ ] Prod apply → verify → deploy API → one live 10 ETB stake (`created → paid → credited`)

## S2 OPS Runbook (cutover) — draft 2026-07-06
> Migration files: `supabase/migrations/20260705120000_s2_schema_reconciliation.sql` (runs first),
> then `20260705210000_money_correctness_launch_hardening.sql`. Evidence: `supabase/snapshots/20260706_prod_v1_before.sql`.
> Gate: this runbook + both migrations must pass Fable adversarial review AND a Supabase branch/clone rehearsal before any prod apply.

### Phase 0 — Freeze
- [ ] Pause n8n cron triggers (settle, payouts, reminders, daily-reset).
- [ ] Disable Chapa checkout entry points (or announce a maintenance window). No new payments mid-cutover.

### Phase 1 — Rehearse on a Supabase branch (never prod first)
- [ ] Create a branch/clone of `ufkkisleoimltqbnexpf` (inherits current v1 state).
- [ ] Baseline the old unsafe coach migration before applying pending migrations: `supabase migration repair --status applied 20260323 --db-url <branch-db-url>`. Decision: do not replay `20260323_coach_passes.sql`; S2 recreates coach tables and deny-by-default policies.
- [ ] Apply S2 then the money migration in filename order.
- [ ] Confirm `supabase migration list --db-url <branch-db-url>` shows `20260323`, `20260705120000`, and `20260705210000` applied.
- [ ] Verify (see Phase 3 queries) on the branch. Fix, re-run, repeat until clean.
- [ ] Re-confirm emptiness guard behaviour: seed one row into a rebuild target on the branch → S2 must ABORT.
- [ ] Paid-duel guard: `POST /api/duels/create` with `stake_amount > 0` returns 400; `stake_amount = 0` creates a free duel, auto-joins the creator, and accept activates it.

### Phase 2 — Pre-apply guards (run read-only against prod, immediately before apply)
- [ ] `select count(*) from equb_members` … repeat for all 16 rebuild targets → every count MUST be 0.
      (S2's own guard will abort otherwise, but check first to avoid a failed apply.)
- [ ] Confirm the money migration is NOT recorded as applied in prod's migration history.
- [ ] Confirm `20260323` is not recorded; if absent, it will be baselined in Phase 3 before applying S2.
- [ ] Snapshot/backup prod (Supabase PITR checkpoint or manual dump).

### Phase 3 — Apply + verify (prod)
- [ ] Baseline `20260323` on prod migration history: `supabase migration repair --status applied 20260323 --linked` (or `--db-url <prod-db-url>`). This is a migration-history repair only; do not replay the old file.
- [ ] Apply `20260705120000` then `20260705210000`.
- [ ] Confirm `supabase migration list --linked` (or `--db-url <prod-db-url>`) shows `20260323`, `20260705120000`, and `20260705210000` applied.
- [ ] Tables exist: `select to_regclass('public.payment_intents'), to_regclass('public.payout_jobs'), to_regclass('public.point_events'), to_regclass('public.notifications');` → all non-null.
- [ ] v2 columns: `select column_name from information_schema.columns where table_name='equb_ledger';` → room_id/type/tx_ref present, equb_id/entry_type/external_ref ABSENT.
- [ ] Room defaults: `equb_rooms.completion_pct` default is `0.8` and NOT NULL; `house_fee_pct` default is `5` and NOT NULL.
- [ ] Functions: `select proname, pg_get_function_identity_arguments(oid) from pg_proc where pronamespace='public'::regnamespace and proname in ('settle_equb','process_trainer_commissions','increment_completed_days','award_points','grant_badge','increment_points','apply_stake_payment','activate_day_pass_payment','activate_coach_pass_payment','claim_trainer_payout','refund_trainer_payout');` → settle_equb/etc. show `p_room_id`; all 11 present.
- [ ] Function privileges: every public function has `has_function_privilege('anon', oid, 'EXECUTE') = false` and `has_function_privilege('authenticated', oid, 'EXECUTE') = false`; service_role has EXECUTE where needed.
- [ ] Indexes: the 5 named unique indexes exist exactly once (no duplicates).
- [ ] RLS: `select tablename from pg_tables t where schemaname='public' and not rowsecurity;` → empty. `select count(*) from pg_policies where schemaname='public' and 'anon'=any(roles);` → 0.
- [ ] RLS grants belt check: `select grantee, table_name, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated');` → empty or explicitly accepted RLS-denied grants only.
- [ ] Enums gone: `select typname from pg_type where typname in ('equb_status','equb_funding','ledger_type','member_status','verification_status','workout_source');` → empty.
- [ ] Preserved data intact: `select count(*) from equb_rooms` → 5; partner_gyms 3; challenges 3; badge_definitions 18.

### Phase 4 — Deploy code
- [ ] Merge/deploy the branch (money hardening + S2 companion fixes) via Coolify.
- [ ] Confirm prod env: NODE_ENV=production, CRON_SECRET, CHAPA_WEBHOOK_SECRET, CHAPA_SECRET_KEY, QR_SECRET, ADMIN_TELEGRAM_ID, ALLOW_QA_AUTH unset/false.

### Phase 5 — Live-fire (10 ETB)
- [ ] Real stake join → pay 10 ETB via Chapa. Watch: `select status from payment_intents order by created_at desc limit 1;` transitions created → paid → credited.
- [ ] Exactly 1 equb_members row, 1 equb_ledger stake row for that tx_ref.
- [ ] Repeat once for a day pass (activated, amount recorded, expiry from activation).
- [ ] Trigger one `/cron/settle` on a mixed-result test room → payout + fee ledger rows once; `/cron/payouts` → job sent once, single Chapa transfer.
- [ ] Trigger one zero-winner settlement rehearsal → every paid member gets a `refund` ledger row and `payout_jobs` row; no fee row.
- [ ] Re-run `/cron/settle` for the same settled room → no new points, trainer earnings, notifications, payout/refund rows, or jobs.
- [ ] Conservation invariant for every settled rehearsal room: `sum(payout)+sum(refund)+sum(fee)` equals paid stakes plus backed sponsor ledger money, allowing only documented rounding residue.

### Phase 6 — Unfreeze + watch
- [ ] Re-enable Chapa checkout + n8n crons.
- [ ] First 48h: daily runbook queries — mismatch intents (`select * from payment_intents where status='mismatch'`), stuck jobs (`select * from payout_jobs where status='processing'`), failed jobs. Sentry watch.
- [ ] Daily pending-paid-room audit:
      `select r.id, r.name, r.start_date, count(l.id) as stake_rows, coalesce(sum(l.amount),0) as stake_total from equb_rooms r join equb_ledger l on l.room_id=r.id and l.type='stake' where r.status='pending' and r.start_date < now() group by r.id, r.name, r.start_date;`
      Expected: 0 rows. If any appear, freeze that room and manually insert one deterministic `refund` ledger row per paid member (`tx_ref='manual-refund-' || room_id || '-' || user_id`), mark the room `cancelled`, then run `/cron/payouts` so the global payout-job mirror creates and sends the refund jobs exactly once.

### Rollback strategy
- Failure DURING migration: both migrations are wrapped/idempotent; S2 runs in a single transaction (aborts atomically). Re-run after fixing, or restore the Phase-2 snapshot.
- Failure AFTER deploy, BEFORE live money: revert the code deploy (redeploy prior SHA). DB is empty of money data — restoring the Phase-2 snapshot returns to v1 cleanly. Because the money domain is virgin (0 rows), rollback loses nothing but the 5 seed rooms (covered by snapshot).
- Failure AFTER real payments exist: do NOT auto-rollback the DB (would drop real ledger rows). Freeze, reconcile via Chapa verify, decide per-transaction. This is why live-fire is a single 10 ETB test before unfreeze.
