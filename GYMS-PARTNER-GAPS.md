# Gym Partner Experience — Gap Analysis

> What's missing for a gym owner (e.g. Infinity Fitness, Bole) to say "yes, let's partner with FitEqub."

## What Works Today

| Feature | Status | Notes |
|---------|--------|-------|
| Gym listing with pricing | Done | GET /api/gyms returns active gyms |
| Day pass purchase via Chapa | Done | Creates pass, redirects to Chapa checkout |
| QR token display + 15-min expiry | Done | DayPassDetail shows token + countdown |
| QR check-in verification | Done | POST /verify/qr — daily SHA256 hash per gym |
| GPS proximity verification | Done | POST /verify/gps — within 50m of gym lat/lng |
| Day pass redemption endpoint | Done | POST /api/gyms/day-passes/:id/redeem |
| Platform admin sees total day pass revenue | Done | AdminDashboard aggregates all pass sales |
| Chapa webhook processes payment | Done | HMAC-verified, marks pass as active |

## Critical Gaps (Must-Have for Launch)

### 1. No Gym Owner Dashboard

Gym owners have zero visibility into FitEqub activity at their gym.

What's needed:
- Authenticated gym owner role (separate from Telegram user auth)
- Dashboard: passes sold today/week/month, revenue earned, redemption rate
- Real-time notification when a pass is purchased
- List of active passes (so staff knows who to expect)

Effort: Medium — Admin dashboard pattern exists, needs gym-scoped version.

### 2. No Gym Settlement / Payout System

All day pass revenue currently stays with FitEqub. Gyms never get paid.

Current state:
- partner_gyms has day_pass_cost (gym's cost) and app_day_pass (user price)
- Margin = app_day_pass - day_pass_cost — never distributed
- initiateTransfer() exists in Chapa lib but never called for gyms
- Trainer payout system exists and could be templated

What's needed:
- gym_settlements table (gym_id, period, amount, status, chapa_tx_ref)
- Automated or manual settlement trigger (weekly/monthly)
- POST /api/gyms/:id/request-payout endpoint
- Settlement history visible to gym owner

Effort: Medium — Chapa transfer + trainer payout pattern already exist.

### 3. No Gym Staff Verification Tool

When a user shows a QR token, gym staff has no tool to verify it.

Current flow:
- User sees a UUID string on DayPassDetail — not a scannable QR image
- Staff must call POST /api/gyms/day-passes/:id/redeem somehow
- No staff-facing app or web page exists

What's needed:
- Staff-facing page at /gym-staff/verify — enter or scan QR token
- Validates token, shows user name + pass status + expiry
- One-tap redeem button
- Works on any phone browser (no app install)

Effort: Low-Medium — Simple page + one API call.

### 4. QR Code is Not Actually Scannable

DayPassDetail displays qr_token UUID as plain text. No actual QR code image.

What's needed:
- Integrate qrcode.react or similar
- Encode qr_token into scannable QR image
- Staff scans → hits verify/redeem endpoint

Effort: Low — one npm package + component swap.

## Important Gaps (Needed Before Scale)

### 5. No Per-Gym Analytics

Admin dashboard shows platform totals only. Cannot answer "how many passes did Infinity Fitness sell this month?"

What's needed:
- GET /api/admin/gyms/:id/stats — passes sold, redeemed, expired, revenue by period
- Filter by date range
- Redemption rate (% purchased passes actually used)

Data exists: day_passes table has gym_id, status, purchased_at, redeemed_at — needs aggregation queries.

### 6. No Gym Onboarding Flow

Adding a new gym requires direct Supabase database inserts. No self-service.

What's needed:
- Gym registration form or admin tool
- Collect: name, location, GPS coordinates, pricing, bank details
- Logo/photo upload for listing
- Activation/deactivation toggle

### 7. No Gym Notifications

Gyms don't know when passes are purchased or when users are coming.

What's needed:
- SMS or Telegram notification to gym contact when pass is bought
- Daily summary: "3 passes sold today, 2 redeemed, 1 pending"
- Optional: email digest

### 8. QR Check-In Security Concern

Daily gym QR = SHA256(gymId + date + secret).slice(0,12). Deterministic — same QR valid all day. A user could photograph and share it with friends who never visited.

Mitigation options:
- Rotate QR every 15-30 minutes (use time bucket in hash)
- Require GPS + QR combo (both already exist — combine them)
- Rate limit: one QR check-in per user per gym per day (partially exists)
- Staff-initiated check-in (staff scans user's pass instead)

### 9. No Gym Profile / Marketing Page

GymList shows name, location, price. No photos, amenities, hours, or reviews.

What's needed:
- Gym detail page with photos, equipment, hours, map
- User ratings/reviews
- Facilities tags (cardio, weights, sauna, parking)

## Nice-to-Have (Post-Launch)

- Bulk pass packages (5/10/30-day bundles at discount)
- Membership integration (monthly gym membership via FitEqub)
- Gym leaderboard ("most active gym this month")
- Trainer assignment (gym assigns trainer to day-pass user)
- Revenue sharing tiers (higher volume = better commission)
- Gym-branded challenges (gym sponsors an Equb)
- Multi-branch support (one chain, multiple locations)

## Architecture Readiness

The codebase is well-positioned:
- Auth: gym owner role via user_type field or gym_owners table
- Payments: initiateTransfer() handles payouts — trainer system is a template
- Ledger: immutable append-only, all financial data auditable
- Data model: partner_gyms already has margin fields (day_pass_cost vs app_day_pass)
- Admin pattern: AdminDashboard + admin.ts route can be cloned for gym-scoped views

## Priority Order

1. QR code image (low effort, blocks everything else)
2. Gym staff verify/redeem page (low-medium, needed for real usage)
3. Gym owner dashboard (medium, the "sales pitch" feature)
4. Settlement system (medium, gyms need to get paid)
5. Gym notifications (low, improves partner experience)
6. Per-gym analytics (low, data already exists)
7. QR rotation (low, security hardening)
8. Gym onboarding (medium, needed at 10+ gyms)
9. Gym profile pages (medium, improves user experience)
