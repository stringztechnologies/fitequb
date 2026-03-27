# FitEqub — Technical Architecture Review

> Generated: 2026-03-28 | Source: codebase inspection + live Supabase queries

---

## 1. PROJECT STRUCTURE

### Monorepo Workspaces

| Workspace | Package Name | Purpose |
|-----------|-------------|---------|
| apps/web | @fitequb/web | React + Vite Telegram Mini App frontend |
| apps/api | @fitequb/api | Hono REST API backend |
| apps/bot | @fitequb/bot | Telegraf Telegram bot |
| packages/shared | @fitequb/shared | Shared types, constants, utility functions |

### Source File Count

| Workspace | Files | Lines of Code |
|-----------|-------|---------------|
| packages/shared | 3 | 350 |
| apps/web | 37 | 7,855 |
| apps/api | 24 | 3,360 |
| apps/bot | 2 | 49 |
| **Total** | **66** | **11,614** |

### Build Tools & Runtime

| Component | Tool |
|-----------|------|
| Frontend build | Vite 6.0.0 + @vitejs/plugin-react 4.3.0 |
| Backend build | tsc (TypeScript 5.7.0) |
| Dev runner | tsx |
| Runtime | Node.js >= 20 |
| Package manager | pnpm (lockfile v9) |
| Lockfile | pnpm-lock.yaml (224 KB) |
| Linter/Formatter | Biome 1.9.4 |
| TypeScript | Strict mode, ES2022 target, bundler module resolution |

---

## 2. FRONTEND (apps/web)

### Core Dependencies

| Dependency | Version |
|-----------|---------|
| React | 18.3.0 |
| react-router-dom | 7.1.0 |
| @telegram-apps/sdk-react | 2.0.0 |
| @sentry/react | 10.45.0 |
| Tailwind CSS | 3.4.0 |
| Vite | 6.0.0 |
| vite-plugin-pwa | 1.2.0 |

### State Management

- No external state library (no Zustand, Redux, React Query, Jotai)
- Local component state via useState / useEffect
- Custom useAuth() hook for auth state
- API calls made directly in components via useEffect

### CSS Approach

- Tailwind CSS 3.4.0 with Material Design 3 dark palette
- Custom component classes in @layer components:
  - .glass-card — rgba(32,31,31,0.6) + blur(20px) backdrop
  - .glass — rgba(28,28,30,0.85) + blur(20px) backdrop
  - .neon-glow — box-shadow: 0 0 20px rgba(63,229,108,0.15)
  - .gold-glow — box-shadow: 0 0 20px rgba(255,219,60,0.1)
- Custom shadows: shadow-glow, shadow-glow-strong, shadow-glow-gold, shadow-nav-glow
- Custom gradients: bg-gradient-green, bg-gradient-gold

### Color Palette (Tailwind extended)

| Token | Hex | Usage |
|-------|-----|-------|
| primary | #3fe56c | Neon green — CTA, active states |
| primary-container | #00c853 | Bright green — containers |
| secondary | #fff9ef | Light cream — text |
| secondary-container | #ffdb3c | Gold — rewards, badges |
| tertiary | #ffb7a6 | Peach — accents |
| error | #ffb4ab | Error states |
| background | #131313 | App background |

### All Page Routes

| Path | Component | Lazy? | Auth? |
|------|-----------|-------|-------|
| / | Home.tsx | No | Yes |
| /onboarding | Onboarding.tsx | No | Yes |
| /equbs | EqubList.tsx | Yes | Yes |
| /equbs/create | CreateEqub.tsx | Yes | Yes |
| /equbs/:id | EqubDetail.tsx | Yes | Yes |
| /equbs/:id/log | LogWorkout.tsx | Yes | Yes |
| /quick-join | QuickJoin.tsx | Yes | Yes |
| /duel | DuelChallenge.tsx | Yes | Yes |
| /gyms | GymList.tsx | Yes | Yes |
| /day-passes/:id | DayPassDetail.tsx | Yes | Yes |
| /challenges | ChallengeList.tsx | Yes | Yes |
| /challenges/:id | Leaderboard.tsx | Yes | Yes |
| /profile | Profile.tsx | Yes | Yes |
| /trainer | TrainerDashboard.tsx | Yes | Yes |
| /admin | AdminDashboard.tsx | Yes | Yes |
| /coach | AiCoach.tsx | Yes | Yes |
| /coaches | CoachList.tsx | Yes | Yes |
| /verify | VerifyWorkout.tsx | Yes | Yes |
| /notifications | Notifications.tsx | Yes | Yes |
| /payment | Payment.tsx | Yes | Yes |
| /win | WinCelebration.tsx | Yes | Yes |
| /sync | SyncFitness.tsx | Yes | Yes |
| /how-it-works | HowItWorks.tsx | Yes | Yes |
| /qr/:id | GymQrCheckin.tsx | Yes | Yes |
| /gym-staff | GymStaff.tsx | No | No |
| /gym-dashboard | GymDashboard.tsx | Yes | No |
| * | NotFound.tsx | Yes | No |

