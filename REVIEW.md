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
