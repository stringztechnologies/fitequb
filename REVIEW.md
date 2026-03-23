# FitEqub — Review Checklist

## Code Review Gates

### Every PR
- [ ] TypeScript strict — no `any`, no `as` casts without comment
- [ ] Biome lint passes clean
- [ ] Biome format passes clean
- [ ] `pnpm build` succeeds for affected apps
- [ ] Conventional commit message
- [ ] No .env or secrets in diff
- [ ] No console.log left in (use Sentry or structured logging)

### API Routes (Hono)
- [ ] Input validated with Zod schema
- [ ] Returns `{ data, error }` response shape
- [ ] Auth middleware applied (Telegram initData validation)
- [ ] Error responses use correct HTTP status codes
- [ ] No raw SQL — use Supabase client
- [ ] Chapa webhook HMAC verified before processing

### Financial Operations
- [ ] All money operations create `equb_ledger` entry
- [ ] Ledger entries are append-only (never update/delete)
- [ ] Amounts validated: positive, within min/max range
- [ ] Chapa tx_ref is unique per transaction
- [ ] Settlement math verified: house_fee + payouts = total_pot
- [ ] Idempotent — reprocessing same webhook doesn't double-credit

### TMA Frontend
- [ ] Uses @telegram-apps/sdk-react hooks (not raw window.Telegram)
- [ ] Theme colors from Telegram (not hardcoded)
- [ ] MainButton/BackButton used for primary actions
- [ ] Haptic feedback on key interactions
- [ ] Loading states for all async operations
- [ ] Error states displayed to user
- [ ] Mobile-first — tested at 375px width minimum

### Telegram Bot
- [ ] initData validation on every TMA request
- [ ] Bot commands registered with BotFather
- [ ] Deep links work (open specific TMA screen)
- [ ] Notification messages are concise and actionable
- [ ] No sensitive data in bot messages (no amounts in group chats)

### Supabase
- [ ] RLS policies active on all tables
- [ ] Service role key only used server-side
- [ ] Anon key only used client-side with RLS
- [ ] No direct table access without going through API

### Security
- [ ] Telegram initData HMAC validated on every API request
- [ ] Chapa webhook HMAC validated before processing
- [ ] No user-controlled data in SQL (parameterized queries via Supabase client)
- [ ] QR tokens are cryptographically random (crypto.randomUUID or similar)
- [ ] Day pass QR expires after 15 minutes
- [ ] Rate limiting on payment endpoints
- [ ] CORS configured — only TMA origin allowed

## Architecture Enforcement
- [ ] Frontend code only in `apps/web/`
- [ ] Backend code only in `apps/api/`
- [ ] Bot code only in `apps/bot/`
- [ ] Shared types in `packages/shared/`
- [ ] No cross-app imports (only via shared package)
- [ ] No business logic in frontend — API handles all mutations

---

## Performance Audit — Scale Readiness (10K–50K Users)

**Date:** 2026-03-23

### DATABASE — Critical N+1 Patterns

| Location | Severity | Issue |
|----------|----------|-------|
| `cron.ts /cron/daily-reset` | **CRITICAL** | 2 queries per user (SELECT + UPDATE), iterates ALL users. 10K users = 20K sequential queries. Will timeout. |
| `cron.ts /cron/settle` | **HIGH** | Sequential `settle_equb()` RPC + `award_points` per member per room. 10 rooms × 20 members = 240+ queries. |
| `cron.ts /cron/reminders` | **HIGH** | 2 queries per room + 1 Telegram HTTP call per member. No batching. |
| `cron.ts /cron/payouts` | **MEDIUM** | 1 Chapa transfer + 1 DB update per payout, sequential. |

**Fix:** Replace daily-reset loop with single Postgres function. Batch award_points into array RPC. Add p-limit concurrency for reminders.

### Missing Database Indexes

| Table.Column | Priority | Used By |
|--------------|----------|---------|
| `users.telegram_id` (UNIQUE) | **CRITICAL** | Every authenticated request |
| `workouts(user_id, room_id, logged_at)` | **HIGH** | Workout dedup check |
| `workout_verifications(user_id, verified_at)` | **HIGH** | Rate limit check |
| `daily_verification_summary(user_id, date)` | **HIGH** | Read+write on every verify |
| `equb_rooms.status` | **MEDIUM** | List, cron settle, reminders |
| `users.total_points` | **MEDIUM** | Leaderboard ORDER BY |

### Settlement Concurrency Risk
- No application-level idempotency guard before `settle_equb()` RPC
- Double cron trigger could double-settle rooms
- **Fix:** Add `WHERE status = 'active'` pre-check + ensure Postgres function uses `SELECT ... FOR UPDATE`

### Unbounded Admin Queries
- `equb_rooms` and `equb_ledger` fetched with no LIMIT in admin stats — will OOM at scale
- **Fix:** Add `.limit(1000)` and aggregate via Postgres functions

### FRONTEND — Bundle & Performance

| Issue | Severity | Impact |
|-------|----------|--------|
| Zero `React.lazy()` — 20 pages eagerly imported | **CRITICAL** | Single monolithic bundle |
| Two Material Symbols variable fonts (full axis) | **HIGH** | 400–600KB font download |
| No React Query/SWR — every mount = fresh fetch | **HIGH** | Duplicate API calls, no caching |
| `@sentry/react` imported but never initialized | **MEDIUM** | ~100KB dead weight |
| No `<link rel="preconnect">` for Google Fonts | **MEDIUM** | +1-2 RTTs |
| Telegram SDK blocking `<script>` (no defer) | **MEDIUM** | Blocks HTML parsing |