Total: 27 routes (25 authenticated, 2 public)

### Shared Components

| Component | Purpose |
|-----------|---------|
| BottomNav.tsx | 5-tab bottom navigation (Home, Equbs, Gyms, Compete, Profile) |
| TelegramGate.tsx | Auth gate with landing page fallback for non-TMA access |
| Loading.tsx | Loading spinner |
| EmptyState.tsx | Empty state card with icon, title, subtitle, optional CTA |
| ErrorBoundary.tsx | Class-based error boundary with Sentry reporting |

### Bundle Size

| Chunk | Raw | Gzipped |
|-------|-----|---------|
| index (main bundle) | 230.16 KB | 72.27 KB |
| CreateEqub | 14.11 KB | 3.52 KB |
| Profile | 10.51 KB | 2.53 KB |
| EqubDetail | 9.18 KB | 2.68 KB |
| AdminDashboard | 8.69 KB | 2.30 KB |
| ChallengeList | 8.59 KB | 2.35 KB |
| EqubList | 8.11 KB | 2.47 KB |
| DuelChallenge | 7.30 KB | 1.86 KB |
| VerifyWorkout | 7.12 KB | 2.51 KB |
| All other chunks | < 7 KB each | < 2.1 KB each |
| Total precache | 420.30 KB | — |

### PWA Support

Fully enabled via vite-plugin-pwa 1.2.0:
- Service worker: auto-generated (Workbox, generateSW mode)
- Manifest: FitEqub, standalone display, #131313 theme
- Icons: 192px + 512px (+ maskable)
- Precache: 38 entries (420 KB)
- Runtime cache: Google Fonts (CacheFirst strategy)

### Fonts

| Font | Weights | CSS Variable | Usage |
|------|---------|-------------|-------|
| Epilogue | 700, 800, 900 | font-headline | Headlines |
| Manrope | 400, 500, 600, 700 | font-body | Body text (primary) |
| Space Grotesk | 400, 500, 700 | font-label | Labels, badges |
| Material Symbols Outlined | — | — | Icons |
| Material Symbols Rounded | — | — | Icons (alt) |

Loading: Google Fonts CDN with preconnect hints.

### External CDN Dependencies

- https://telegram.org/js/telegram-web-app.js (deferred)
- Google Fonts (preconnected)
- No other CDN scripts

---

## 3. BACKEND (apps/api)

### Framework

| Item | Value |
|------|-------|
| Framework | Hono 4.6.0 |
| Server | @hono/node-server 1.13.0 |
| Runtime | Node.js |
| Validation | Zod |
| Port | 3000 |

### Global Middleware Stack

