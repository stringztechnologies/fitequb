# FitEqub — Project Instructions

## Project Overview
FitEqub is a Telegram Mini App for fitness accountability groups (Equbs) in Addis Ababa. Users stake ETB, complete workouts, and winners split the pot. Also offers gym day passes and step challenges.

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
