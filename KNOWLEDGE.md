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

## ADR-0001 — Payment intents + DB-side crediting; payout jobs for money out (2026-07-06, accepted; prod migration pending)
**Context.** The original flow encoded meaning in tx_refs (`equb-{roomId}-{userId}-{ts}`) and parsed them in the webhook — broken, since UUIDs contain dashes. Crediting was a non-atomic two-row `Promise.all` in app code; payouts were sent *before* being marked paid with a fresh `Date.now()` reference per retry (double-pay on any crash/double-cron); execution state (`paid_at`) was written onto the immutable ledger.
**Decision.** (1) Money in: every checkout creates a `payment_intents` row first; the webhook looks up the intent, re-verifies the charge via Chapa's verify API, then calls one SECURITY DEFINER RPC per kind (`apply_stake_payment`, `activate_day_pass_payment`, `activate_coach_pass_payment`) doing *all* crediting writes in one transaction with row locks, `ON CONFLICT` idempotency on ledger tx_ref, and business re-validation. Unappliable verified payments become `mismatch` (manual-refund queue). (2) Money out: payout obligations mirror into `payout_jobs` with `UNIQUE(ledger_id)` and deterministic reference `payout-<ledger_id>`; the cron atomically claims a job before calling Chapa, so overlapping crons can't double-send and retries reuse the reference. Trainer payouts use `claim_trainer_payout` / `refund_trainer_payout` in the same shape. (3) `equb_ledger` stays append-only.
**Alternatives rejected.** Webhook-side crediting with constraints only (can't be atomic or re-validate transactionally via PostgREST); full outbox/queue infra (overkill — jobs + deterministic references give at-most-once); trusting the signed webhook payload without verify-by-API (Chapa guidance, string-amount quirks).
**Consequences.** Correctness now lives in SQL functions — they must be versioned in `supabase/migrations/` and reviewed like code (the deployed-but-unversioned `settle_equb` predates this and must be dumped, guarded, committed). The webhook is deploy-coupled to the migration: cutover order is migration → verify → deploy, never code first. `mismatch` intents and stuck `processing`/`failed` jobs are operational queues needing human eyes; automatic refunds were deliberately not built.
