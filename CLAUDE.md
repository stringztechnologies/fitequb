# FitEqub — Project Instructions

## Project Overview
FitEqub is a Telegram Mini App for fitness accountability groups (Equbs) in Addis Ababa. Users stake ETB, complete workouts, and winners split the pot. Also offers gym day passes and step challenges.

> **Note (drift from original spec):** the app has since pivoted to **dual-surface** — it runs both as a Telegram Mini App AND as a standalone web app. Web visitors can sign in natively (phone/email OTP via Supabase Auth, see `SignIn.tsx` + `/web-auth`), browse public data unauthenticated (`/public`, `LandingPage.tsx`), and install as a PWA. `TelegramGate` falls back to web mode when `initData` is absent. The original SPEC.md (Telegram-only, 9 tables, no admin/referrals) is now out of date — treat this file as the source of truth.

## Current Surface Area (features actually built)
- **Core Equb:** create/join rooms, stake via Chapa, log workouts, `settle_equb()` payout split, immutable ledger.
- **Workout verification (`/api/verify`):** QR gym check-in, manual steps, photo proof, buddy confirmation, GPS proximity. Honor-system for steps/photo (no fitness-API validation yet).
- **Gym passes:** browse gyms, buy day pass, QR redemption, gym-staff + gym-dashboard views.
- **Challenges:** step challenge + leaderboard; **Duels** (1v1) via `/api/duels`.
- **AI Coach (`/api/ai`):** Gemini 2.5 Flash, 15s timeout. Requires `GEMINI_API_KEY`.
- **Gamification (`/api/gamification`):** points, badges, levels, referrals.
- **Trainers/Coaches:** affiliate commissions (`/api/trainers`), coach passes (`/api/coach-passes`).
- **Admin dashboard (`/api/admin`):** stats, gym/user management. Guarded by `ADMIN_TELEGRAM_ID`.
- **Cron (`/cron`, secret-guarded):** `settle`, `reminders`, `payouts`, `daily-reset`. Orchestrated by n8n JSON workflows in `/n8n`. **Note:** cron handlers loop per-user/room (N+1) — see REVIEW.md scale roadmap before 10K users.

## API Route Map (`apps/api/src/routes`)
Public (no auth): `health`, `webhooks` (Chapa HMAC), `cron` (secret), `gym-public`, `public-browse`, `web-auth`.
Authenticated (`/api/*`, Telegram or web JWT): `auth`, `equb-rooms`, `workouts`, `gyms`, `challenges`, `gamification`, `trainers`, `admin`, `ai`, `buddies`, `coach-passes`, `duels`, `verify`.

## Tech Stack
- **Frontend:** React 18 + Vite + TypeScript + @telegram-apps/sdk-react + Tailwind CSS
- **Backend:** Node.js + Hono + TypeScript
- **Database:** Supabase (project: ufkkisleoimltqbnexpf, eu-central-1)
- **Payments:** Chapa (Telebirr, M-Pesa, CBE Birr, card)
- **Bot:** Telegraf
- **Deployment:** Coolify (primary), Vercel (backup)
- **Monitoring:** Sentry
- **Linting:** Biome

## Project Structure
```
fitequb/
├── apps/
│   ├── web/              # React + Vite TMA frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── types/
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── api/              # Hono backend
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── services/
│   │   │   ├── lib/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   └── package.json
│   └── bot/              # Telegraf bot
│       ├── src/
│       │   ├── commands/
│       │   ├── handlers/
│       │   └── index.ts
│       └── package.json
├── packages/
│   └── shared/           # Shared types, constants, utils
│       ├── src/
│       │   ├── types/
│       │   ├── constants/
│       │   └── utils/
│       └── package.json
├── CLAUDE.md
├── KNOWLEDGE.md
├── SPEC.md
├── REVIEW.md
├── TASKS.md
├── package.json          # Workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── biome.json
└── .env.example
```

## Monorepo
- Package manager: pnpm with workspaces
- Three apps: `web`, `api`, `bot`
- One shared package: `packages/shared`

## Supabase
- Project already deployed — DO NOT recreate schema
- Project ID: `ufkkisleoimltqbnexpf`
- URL: `https://ufkkisleoimltqbnexpf.supabase.co`
- 9 tables: users, equb_rooms, equb_members, equb_ledger, partner_gyms, day_passes, workouts, challenges, challenge_participants
- `settle_equb()` Postgres function deployed
- Ledger is immutable (no UPDATE/DELETE)
- 3 partner gyms seeded
- Use `@supabase/supabase-js` client — server-side with service role key, client-side with anon key
- Auth: Telegram initData validation → Supabase custom JWT

## Chapa Integration
- Initialize: POST `https://api.chapa.co/v1/transaction/initialize`
- Verify: GET `https://api.chapa.co/v1/transaction/verify/{tx_ref}`
- Webhook: HMAC SHA256 verification with `CHAPA_WEBHOOK_SECRET`
- Transfer (payouts): POST `https://api.chapa.co/v1/transfers`
- All amounts in ETB, currency code: ETB

## Telegram
- Auth: validate initData HMAC using bot token
- TMA SDK: @telegram-apps/sdk-react for MainButton, BackButton, haptics, theme
- Bot: Telegraf for /start, notifications, deep links
- Mini App launch: via bot menu button or inline keyboard

## Conventions
- TypeScript strict mode everywhere
- Biome for linting and formatting
- Conventional commits: `type(scope): description`
- Branch naming: `type/short-description`
- Never commit to main directly
- All API routes return `{ data, error }` shape
- All amounts (stake_amount, payout_amount, total_pot) stored in ETB — Chapa API also accepts ETB
- All dates in UTC, display in EAT (UTC+3)
- Environment variables: `.env` per app, never committed

## Commands
```bash
pnpm dev          # Run all apps in dev mode
pnpm build        # Build all apps
pnpm lint         # Biome check
pnpm format       # Biome format
pnpm typecheck    # tsc --noEmit across all apps
```

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `stringztechnologies/fitequb`; external PRs are not a triage request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default Matt Pocock skills triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See `docs/agents/domain.md`.

## Environment Variables
```
# Supabase
SUPABASE_URL=https://ufkkisleoimltqbnexpf.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Chapa
CHAPA_SECRET_KEY=
CHAPA_WEBHOOK_SECRET=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_MINI_APP_URL=

# Sentry
SENTRY_DSN=

# App
API_URL=
PORT=3000
NODE_ENV=development
```

## Pre-Push Checklist
1. `pnpm lint` — clean
2. `pnpm typecheck` — clean
3. `pnpm build` — clean
4. No .env files staged
5. Conventional commit message
