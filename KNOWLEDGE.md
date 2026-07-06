# FitEqub — Knowledge Base

## Domain: Ethiopian Equb System
Traditional Ethiopian rotating savings group. Members contribute a fixed amount regularly, and one member takes the full pot each round. FitEqub adapts this: instead of rotating payouts, the pot is split among members who hit their fitness goals. Those who don't meet the threshold lose their stake to the winners.

## Business Logic

### Equb Lifecycle
1. **Created** (`pending`) — creator sets stake, duration, targets
2. **Filling** (`pending`) — members join and pay stake via Chapa
3. **Activated** (`active`) — min_members reached, start_date hit, workouts begin
4. **Running** (`active`) — daily workout logging for duration (default 30 days)
5. **Settling** (`settling`) — end_date reached, `settle_equb()` runs
6. **Settled** (`settled`) — payouts distributed, room archived
7. **Cancelled** (`cancelled`) — min_members not reached by start_date, stakes refunded

### Settlement Math
```
total_pot = sum of all member stakes + sponsor_prize (if any)
house_fee = total_pot * 0.05 (peer-funded only, 0 for sponsored)
distributable = total_pot - house_fee
qualified = members where completed_days >= workout_target * completion_pct
payout_per_winner = distributable / count(qualified)
```

If everyone qualifies: each gets `stake - (stake * 0.05)` back.
If nobody qualifies: house takes all (edge case — unlikely).

### Workout Verification Priority
1. QR gym check-in (scans partner gym QR code)
2. Manual step count entry
3. Photo proof upload
4. GPS proximity (optional, supplementary)

One workout per day per member. Multiple verification types can coexist but only count as 1 day.

### Day Pass Flow
- User pays `app_day_pass` price (what they see in TMA)
- We pay gym `day_pass_cost` (our negotiated rate)
- Margin = `app_day_pass - day_pass_cost`
- QR token generated on purchase, expires in 15 minutes
- Visual confirmation by gym staff (no scanner needed for MVP)
- Pass statuses: `active` → `redeemed` or `expired`

### Step Challenge
- Free to participate — no stakes
- Manual daily step count entry
- Public leaderboard
- Sponsored rewards (not money)
- Purpose: top-of-funnel acquisition into paid Equbs

## Growth Loop
```
Step Challenge (free) → User sees Equb rooms → Joins paid Equb → Buys gym day pass
     ↑                                                                    │
     └──────────────── Social sharing / word of mouth ←───────────────────┘
```

## Financial Rules
- All money in ETB (Ethiopian Birr)
- Chapa handles: Telebirr, M-Pesa, CBE Birr, Visa/Mastercard
- Ledger is append-only — never modify or delete entries
- Every money movement = ledger entry (stake, payout, fee, refund, day_pass_purchase)
- Payouts via Chapa Transfer API to mobile wallets
- 5% house fee on peer Equbs, 0% on sponsored

## Target Market
- Young professionals 20-35 in Addis Ababa
- Neighborhoods: Bole, Sarbet, CMC
- Already on Telegram (high adoption in Ethiopia)
- Price-sensitive but willing to stake small amounts for accountability
- Fitness-curious but struggle with consistency

## Supabase Schema Reference
| Table | Key Columns |
|-------|------------|
| users | id, telegram_id, supabase_uid, full_name, username, phone, created_at |
| equb_rooms | id, name, creator_id, stake_amount, duration_days, workout_target, completion_pct, status, start_date, end_date, sponsor_prize |
| equb_members | id, room_id, user_id, joined_at, completed_days, qualified |
| equb_ledger | id, room_id, user_id, type, amount, tx_ref, created_at |
| partner_gyms | id, name, location, lat, lng, day_pass_cost, app_day_pass, active |
| day_passes | id, user_id, gym_id, qr_token, status, purchased_at, expires_at, redeemed_at, amount, activated_at, payment_tx_ref |
| workouts | id, user_id, room_id, type, proof_url, step_count, lat, lng, logged_at |
| challenges | id, name, description, start_date, end_date, reward_description |
| challenge_participants | id, challenge_id, user_id, total_steps, last_logged_at |
| payment_intents | tx_ref (PK), kind, target_id, user_id, expected_amount, status, provider_amount, mismatch_reason |
| payout_jobs | id, ledger_id (UNIQUE), user_id, amount, reference (UNIQUE), status, attempts, sent_at |
| coach_sessions | id, trainer_id, title, session_type, price, active |
| coach_passes | id, user_id, trainer_id, session_id, status, price_paid, trainer_payout, platform_fee, payment_tx_ref |

