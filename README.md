# FitEqub

Fitness accountability groups (Equbs) for Addis Ababa. Users stake ETB, complete workouts, and winners split the pot. Built as a Telegram Mini App.

## Features

- **Equb Rooms** — Join fitness accountability groups with real money stakes
- **Gym Day Passes** — Discounted single-visit passes at partner gyms
- **Step Challenges** — City-wide leaderboard competitions
- **Gamification** — Points, badges, levels, and referral system
- **Trainer Affiliates** — Commission-based trainer partnership program

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Hono |
| Bot | Telegraf (Telegram Bot API) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Payments | Chapa (Telebirr, M-Pesa, CBE Birr) |
| Deployment | Coolify (self-hosted) |
| Cron | n8n (settlement, reminders, payouts) |
| Linting | Biome |
| Testing | Vitest + Playwright |

## Project Structure

```
fitequb/
├── apps/
│   ├── web/          # React + Vite TMA frontend
│   ├── api/          # Hono REST API
│   └── bot/          # Telegraf Telegram bot
├── packages/
│   └── shared/       # Shared types, constants, utils
├── n8n/              # Cron workflow JSON files
├── e2e/              # Playwright E2E tests
└── CLAUDE.md         # AI-assisted development instructions
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Fill in your Supabase, Chapa, and Telegram credentials

# Run all apps in development
pnpm dev

# Lint and format
pnpm lint
pnpm format

# Build for production
pnpm build

# Run tests
pnpm test
```

## Environment Variables

See `.env.example` for all required variables.

## Deployment

Deployed via Coolify to a self-hosted server. Pushes to `main` trigger redeployment.

- **Web**: fitequb.com
- **API**: api.fitequb.com
- **Bot**: @fitequb_bot

## License

Private — Stringz Technologies
