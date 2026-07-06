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
- [ ] 4. Alter populated tables: `equb_rooms` (status → TEXT+CHECK w/ `settled`, drop `funding_type` — rule: room_type=sponsored ⇒ fee 0), `users` (display_name→full_name, telegram_handle→username, + supabase_uid/email); align partner_gyms/challenges/badge_definitions if drifted
- [ ] 5. Rewrite all 6 live functions + 5 money RPCs to canonical vocabulary (`room_id`/`p_room_id`/`settled`/6 ledger types)
- [ ] 6. RLS: enable everywhere, drop public-SELECT policies, revoke anon/authenticated table privileges + function EXECUTE (service_role only unless intentionally public)
- [ ] 7. Drop 6 orphaned v1 enum types

### S2 companion code commit (same deploy)
- [ ] verify.ts + buddies.ts: `equb_room_id` → `room_id`
- [ ] equb-rooms.ts my-results: `"completed"` → `"settled"`
- [ ] gamification: single `points_ledger` reference → `point_events`
- [ ] workouts.ts: call rewritten increment function with `p_room_id`
- [ ] shared types: `LedgerEntryType` gains `"sponsor"`
- [ ] Follow-up: mount `/api/notifications` route

### Pre-prod checklist
- [ ] Commit live schema snapshot ("before" artifact) alongside S2
- [ ] Rehearse full migration on Supabase branch/clone; verify tables/RPCs/policies
- [ ] Fable adversarial review of migration + runbook
- [ ] Prod apply → verify → deploy API → one live 10 ETB stake (`created → paid → credited`)