## Ubiquitous Language — Money (canonical terms)
- **Payment Intent** — record of one expected inbound payment, created *before* checkout. Identified by an opaque **tx_ref** (`pi_<kind>_<uuid>`). tx_refs are never parsed for meaning; the intent row says what a payment is for. Kinds: `stake`, `duel`, `daypass`, `coach`.
- **Credited** — terminal success state of an intent: money applied to its target exactly once. Only `credited` blocks reprocessing.
- **Mismatch** — a *verified, successful* payment that could not be applied (room full, amount below expected, target not pending). Money is held; a human must refund. Never silently dropped.
- **Failed (intent)** — the provider says the charge itself did not succeed. No money moved; no refund owed.
- **Payout** — an `equb_ledger` row of type `payout`: an obligation to pay a winner. Distinct from the *transfer* that fulfils it.
- **Payout Job** — execution state machine for one payout obligation: `pending → processing → sent → confirmed`, or `failed` (retryable). Exactly one job per payout ledger row; its **reference** (`payout-<ledger_id>`) is deterministic so Chapa can deduplicate retries.
- **Transfer** — a Chapa money movement to a wallet. Chapa "success" means *queued*, not delivered.
- **Settlement** — one-time closing of an expired room: compute qualified members, house fee, write payout ledger rows. Settling a room twice is forbidden.
- **Trainer payout claim** — atomically deduct the trainer's pending balance and record the obligation *before* the transfer. Definite failure refunds the claim; ambiguous outcome stays claimed for manual review.
- **Admin** — the single operator in `ADMIN_TELEGRAM_ID`. A missing ID means *nobody* is admin, never everybody.
- **Room (FK naming rule)** — the canonical foreign-key column for "the equb room this row belongs to" is `room_id` in **all** tables and `p_room_id` in **all** SQL function parameters. No exceptions, no synonyms: `equb_id` and `equb_room_id` are retired v1 names and must not appear in new DDL, code, or functions (decided 2026-07-06 alongside ADR-0002).
- **Room terminal status** — a room that finished settlement is `settled` (lifecycle: `pending → active → settling → settled`, or `cancelled`). `completed` is **member/session** vocabulary (completed days, completed coach sessions), never room vocabulary. The v1 enum value `completed` is retired.
- **Ledger entry types** — exactly six: `stake`, `payout`, `fee`, `refund`, `day_pass_purchase`, `sponsor`. Retired v1 names: `stake_in → stake`, `house_fee → fee`, `sponsor_in → sponsor`.
- **State/type fields are TEXT + CHECK** — schema vocabulary lives in `TEXT` columns with `CHECK` constraints, never Postgres `ENUM` types. The v1 enum types (`equb_status`, `equb_funding`, `ledger_type`, `member_status`, `workout_source`, `verification_status`) are retired and dropped once no column references them.