**Estimated first load:** 500KB+ JS + 600KB+ fonts = 1.1MB+ (5-10s on Ethiopian 3G)

### API — No Rate Limiting or Caching

- **ZERO rate limiting** on any endpoint (except soft 10/day verify cap)
- **ZERO response caching** — no HTTP headers, no in-memory, no Redis
- AI coach: no per-user limit, no Gemini timeout, no queuing
- Photo verify: no body size limit — can receive 50MB+ base64 payloads
- No API response compression (hono/compress)

### VERIFICATION SYSTEM

- Photo upload has no size limit (only `z.string().min(100)`, no max)
- GPS 200m radius is reasonable but may fail on cheap Android phones indoors — consider 300m
- Rate limit is DB-backed (slow) — add in-memory fast path

### DEPLOYMENT — Infrastructure

| Component | Current | Required for 50K |
|-----------|---------|-----------------|
| Supabase | Free tier (500MB DB, 5GB bandwidth) | **Pro tier** ($25/mo) — free tier will be exceeded |
| CDN | None | **Cloudflare free tier** — Nairobi PoP for Addis users |
| VPS | Unknown | Min 4 vCPU / 8GB RAM |
| Redis | None | **Upstash** for rate limiting + caching |
| Frontend Sentry | Not initialized | Initialize or remove `@sentry/react` |
| Web healthcheck | Missing from Dockerfile | Add for Coolify failure detection |
| Schema migrations | Not version-controlled | Add `supabase/migrations/` |

### Quick Wins Applied
- [x] Route code splitting — `React.lazy()` for 10 infrequent routes
- [x] Font preconnect hints in index.html
- [x] Telegram SDK `defer` attribute
- [x] 5MB body size limit on API
- [x] Sentry tracesSampleRate reduced from 1.0 to 0.1

### Priority Roadmap

**P0 — Before 1,000 Users:** Database indexes, API rate limiting
**P1 — Before 10,000 Users:** React Query, in-memory cache, rewrite cron as Postgres functions, Supabase Pro, Cloudflare CDN
**P2 — Before 50,000 Users:** Redis, Gemini queuing, admin pagination, structured logging, VPS scaling, migration version control

---

## Security Audit — 2026-03-21

**Auditor:** Security Engineer (Claude Opus 4.6)
**Scope:** Full codebase — apps/api, apps/web, apps/bot, packages/shared

### Summary

| Severity | Count |
|----------|-------|
| **P0 (Critical)** | 5 |
| **P1 (High)** | 8 |
| **P2 (Medium)** | 9 |
| **Total** | 22 |

### P0 — Critical (all fixed)

| ID | Area | File | Issue | Status |
|----|------|------|-------|--------|
| SEC-001 | Auth | `middleware/telegram-auth.ts:25-29` | `Authorization: tma test` bypasses HMAC, authenticates as QA_TEST_USER (999999) in production | FIXED |
| SEC-002 | Auth | `routes/admin.ts:8` | QA user 999999 hardcoded in ADMIN_IDS — combined with SEC-001, full admin access for anyone | FIXED |
| SEC-003 | Auth | `middleware/telegram-auth.ts:67` | HMAC uses `===` not `timingSafeEqual` — timing attack enables auth forgery | FIXED |
| SEC-004 | Payments | `lib/chapa.ts:89-90` | Chapa webhook HMAC uses `===` — timing attack enables payment forgery | FIXED |
| SEC-005 | Payments | `routes/webhooks.ts:63-77` | Webhook records `payload.amount` without verifying against `room.stake_amount` | FIXED |

### P1 — High (backlog)

| ID | Area | File | Issue |
|----|------|------|-------|
| SEC-006 | Verification | `routes/verify.ts:7`, `lib/qr.ts:3` | QR_SECRET hardcoded fallback `"fitequb-qr-secret-v1"` |
| SEC-007 | Verification | `routes/verify.ts:268-316` | No `userId === buddy_user_id` self-confirmation guard |
| SEC-008 | General | `index.ts` | No rate limiting middleware on any endpoint |
| SEC-009 | Payments | `routes/webhooks.ts:52-77` | Race condition: ledger+member in `Promise.all` without transaction |
| SEC-010 | Verification | `routes/verify.ts:319-358` | GPS accepts raw lat/lng, gym coords public — trivial spoofing |
| SEC-011 | Verification | `routes/verify.ts:127-152` | Step counts self-reported, no fitness API validation |
| SEC-012 | Auth | `middleware/telegram-auth.ts:54-68` | No `auth_date` expiry check — tokens replayable forever |
| SEC-013 | Auth | `middleware/telegram-auth.ts:48` | `JSON.parse(user)` cast without Zod validation |

### P2 — Medium (backlog)

| ID | Area | Issue |
|----|------|-------|
| SEC-014 | General | CORS origin env var not validated |
| SEC-015 | General | Gemini API key in URL query parameter |
| SEC-016 | Auth | Admin ID defaults to 0 when env var missing |
| SEC-017 | Verification | No photo deduplication (same image resubmittable) |
| SEC-018 | Verification | Workout dedup window has 1-second gap at 23:59:59 |
| SEC-019 | General | Hono logger logs Authorization headers |
| SEC-020 | General | No Zod validation on referral code input |
| SEC-021 | Settlement | Trainer payout race condition (no atomic decrement) |
| SEC-022 | General | Sentry tracesSampleRate at 100% in production |
