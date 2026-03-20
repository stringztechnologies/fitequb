# FitEqub — Implementation Tasks

## Wave 1: Foundation + Auth
> Branch: `feat/wave-1-foundation`

- [ ] Initialize pnpm monorepo with workspace config
- [ ] Scaffold `apps/web` — React + Vite + TypeScript + Tailwind + @telegram-apps/sdk-react
- [ ] Scaffold `apps/api` — Hono + TypeScript
- [ ] Scaffold `apps/bot` — Telegraf + TypeScript
- [ ] Scaffold `packages/shared` — shared types, constants
- [ ] Configure Biome (lint + format)
- [ ] Configure tsconfig.base.json + per-app tsconfigs
- [ ] Create .env.example with all required vars
- [ ] Set up Supabase client (server + browser)
- [ ] Implement Telegram initData validation middleware (Hono)
- [ ] Implement auth flow: TMA opens → initData sent to API → validate → upsert user → return JWT
- [ ] Bot: /start command + Mini App launch button
- [ ] Sentry setup (api + web)
- [ ] Verify: `pnpm dev` runs all three apps

## Wave 2: Equb Core
> Branch: `feat/wave-2-equb`

- [ ] API: POST /equb-rooms — create room (validated input)
- [ ] API: GET /equb-rooms — list rooms (pending, active)
- [ ] API: GET /equb-rooms/:id — room detail with members + progress
- [ ] API: POST /equb-rooms/:id/join — join room (validates capacity, status)
- [ ] API: POST /workouts — log workout (QR, steps, photo)
- [ ] API: POST /equb-rooms/:id/settle — trigger settlement (admin/cron)
- [ ] Chapa: initialize payment for stake
- [ ] Chapa: webhook handler for payment confirmation
- [ ] Chapa: transfer API for payouts
- [ ] TMA: Equb rooms list page
- [ ] TMA: Room detail page (members, progress, countdown)
- [ ] TMA: Join room flow (payment → confirmation)
- [ ] TMA: Log workout page (QR scanner, step input, photo upload)
- [ ] Bot: notifications — room activated, member joined, workout reminder, settlement results
- [ ] RLS policies for equb_rooms, equb_members, equb_ledger, workouts

## Wave 3: Gym Day Passes
> Branch: `feat/wave-3-day-passes`

- [ ] API: GET /gyms — list partner gyms
- [ ] API: POST /day-passes — purchase pass (Chapa payment)
- [ ] API: GET /day-passes/:id — pass detail with QR
- [ ] API: POST /day-passes/:id/redeem — mark as redeemed
- [ ] Chapa: payment flow for day pass purchase
- [ ] QR generation: crypto random token, 15-min expiry
- [ ] TMA: Gym list page (name, location, price)
- [ ] TMA: Day pass purchase flow
- [ ] TMA: QR display with countdown timer
- [ ] RLS policies for partner_gyms, day_passes

## Wave 4: Step Challenge + Polish
> Branch: `feat/wave-4-challenge`

- [ ] API: GET /challenges — list active challenges
- [ ] API: POST /challenges/:id/join — join challenge
- [ ] API: POST /challenges/:id/log-steps — daily step entry
- [ ] API: GET /challenges/:id/leaderboard — ranked participants
- [ ] TMA: Challenge list page
- [ ] TMA: Leaderboard page
- [ ] TMA: Log steps page
- [ ] TMA: Home page — dashboard with active Equbs, passes, challenge rank
- [ ] TMA: Navigation (bottom tabs)
- [ ] Bot: deep links to specific screens
- [ ] RLS policies for challenges, challenge_participants
- [ ] Error boundaries + loading states across all pages
- [ ] Haptic feedback on key actions

## Wave 5: Deploy + QA
> Branch: `feat/wave-5-deploy`

- [ ] Dockerfiles for api + bot
- [ ] Coolify deployment config
- [ ] Environment variables set in Coolify
- [ ] Vercel config for web (backup)
- [ ] Health check endpoints
- [ ] Settlement cron job (n8n or node-cron)
- [ ] Workout reminder cron (daily 8am EAT)
- [ ] QA: full flow test — onboard → join Equb → log workouts → settle
- [ ] QA: day pass purchase → QR → redeem
- [ ] QA: challenge join → log steps → leaderboard
- [ ] QA: payment failure handling
- [ ] QA: edge cases — room full, expired pass, double join
- [ ] Performance: TMA loads < 2s on 4G
