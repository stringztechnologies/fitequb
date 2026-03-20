# FitEqub — Product Specification

> Version: 1.0
> Date: 2025-03-20
> Status: Draft — awaiting founder approval
> Author: Claude Code (Phase 1: Specify)

---

## 1. Product Overview

**FitEqub** is a Telegram Mini App (TMA) where users in Addis Ababa join 30-day fitness accountability groups called "Equbs" — modeled on Ethiopia's traditional rotating savings system. Members stake real money (ETB via Telebirr/Chapa), complete workouts, and winners split the pot of those who didn't finish. The app also offers discounted gym day passes via QR codes and a city-wide step challenge leaderboard.

**Target audience:** Young professionals aged 20-35 in Bole, Sarbet, and CMC neighborhoods, already active on Telegram.

**Core insight:** Turn fitness into a financial game. Loss aversion is a stronger motivator than willpower.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, @telegram-apps/sdk-react |
| Backend | Node.js + Hono |
| Database | Supabase (Postgres + Auth + Storage + RLS) |
| Payments | Chapa (Telebirr, M-Pesa, CBE Birr, card) |
| Bot | Telegraf |
| Deployment | Coolify (primary), Vercel (backup) |
| Monitoring | Sentry |

**Supabase project:** `ufkkisleoimltqbnexpf` (eu-central-1) — already deployed with 9 tables, `settle_equb()` function, and 3 seeded partner gyms.

---

## 3. Features

### 3.1 Equb Rooms (Core — Revenue Driver)

Users create or join 30-day fitness accountability groups with real money at stake.

#### Room Creation
- Creator sets: name, stake amount (10–1000 ETB), duration (default 30 days), workout target (days), completion threshold (default 80%), max members (3–15)
- Sponsored Equbs: stake can be 0 ETB with sponsor prize pool
- Room stays in `pending` status until `min_members` reached (minimum 3)
- Once minimum met, room activates on start date

#### Joining
- User authenticates via Telegram initData
- Pays stake via Chapa (Telebirr, M-Pesa, CBE Birr, or card)
- Payment confirmed → `equb_members` row created, `equb_ledger` entry recorded
- Cannot join after room has started

#### Workout Verification (Tiered — MVP)
1. **QR Gym Check-in** (strongest) — scan QR at partner gym
2. **Step Count** — manual daily entry (honor system v1)
3. **Photo Proof** — upload workout selfie via TMA (auto-approved v1)
4. **GPS** — optional location log for gym proximity, not required

Each verified workout = 1 day logged in `workouts` table.

#### Settlement
- Triggered at room end date via `settle_equb()` database function
- Members with `completed_days >= workout_target * completion_pct` are **qualified**
- **Qualified members** split: `(total_pot - house_fee)` equally
- **Unqualified members** lose their stake
- **House fee:** 5% on peer-funded Equbs, 0% on sponsored Equbs
- **If everyone qualifies:** each gets stake back minus 5% house fee
- Payouts via Chapa transfer to member's mobile wallet
- All transactions recorded in `equb_ledger` (immutable — no UPDATE/DELETE)

#### Equb Room States
```
pending → active → settling → settled
                → cancelled (if min_members not reached by start_date)
```

### 3.2 Gym Day Passes (Revenue Driver)

Discounted single-visit passes to partner gyms, purchased and redeemed via TMA.

#### Flow
1. User browses partner gyms in TMA (list with name, location, price)
2. Taps "Get Day Pass" → pays `app_day_pass` price via Chapa
3. Receives QR code (`qr_token` in `day_passes` table)
4. Shows QR at gym reception — staff visually confirms
5. Pass marked as `redeemed`
6. QR expires after **15 minutes** if not redeemed

#### Revenue Model
- Margin between `app_day_pass` (user pays) and `day_pass_cost` (we pay gym)
- No commission — clean margin per pass

#### Seeded Gyms
| Gym | Walk-in | App Price | Our Cost | Margin |
|-----|---------|-----------|----------|--------|
| Infinity Fitness | — | 300 ETB | 180 ETB | 120 ETB |
| Body Zone | — | 250 ETB | 150 ETB | 100 ETB |
| Atlas Fitness Center | — | 200 ETB | 120 ETB | 80 ETB |

### 3.3 Step Challenge (Acquisition Funnel)

Free city-wide step challenge with public leaderboard. No money at stake — rewards are sponsored.