## ADR-0001 — Payment intents + DB-side crediting; payout jobs for money out (2026-07-06, accepted; prod migration pending)
**Context.** The original flow encoded meaning in tx_refs (`equb-{roomId}-{userId}-{ts}`) and parsed them in the webhook — broken, since UUIDs contain dashes. Crediting was a non-atomic two-row `Promise.all` in app code; payouts were sent *before* being marked paid with a fresh `Date.now()` reference per retry (double-pay on any crash/double-cron); execution state (`paid_at`) was written onto the immutable ledger.
**Decision.** (1) Money in: every checkout creates a `payment_intents` row first; the webhook looks up the intent, re-verifies the charge via Chapa's verify API, then calls one SECURITY DEFINER RPC per kind (`apply_stake_payment`, `activate_day_pass_payment`, `activate_coach_pass_payment`) doing *all* crediting writes in one transaction with row locks, `ON CONFLICT` idempotency on ledger tx_ref, and business re-validation. Unappliable verified payments become `mismatch` (manual-refund queue). (2) Money out: payout obligations mirror into `payout_jobs` with `UNIQUE(ledger_id)` and deterministic reference `payout-<ledger_id>`; the cron atomically claims a job before calling Chapa, so overlapping crons can't double-send and retries reuse the reference. Trainer payouts use `claim_trainer_payout` / `refund_trainer_payout` in the same shape. (3) `equb_ledger` stays append-only.
**Alternatives rejected.** Webhook-side crediting with constraints only (can't be atomic or re-validate transactionally via PostgREST); full outbox/queue infra (overkill — jobs + deterministic references give at-most-once); trusting the signed webhook payload without verify-by-API (Chapa guidance, string-amount quirks).
**Consequences.** Correctness now lives in SQL functions — they must be versioned in `supabase/migrations/` and reviewed like code (the deployed-but-unversioned `settle_equb` predates this and must be dumped, guarded, committed). The webhook is deploy-coupled to the migration: cutover order is migration → verify → deploy, never code first. `mismatch` intents and stuck `processing`/`failed` jobs are operational queues needing human eyes; automatic refunds were deliberately not built.

## ADR-0002 — Rebuild empty v1 tables to v2 shape instead of renaming in place (2026-07-06, accepted)
**Context.** Production project `ufkkisleoimltqbnexpf` was verified live (read-only, 2026-07-06) to hold the original v1 schema: `equb_ledger(equb_id, entry_type, external_ref, paid_at)`, `equb_members(equb_id, payment_ref, paid_at, workouts_done, progress_pct, payout_ref, payout_at, …)`, `workout_buddies(equb_id, user_a, user_b)`. All committed code (including `origin/main`, which Coolify deploys) speaks the v2 vocabulary (`room_id`, `type`, `tx_ref`, `completed_days`) — a half-finished in-code rename that never produced a DDL migration. Consequence: the deployed app has never successfully executed an equb operation against this database. Live data confirms it: `equb_members`, `equb_ledger`, `workout_buddies`, `workouts`, `day_passes`, and `public.users` all hold **0 rows**; only `equb_rooms` has data (5 rows). No public table holds an inbound FK into the three drifted tables; their only FKs point outward to `equb_rooms` and `users`.
**Decision.** The v2 code shape is canonical. Reconciliation (S2) proceeds as **rebuild-empty / alter-populated** across the full public schema (a 2026-07-06 full snapshot — functions, policies, enums, columns, row counts — expanded the scope beyond the original three tables):
- **Preserve + alter (hold data):** `equb_rooms` (5 rows — status enum→TEXT+CHECK, keep `room_type`, drop `funding_type` with the rule *`room_type='sponsored'` ⇒ sponsor-funded, house fee 0; `public`/`private` ⇒ peer-funded, normal fee*), `partner_gyms` (3), `challenges` (3), `badge_definitions` (18).
- **Alter to code shape, never drop (auth-coupled, 0 rows):** `users` — live `display_name`/`telegram_handle` → code `full_name`/`username`, add `supabase_uid`/`email`.
- **Rebuild-empty to code shape (verified 0 rows, no inbound FKs, no `DROP CASCADE`):** `equb_members`, `equb_ledger`, `workout_buddies`, `workouts`, `workout_verifications`, `daily_verification_summary`, `day_passes`, `trainers` (DDL derived from code/shared types, not live — live `pending_payout` drift is wider than one column), `trainer_earnings`, `trainer_payouts`, `coach_sessions`, `coach_passes`, `challenge_participants`, `referrals`.
- **Create new:** `payment_intents`, `payout_jobs` (ADR-0001), `point_events`, `notifications` (live table absent; product UI and bot logging expect it — `/api/notifications` mounting is a follow-up code task).
- **Drop as ghosts:** `points_ledger` (after `award_points`/`grant_badge`/gamification move to `point_events` — "ledger" is reserved for money vocabulary), `gym_settlements` (empty, zero code references; future gym settlement designs against `payout_jobs`).
- **Vocabulary (see glossary):** `room_id` everywhere / `p_room_id` in function parameters; room terminal status `settled`; ledger entry types `stake|payout|fee|refund|day_pass_purchase|sponsor`; all state/type fields TEXT + CHECK, v1 enum types dropped once unreferenced.
- **Functions:** all six live functions (`settle_equb`, `increment_completed_days`, `process_trainer_commissions`, `award_points`, `grant_badge`, `increment_trainer_balance` — the last is broken live against its own table) are rewritten in the same cutover to the canonical vocabulary. SECURITY DEFINER functions are reviewed as privileged APIs; EXECUTE revoked from PUBLIC/anon/authenticated, granted to service_role unless intentionally public.
- **RLS posture: deny-by-default, API-only.** RLS enabled on every public table; zero anon/authenticated policies; live public-SELECT policies dropped, not re-created; table privileges revoked from anon/authenticated; all app data access flows through the Hono API (service-role client). The web anon client is for Auth only. Any future client-side read requires a deliberate, reviewed policy. This dissolves the coach-table RLS hazard (unsafe `FOR ALL USING(true)` policies existed only in the repo's 20260323 file, never live; the rebuild supersedes them).

v1-only execution-state columns (`payment_ref`, `payout_ref`, `payout_at`, `paid_at`, `progress_pct`, `status` on members) die with the rebuild — their successors are `payment_intents` and `payout_jobs` (ADR-0001).
**Alternatives rejected.** *Rename in place*: preserves nothing (tables are empty) while inheriting unknown v1 constraints/defaults and requiring the same function rewrites — all cost, no benefit. *Adapt code back to v1*: would rewrite the entire money-hardening layer, shared types, and most routes to resurrect a shape the codebase already abandoned. *Re-creating live's public-SELECT policies*: serves a client-side PostgREST pattern the app doesn't use and leaks data shapes (e.g. anon-readable trainer phone numbers).
**Consequences.** S2 produces the version-controlled v2 baseline (S3) as a by-product. A future reader will find `DROP TABLE` statements in a money migration — safe precisely because the emptiness was verified live and is re-asserted with `count(*)` guards at apply time. The 5 `equb_rooms` rows are the only production data in the money domain and must survive the cutover. Companion code fixes ride with S2's deploy: `verify.ts`/`buddies.ts` `equb_room_id`→`room_id`, `equb-rooms.ts` my-results `"completed"`→`"settled"`, the single `points_ledger` reference→`point_events`, `workouts.ts` call updated to `p_room_id`, shared `LedgerEntryType` gains `sponsor`.