1. bodyLimit — 5 MB max request body
2. logger — HTTP request/response logging
3. cors — Origin: TELEGRAM_MINI_APP_URL or https://fitequb.com; Methods: GET, POST, PUT, DELETE
4. telegramAuth — Applied to all /api/* routes (HMAC-SHA256 initData validation)

### All API Routes (61 endpoints)

#### Public Routes (no auth)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| GET | /health | health.ts | Health check |
| POST | /webhooks/chapa | webhooks.ts | Chapa payment webhook |
| POST | /cron/settle | cron.ts | Settle expired equbs |
| POST | /cron/reminders | cron.ts | Send workout reminders |
| POST | /cron/payouts | cron.ts | Process trainer payouts |
| POST | /cron/daily-reset | cron.ts | Reset daily verifications |
| GET | /gym/verify-pass | gym-public.ts | Verify day pass QR token |
| POST | /gym/redeem-pass | gym-public.ts | Redeem day pass |
| GET | /gym/dashboard | gym-public.ts | Gym owner dashboard data |

#### Auth (/api/auth)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| POST | /api/auth/login | auth.ts | Upsert user from TMA initData |

#### Equb Rooms (/api/equb-rooms)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| POST | /api/equb-rooms | equb-rooms.ts | Create equb room |
| GET | /api/equb-rooms | equb-rooms.ts | List equb rooms |
| GET | /api/equb-rooms/:id | equb-rooms.ts | Get room detail |
| POST | /api/equb-rooms/:id/join | equb-rooms.ts | Join room (+ payment init) |

#### Workouts (/api/workouts)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| POST | /api/workouts | workouts.ts | Log a workout |

#### Gyms (/api/gyms)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| GET | /api/gyms | gyms.ts | List partner gyms |
| POST | /api/gyms/day-passes | gyms.ts | Purchase day pass |
| GET | /api/gyms/day-passes/:id | gyms.ts | Get day pass detail |
| POST | /api/gyms/day-passes/:id/redeem | gyms.ts | Redeem pass |
| GET | /api/gyms/:id/qr | gyms.ts | Generate gym QR code |

#### Challenges (/api/challenges)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| GET | /api/challenges | challenges.ts | List active challenges |
| POST | /api/challenges/:id/join | challenges.ts | Join challenge |
| POST | /api/challenges/:id/log-steps | challenges.ts | Log steps |
| GET | /api/challenges/:id/leaderboard | challenges.ts | Challenge leaderboard |

#### Gamification (/api/gamification)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| GET | /api/gamification/profile | gamification.ts | User gamification profile |
| GET | /api/gamification/points | gamification.ts | Points history |
| GET | /api/gamification/badges | gamification.ts | User badges |
| GET | /api/gamification/levels | gamification.ts | Level definitions |
| POST | /api/gamification/referral | gamification.ts | Submit referral code |
| GET | /api/gamification/leaderboard | gamification.ts | Global leaderboard |

#### Trainers (/api/trainers)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| POST | /api/trainers/register | trainers.ts | Register as trainer |
| GET | /api/trainers/dashboard | trainers.ts | Trainer stats |
| POST | /api/trainers/request-payout | trainers.ts | Request payout via Chapa |
| GET | /api/trainers/:code | trainers.ts | Lookup trainer by code |

#### Coach Passes (/api/coach-passes)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| POST | /api/coach-passes/sessions | coach-passes.ts | Create coaching session |
| GET | /api/coach-passes/sessions/mine | coach-passes.ts | Trainer's sessions |
| PATCH | /api/coach-passes/sessions/:id | coach-passes.ts | Update session |
| GET | /api/coach-passes/browse | coach-passes.ts | Browse available sessions |
| POST | /api/coach-passes/purchase | coach-passes.ts | Purchase coach pass |
| GET | /api/coach-passes/mine | coach-passes.ts | User's passes |
| GET | /api/coach-passes/:id | coach-passes.ts | Pass detail |
| POST | /api/coach-passes/:id/confirm | coach-passes.ts | Trainer confirms completion |
| GET | /api/coach-passes/trainer/bookings | coach-passes.ts | Trainer's bookings |

#### Buddies (/api/buddies)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| POST | /api/buddies/request | buddies.ts | Send buddy request |
| POST | /api/buddies/accept | buddies.ts | Accept buddy request |
| GET | /api/buddies/my-buddy | buddies.ts | Get current buddy |

#### Verification (/api/verify)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| POST | /api/verify/steps | verify.ts | Verify via step count |
| POST | /api/verify/qr | verify.ts | Verify via QR scan |
| POST | /api/verify/photo | verify.ts | Verify via photo proof |
| POST | /api/verify/buddy | verify.ts | Verify via buddy confirm |
| POST | /api/verify/gps | verify.ts | Verify via GPS proximity |
| GET | /api/verify/daily-summary | verify.ts | Daily verification summary |

#### AI Coach (/api/ai)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| POST | /api/ai/coach | ai.ts | Multi-turn AI fitness coach |

#### Admin (/api/admin)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| GET | /api/admin/stats | admin.ts | Platform-wide statistics |

### Error Handling Pattern

All endpoints return consistent shape:
  { "data": T | null, "error": string | null }

Status codes: 200 (success), 201 (created), 400 (validation), 401 (unauth), 403 (forbidden), 404 (not found), 500 (server error).

---

## 4. BOT (apps/bot)

| Item | Value |
|------|-------|
| Framework | Telegraf 4.16.0 |
| Mode | Long polling (bot.launch()) |
| Source files | 2 |
| Lines of code | 49 |

### Registered Commands

| Command | Handler | Purpose |
|---------|---------|---------|
| /start | commands/start.ts | Welcome message + "Open FitEqub" inline keyboard button |

### Mini App Launch

- Inline keyboard button with web_app: { url: TELEGRAM_MINI_APP_URL }
- Falls back to "being set up" message if URL not configured

### Notifications

Not implemented in bot. Notification logic exists in apps/api/src/lib/notifications.ts but inserts into Supabase notifications table — does not send Telegram messages.

---

## 5. DATABASE (Supabase)

### Project Info

| Item | Value |
|------|-------|
| Project ID | ufkkisleoimltqbnexpf |
| Region | eu-central-1 |
| URL | https://ufkkisleoimltqbnexpf.supabase.co |
| Client | @supabase/supabase-js (service role key, no session persistence) |
| Edge Functions | None deployed |

### Tables (21 total)

| Table | Columns | Rows | RLS |
|-------|---------|------|-----|
| users | 18 | 0 | OFF |
| equb_rooms | 28 | 5 | OFF |
| equb_members | 13 | 0 | OFF |
| equb_ledger | 11 | 0 | OFF |
| partner_gyms | 16 | 3 | OFF |
| day_passes | 10 | 0 | OFF |
| workouts | 15 | 0 | OFF |
| challenges | 10 | 3 | OFF |
| challenge_participants | 8 | 0 | OFF |
| points_ledger | 7 | 0 | OFF |
| badge_definitions | 10 | 18 | OFF |
| referrals | 7 | 0 | OFF |
| trainers | 16 | 0 | OFF |
| trainer_earnings | 8 | 0 | OFF |
| trainer_payouts | 8 | 0 | OFF |
| workout_verifications | 12 | 0 | OFF |
| workout_buddies | 6 | 0 | OFF |
| daily_verification_summary | 8 | 0 | OFF |
| gym_settlements | 13 | 0 | OFF |
| coach_sessions | 9 | 0 | OFF |
| coach_passes | 14 | 0 | OFF |

RLS Status: OFF on ALL 21 tables. Access control enforced at application layer via service role key + Telegram user validation.

### Database Functions (6)

| Function | Purpose |
|----------|---------|
| settle_equb() | Calculate payouts, distribute pot to qualified members |
| award_points() | Add points to user, update level |
| grant_badge() | Award badge to user |
| increment_completed_days() | Increment member workout counter |
| increment_trainer_balance() | Credit trainer pending balance |
| process_trainer_commissions() | Calculate and record trainer commissions |

### Indexes (71 total)

| Table | Index Count | Notable Indexes |
|-------|-------------|-----------------|
| users | 6 | telegram_id (btree + unique), referral_code (unique), last_active_at DESC |
| equb_rooms | 6 | status, type+status, type+tier, dates, invite_code (unique) |
| equb_members | 5 | equb_id+user_id (unique), equb+status composite |
| equb_ledger | 6 | equb_id, user_id, entry_type |
| day_passes | 5 | qr_token (unique + index), gym_id, user_id |
| workouts | 4 | user+date, date |
| workout_verifications | 3 | equb+user, user+verified_at |
| challenges | 2 | is_active+start_date |
| challenge_participants | 4 | challenge+user (unique), individual lookups |
| points_ledger | 3 | user_id, user+created_at DESC |
| trainers | 5 | affiliate_code (unique), user_id (unique), gym_id |
| trainer_earnings | 2 | trainer+created_at DESC |
| coach_sessions | 3 | trainer_id, active (partial WHERE true) |
| coach_passes | 4 | user_id, trainer_id, status |
| gym_settlements | 3 | gym+period_start, status |
| Others | 10 | PKs and unique constraints |

### Migrations (15)

| # | Version | Name |
|---|---------|------|
| 1 | 20260319222716 | create_fitequb_core_schema |
| 2 | 20260319222735 | create_settle_equb_function |
| 3 | 20260320092002 | create_increment_completed_days_rpc |
| 4 | 20260320102341 | add_paid_at_to_equb_ledger |
| 5 | 20260320103644 | update_settle_equb_zero_risk |
| 6 | 20260320103731 | add_gamification_system |
| 7 | 20260320105552 | add_tsom_equb_support |
| 8 | 20260320110214 | add_trainer_affiliate_system |
| 9 | 20260322191650 | add_room_types_tiers_and_seed_challenges |
| 10 | 20260322220805 | seed_launch_equb_rooms |
| 11 | 20260323051152 | add_workout_verification_system |
| 12 | 20260323064640 | add_gym_settlements_table |
| 13 | 20260323064953 | add_critical_performance_indexes |
| 14 | 20260323065042 | add_critical_performance_indexes |
| 15 | 20260323070614 | add_coach_sessions_and_passes |

---

## 6. AUTHENTICATION

### Telegram initData Validation

File: apps/api/src/middleware/telegram-auth.ts

1. Client sends Authorization: tma {initData} header on every request
2. Server extracts hash from initData URLSearchParams
3. Sorts remaining params alphabetically, joins with \n
4. Computes: secretKey = HMAC-SHA256("WebAppData", BOT_TOKEN)
5. Computes: hash = HMAC-SHA256(secretKey, dataCheckString)
6. Compares with timingSafeEqual from node:crypto
7. Extracts user JSON from initData, sets on Hono context

### Non-Telegram Users

- TelegramGate component on frontend shows a landing page with "Open in Telegram" button
- No web-based login — Telegram-only authentication
- Gym staff/dashboard routes (/gym-staff, /gym-dashboard) bypass TelegramGate

### Test Mode

| Layer | Activation | Behavior |
|-------|-----------|----------|
| Frontend | ?test=true URL param | Returns hardcoded QA_TEST_USER (telegram_id: 999999) |
| Backend | NODE_ENV=development + Authorization: tma test | Sets QA_TEST_USER in context, skips HMAC |

### Session Management

Stateless. Raw TMA initData is sent and re-validated on every API request. No JWTs, cookies, or session store.

---

## 7. PAYMENTS (Chapa)

### Configuration

| Item | Value |
|------|-------|
| Base URL | https://api.chapa.co/v1 (production) |
| Currency | ETB |
| Auth | Bearer token (CHAPA_SECRET_KEY) |
| Webhook header | x-chapa-signature |
| Webhook verification | HMAC-SHA256 + timingSafeEqual |

### Payment Flows

| Flow | tx_ref Format | Fee | Status Progression |
|------|--------------|-----|-------------------|
| Equb stake | equb-{roomId}-{userId}-{ts} | 5% house fee (on settlement) | pending -> active (on min members) |
| Day pass | daypass-{passId}-{ts} | None documented | pending -> active |
| Coach pass | coach-{passId}-{ts} | 20% platform fee | pending -> active -> confirmed -> completed |

### Webhook Processing (POST /webhooks/chapa)

1. Verify x-chapa-signature with HMAC-SHA256 + timing-safe comparison
2. Parse tx_ref prefix to determine payment type
3. Check idempotency (lookup existing record)
4. Verify amount matches database
5. Create ledger entry / update status
6. For equb: activate room if member_count >= min_members

### Payouts (Trainer Settlement)

- Endpoint: POST https://api.chapa.co/v1/transfers
- Bank code: "telebirr" (mobile money)
- Reference: trainer-payout-{trainerId}-{timestamp}
- Triggered via POST /api/trainers/request-payout

---

## 8. EXTERNAL SERVICES

| Service | Status | Details |
|---------|--------|---------|
| Supabase | Active | Project ufkkisleoimltqbnexpf, eu-central-1 |
| Sentry | Configured | @sentry/node + @sentry/react v10.45.0. Conditional init (only if DSN set). 10% trace sample rate. |
| Chapa | Active | Production API (api.chapa.co/v1). HMAC webhook verification. |
| Google Gemini | Active | Model: gemini-2.5-flash. AI Coach feature. Max 256 tokens, temp 0.8, multi-turn (last 10 msgs). Personalized. |
| n8n | Not found | No n8n webhook URLs or workflows detected in codebase |
| Cloudflare | Not found | No Workers, Pages, or DNS config in codebase |
| ElevenLabs | Not found | No imports or API calls detected |

---

## 9. DEPLOYMENT

### Docker

| Service | Base Image | Port | Health Check |
|---------|-----------|------|-------------|
| web | Node 20 Alpine (build) + nginx (serve) | 80 | — |
| api | Node 20 Alpine (multi-stage) | 3000 | GET /health every 30s |
| bot | Node 20 Alpine (multi-stage) | — | — |

docker-compose.yml runs all 3 services, loads .env, restart: unless-stopped.

### Vercel (Backup)

- Config: apps/web/vercel.json
- Build: pnpm --filter shared build && pnpm --filter web build
- Framework: Vite
- SPA rewrites: all paths -> /index.html

### Coolify

- Primary deployment target (per CLAUDE.md)
- No Coolify-specific config files in repo
- Auto-deploy from main branch (configured externally)

### Environment Variables

  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
  CHAPA_PUBLIC_KEY, CHAPA_SECRET_KEY, CHAPA_ENCRYPTION_KEY, CHAPA_WEBHOOK_SECRET, CHAPA_WEBHOOK_URL
  TELEGRAM_BOT_TOKEN, TELEGRAM_MINI_APP_URL
  SENTRY_DSN
  GEMINI_API_KEY
  QR_SECRET
  ADMIN_TELEGRAM_ID
  API_URL, PORT, NODE_ENV, CRON_SECRET

---

## 10. TESTING

### Unit Tests

| Framework | Config | File |
|-----------|--------|------|
| Vitest 4.1.0 | vitest.config.ts | tests/unit.test.ts |

20 test cases:

| Suite | Tests | Coverage |
|-------|-------|----------|
| Settlement math | 4 | Payout calculations, zero qualified, free equb, total preservation |
| Chapa webhook HMAC | 3 | Valid sig, invalid sig, tampered body |
| Telegram initData | 4 | Valid data, wrong token, missing hash, tampered user |
| Level system | 5 | All level thresholds (Starter -> Legend) |
| Transaction ref parsing | 4 | Equb, daypass, unknown, empty |

### E2E Tests

| Framework | Config | File |
|-----------|--------|------|
| Playwright 1.58.2 | playwright.config.ts | e2e/visual.spec.ts |

- Base URL: https://fitequb.com
- Viewport: 393x852 (mobile)
- Screenshot on failure
- 30s timeout

### Test Coverage

Not measured — no coverage configuration or thresholds set.

### CI/CD

- GitHub Actions (.github/workflows/ci.yml)
- Triggers on: PRs to main
- Pipeline: Lint -> Typecheck -> Build -> Test
- Node 20, pnpm 9, frozen lockfile
- Uses fake API keys for CI (no real secrets)

---

## 11. DESIGN SYSTEM

### Stitch MCP

Not connected. No .stitch/ directory or Stitch design tokens found.

### Design Tokens

Defined in tailwind.config.js as Tailwind theme extensions (not a separate tokens file).

### Fonts

| Font | Loaded | Source |
|------|--------|--------|
| Epilogue (700-900) | Yes | Google Fonts CDN |
| Manrope (400-700) | Yes | Google Fonts CDN |
| Space Grotesk (400-700) | Yes | Google Fonts CDN |
| Material Symbols Outlined | Yes | Google Fonts CDN |
| Material Symbols Rounded | Yes | Google Fonts CDN |

### Custom CSS Classes

| Class | Effect |
|-------|--------|
| .glass-card | Semi-transparent card with backdrop blur |
| .glass | Glass morphism variant |
| .neon-glow | Green glow box shadow |
| .gold-glow | Gold glow box shadow |

---

## 12. AUTOMATION (n8n)

No n8n integration found. No webhook URLs, workflow configs, or n8n references in the codebase.

Cron-style operations are handled via API endpoints protected by CRON_SECRET:

| Endpoint | Purpose |
|----------|---------|
| POST /cron/settle | Settle expired equb rooms |
| POST /cron/reminders | Send workout reminders |
| POST /cron/payouts | Process trainer payouts |
| POST /cron/daily-reset | Reset daily verification summaries |

These require an external scheduler (Coolify cron, GitHub Actions, or external cron service) to trigger.

---

## 13. SECURITY

### Cryptographic Verification

| Check | Location | Method |
|-------|----------|--------|
| Telegram initData | middleware/telegram-auth.ts:70 | HMAC-SHA256 + timingSafeEqual |
| Chapa webhook | lib/chapa.ts:92 | HMAC-SHA256 + timingSafeEqual |
| Cron secret | routes/cron.ts:16 | timingSafeEqual on Buffer |

### Access Control

| Control | Status |
|---------|--------|
| HMAC on Telegram auth | Yes |
| HMAC on Chapa webhooks | Yes |
| Timing-safe comparison | Yes (all 3 locations) |
| Rate limiting | Yes — verification endpoints only (10 attempts/user/day) |
| Body size limit | Yes — 5 MB global |
| CORS | Yes — restricted to TELEGRAM_MINI_APP_URL or fitequb.com |
| RLS on database | No — OFF on all 21 tables |
| Secrets in source | No — all via env vars |
| .env.example | Yes — exists with placeholder values |
| .gitignore | Yes — excludes .env, node_modules, dist |

### Security Gaps

1. RLS disabled on all tables — relying entirely on service role + app-layer auth
2. QR_SECRET default value in .env.example: fitequb-qr-secret-change-in-production
3. Rate limiting only on verification endpoints — no rate limiting on auth, payment init, or other sensitive routes
4. No input sanitization library — relying on Zod validation and Supabase parameterized queries
5. Admin gate checks ADMIN_TELEGRAM_ID env var — single admin user only

---

## 14. PERFORMANCE

### Frontend

| Metric | Value |
|--------|-------|
| Main bundle (gzipped) | 72.27 KB |
| Total precache | 420.30 KB |
| Code splitting | Yes — React.lazy on 22/27 routes |
| Lazy loading | Yes — Suspense with RouteLoading fallback |
| Image optimization | No — no next/image or vite-imagetools |
| Font strategy | Google Fonts CDN with preconnect |
| Service worker | Yes — Workbox auto-generated |

### Backend

| Metric | Value |
|--------|-------|
| Database indexes | 71 |
| Connection pooling | Supabase default (no custom config) |
| Caching | None (no Redis, no in-memory cache) |
| Query optimization | Indexes on all FK columns and common lookups |

---

## 15. FEATURE INVENTORY

| Feature | Status | Frontend | Backend | Notes |
|---------|--------|----------|---------|-------|
| Equb Rooms | Working | EqubList, EqubDetail, CreateEqub | equb-rooms.ts | Create, list, join, detail. 5 rooms seeded. |
| Join Equb (payment) | Working | Payment.tsx | equb-rooms.ts + chapa.ts | Chapa payment init + webhook callback |
| Quick Join | UI only | QuickJoin.tsx | No dedicated endpoint | Frontend form exists, no matching API |
| Gym Day Passes | Working | GymList, DayPassDetail | gyms.ts | Purchase, view, redeem via QR |
| QR Check-in | Working | GymQrCheckin.tsx | gym-public.ts | Gym staff scans QR to verify pass |
| Gym Dashboard | Working | GymDashboard.tsx | gym-public.ts | Pass stats for gym owners |
| Gym Staff | Partially working | GymStaff.tsx | gym-public.ts | QR scanner page, public route |
| Step Challenges | Working | ChallengeList, Leaderboard | challenges.ts | Join, log steps, leaderboard. 3 challenges seeded. |
| Duel Challenge | UI only | DuelChallenge.tsx | No dedicated endpoint | Frontend UI exists, no 1v1 duel API |
| Verification: Steps | Working | VerifyWorkout.tsx | verify.ts | Step count verification with rate limiting |
| Verification: QR | Working | VerifyWorkout.tsx | verify.ts | QR scan at gym |
| Verification: Photo | Working | VerifyWorkout.tsx | verify.ts | Photo proof upload |
| Verification: Buddy | Working | VerifyWorkout.tsx | verify.ts | Buddy confirmation |
| Verification: GPS | Working | VerifyWorkout.tsx | verify.ts | GPS proximity to gym |
| AI Coach | Working | AiCoach.tsx | ai.ts | Gemini 2.5 Flash, multi-turn, personalized |
| Coach Marketplace | Working | CoachList.tsx | coach-passes.ts | Browse sessions, purchase passes |
| Buddy System | Partially working | — (no dedicated page) | buddies.ts | API exists (request, accept, get), no standalone UI |
| Streak Tracking | Partially working | Profile.tsx (display) | cron.ts (daily-reset) | streak_days on users table, reset logic in cron |
| Badges | Partially working | Profile.tsx (display) | gamification.ts | 18 badge definitions seeded, display-only |
| Referrals | Working | Profile.tsx | gamification.ts | Submit referral code, earn points |
| Leaderboard | Working | Leaderboard.tsx | gamification.ts | Global points leaderboard |
| Trainer Dashboard | Working | TrainerDashboard.tsx | trainers.ts | Register, stats, request payout |
| Gym Owner Dashboard | Working | GymDashboard.tsx | gym-public.ts | Day pass stats, revenue |
| Admin Dashboard | Working | AdminDashboard.tsx | admin.ts | Platform-wide stats |
| Profile | Working | Profile.tsx | gamification.ts | Points, level, badges, referral code |
| Onboarding | Working | Onboarding.tsx | — | 3-step onboarding flow (client-side) |
| How It Works | Working | HowItWorks.tsx | — | Explainer page (client-side) |
| Payment | Working | Payment.tsx | webhooks.ts + chapa.ts | Chapa checkout redirect + webhook |
| Settlement | Working | — | cron.ts + settle_equb() | Cron-triggered equb pot distribution |
| Win Celebration | UI only | WinCelebration.tsx | — | Celebration animation, no trigger logic |
| Notifications | Partially working | Notifications.tsx | notifications.ts | DB-based notifications, no push/Telegram messages |
| Sync Fitness | UI only | SyncFitness.tsx | — | UI for Google Fit/Apple Health sync, no integration |
| Log Workout | Working | LogWorkout.tsx | workouts.ts | Manual workout logging |
| Tsom (Fasting) Mode | Partially working | — (toggle in profile) | equb-rooms.ts | tsom_mode on users, tsom equb rooms with reduced targets |

### Feature Summary

| Status | Count |
|--------|-------|
| Working | 22 |
| Partially working | 6 |
| UI only (no backend) | 4 |
| Not started | 0 |
| Total features | 32 |

---

## Appendix: Key File Locations

| File | Purpose |
|------|---------|
| apps/web/src/App.tsx | Route definitions + lazy loading |
| apps/web/src/hooks/useAuth.ts | Frontend auth + test mode |
| apps/web/src/lib/api.ts | API client with TMA auth header |
| apps/web/src/index.css | Tailwind directives + custom classes |
| apps/web/tailwind.config.js | Design tokens / color palette |
| apps/web/vite.config.ts | Vite + PWA config |
| apps/api/src/index.ts | Server entry + middleware stack |
| apps/api/src/middleware/telegram-auth.ts | HMAC initData validation |
| apps/api/src/lib/chapa.ts | Chapa payment client + webhook verification |
| apps/api/src/lib/supabase.ts | Supabase client (service role) |
| apps/api/src/routes/webhooks.ts | Chapa webhook handler |
| apps/api/src/routes/cron.ts | Cron jobs (settle, reminders, payouts, reset) |
| apps/bot/src/index.ts | Bot entry (Telegraf polling) |
| packages/shared/src/types/index.ts | All TypeScript interfaces |
| packages/shared/src/constants/index.ts | Constants + level system |
| supabase/migrations/ | 15 migration files |
| .github/workflows/ci.yml | CI pipeline |
| docker-compose.yml | Local Docker setup |