#### Mechanics
- User logs daily step count manually (reads from phone's built-in health app)
- Public leaderboard visible to all TMA users
- Challenges have start/end dates, defined in `challenges` table
- Participation tracked in `challenge_participants` table
- Rewards: data packages, juice bar vouchers (sponsor-provided)

#### Purpose
Top-of-funnel acquisition: **Challenge (free) → see Equbs → join paid Equb → buy gym passes**

### 3.4 Telegram Bot

Telegraf-based bot handles:
- `/start` — welcome message + launch Mini App button
- Notifications: room activation, workout reminders, settlement results, day pass QR
- Deep links into specific TMA screens (e.g., join a specific Equb room)

---

## 4. User Flows

### 4.1 Onboarding
```
User clicks bot link or finds @FitEqubBot
→ /start command
→ Bot sends welcome + "Open FitEqub" button
→ TMA opens
→ Telegram initData validated on backend
→ User row created/updated in users table
→ Home screen: active Equbs, gym passes, challenge leaderboard
```

### 4.2 Join Equb
```
Home → Browse Equbs → Tap room → "Join for {stake} ETB"
→ Chapa payment flow (Telebirr/M-Pesa/CBE/card)
→ Webhook confirms payment
→ equb_members row created
→ equb_ledger entry: type=stake, amount=stake
→ Redirect to room detail screen
→ Bot notifies room members: "{name} joined!"
```

### 4.3 Log Workout
```
Room detail → "Log Today's Workout"
→ Choose verification type:
  - QR scan (camera opens, scan gym QR)
  - Step count (enter number)
  - Photo (take/upload selfie)
→ workouts row created
→ Progress bar updates
→ Bot sends encouragement or warning if falling behind
```

### 4.4 Buy Day Pass
```
Home → Gym Passes → Select gym → "Get Day Pass — {price} ETB"
→ Chapa payment
→ Webhook confirms
→ QR code generated (qr_token)
→ QR displayed in TMA with 15-min countdown
→ Show at gym reception
→ Staff confirms visually
→ Pass marked redeemed
```

### 4.5 Settlement
```
Room end date reached
→ settle_equb() runs (cron or manual trigger)
→ Calculates qualified members (>= 80% completion)
→ Splits pot minus 5% house fee
→ equb_ledger entries: type=payout for winners, type=fee for house
→ Chapa transfers initiated to winners' wallets
→ Bot notifies all members with results
→ Room status → settled
```

---

## 5. Data Model

Already deployed to Supabase (`ufkkisleoimltqbnexpf`):

| Table | Purpose |
|-------|---------|
| `users` | Telegram-authenticated users |
| `equb_rooms` | Accountability group definitions |
| `equb_members` | User ↔ room membership |
| `equb_ledger` | Immutable financial transaction log |
| `partner_gyms` | Gym info, pricing, location |
| `day_passes` | Purchased passes with QR tokens |
| `workouts` | Daily workout verification logs |
| `challenges` | Step challenge definitions |
| `challenge_participants` | User ↔ challenge participation + steps |

**Key constraints:**
- `equb_ledger` is immutable (no UPDATE, no DELETE)
- `settle_equb()` is a Postgres function handling settlement logic
- RLS policies to be configured per table

---

## 6. Integrations

### Chapa
- **Initialize payment:** POST to Chapa API with amount, currency (ETB), callback URL
- **Webhook:** Verify HMAC signature, update ledger
- **Payout/Transfer:** Chapa transfer API to mobile wallets for Equb winnings

### Telegram
- **Auth:** Validate `initData` from TMA using bot token HMAC
- **Bot:** Telegraf for commands, notifications, deep links
- **TMA SDK:** @telegram-apps/sdk-react for native UI (MainButton, BackButton, haptics, theme)

### Sentry
- Error tracking for both backend (Hono) and frontend (React)
- Performance monitoring on critical paths (payment, settlement)

---

## 7. Revenue Model

| Stream | Mechanism | Expected Margin |
|--------|-----------|----------------|
| Equb House Fee | 5% of peer-funded pot | Variable per room |
| Gym Day Passes | Margin between app price and gym cost | 80–120 ETB per pass |
| Sponsored Equbs | Sponsors pay us directly (not from pot) | Per-deal negotiation |

---

## 8. MVP Scope (v1)

**Ships all three features together.** Rationale: Challenge (free) is the acquisition funnel that drives users to paid Equbs. Gym passes generate steady revenue. All three form the growth loop.

### In Scope (v1)
- Telegram Mini App (React + Vite + @telegram-apps/sdk-react)
- Hono backend API
- Telegram bot (Telegraf) with /start, notifications, deep links
- Equb rooms: create, join, pay stake, log workouts, settle
- Workout verification: QR, manual steps, photo (all auto-approved v1)
- Gym day passes: browse, buy, QR generation, visual redemption
- Step challenge: manual entry, leaderboard
- Chapa payments: initialize, webhook, payout
- Supabase Auth via Telegram initData
- Sentry error tracking
- Deploy to Coolify

### Out of Scope (v2+)
- Google Fit / Apple Health API auto-sync for steps
- Automated photo verification (AI/community review)
- GPS-enforced gym check-in
- Admin dashboard (manage gyms, view analytics)
- Multi-city expansion
- In-app chat within Equb rooms
- Referral system
- Push notifications outside Telegram

---

## 9. Non-Functional Requirements

- **Performance:** TMA must load in < 2s on 4G connection
- **Security:** All payments verified via Chapa HMAC webhook. Telegram initData validated server-side. RLS on all Supabase tables.
- **Availability:** Deployed via Coolify with health checks. Settlement can tolerate 1-hour delay.
- **Data integrity:** Ledger is append-only. All financial operations are idempotent.
- **Localization:** English primary (v1). Amharic labels for key actions (v2).

---

## 10. Success Metrics (Launch)

- 50 users in first Equb round (30 days post-launch)
- 3 partner gyms onboarded (done — already seeded)
- 100 day passes sold in first 60 days
- < 5% payment failure rate
- Settlement completes correctly for first 10 rooms

---

*Awaiting founder approval to proceed to Phase 2: Architect.*
