# FitEqub — Knowledge Base

## Domain: Ethiopian Equb System
Traditional Ethiopian rotating savings group. Members contribute a fixed amount regularly, and one member takes the full pot each round. FitEqub adapts this: instead of rotating payouts, the pot is split among members who hit their fitness goals. Those who don't meet the threshold lose their stake to the winners.

## Business Logic

### Equb Lifecycle
1. **Created** (`pending`) — creator sets stake, duration, targets
2. **Filling** (`pending`) — members join and pay stake via Chapa
3. **Activated** (`active`) — min_members reached, start_date hit, workouts begin
4. **Running** (`active`) — daily workout logging for duration (default 30 days)
5. **Settling** (`settling`) — end_date reached, `settle_equb()` runs
6. **Settled** (`settled`) — payouts distributed, room archived
7. **Cancelled** (`cancelled`) — min_members not reached by start_date, stakes refunded

### Settlement Math
```
total_pot = sum of all member stakes + sponsor_prize (if any)
house_fee = total_pot * 0.05 (peer-funded only, 0 for sponsored)
distributable = total_pot - house_fee
qualified = members where completed_days >= workout_target * completion_pct
payout_per_winner = distributable / count(qualified)
```

If everyone qualifies: each gets `stake - (stake * 0.05)` back.
If nobody qualifies: house takes all (edge case — unlikely).

### Workout Verification Priority
1. QR gym check-in (scans partner gym QR code)
2. Manual step count entry
3. Photo proof upload
4. GPS proximity (optional, supplementary)

One workout per day per member. Multiple verification types can coexist but only count as 1 day.

### Day Pass Flow
- User pays `app_day_pass` price (what they see in TMA)
- We pay gym `day_pass_cost` (our negotiated rate)
- Margin = `app_day_pass - day_pass_cost`
- QR token generated on purchase, expires in 15 minutes
- Visual confirmation by gym staff (no scanner needed for MVP)
- Pass statuses: `active` → `redeemed` or `expired`

### Step Challenge
- Free to participate — no stakes
- Manual daily step count entry
- Public leaderboard
- Sponsored rewards (not money)
- Purpose: top-of-funnel acquisition into paid Equbs

## Growth Loop
```
Step Challenge (free) → User sees Equb rooms → Joins paid Equb → Buys gym day pass
     ↑                                                                    │
     └──────────────── Social sharing / word of mouth ←───────────────────┘
```

## Financial Rules
- All money in ETB (Ethiopian Birr)
- Chapa handles: Telebirr, M-Pesa, CBE Birr, Visa/Mastercard
- Ledger is append-only — never modify or delete entries
- Every money movement = ledger entry (stake, payout, fee, refund, day_pass_purchase)
- Payouts via Chapa Transfer API to mobile wallets
- 5% house fee on peer Equbs, 0% on sponsored

## Target Market
- Young professionals 20-35 in Addis Ababa
- Neighborhoods: Bole, Sarbet, CMC
- Already on Telegram (high adoption in Ethiopia)
- Price-sensitive but willing to stake small amounts for accountability
- Fitness-curious but struggle with consistency

## Supabase Schema Reference
| Table | Key Columns |
|-------|------------|
| users | id, telegram_id, full_name, username, phone, created_at |
| equb_rooms | id, name, creator_id, stake_amount, duration_days, workout_target, completion_pct, status, start_date, end_date, sponsor_prize |
| equb_members | id, room_id, user_id, joined_at, completed_days, qualified |
| equb_ledger | id, room_id, user_id, type, amount, tx_ref, created_at |
| partner_gyms | id, name, location, lat, lng, day_pass_cost, app_day_pass, active |
| day_passes | id, user_id, gym_id, qr_token, status, purchased_at, expires_at, redeemed_at |
| workouts | id, user_id, room_id, type, proof_url, step_count, lat, lng, logged_at |
| challenges | id, name, description, start_date, end_date, reward_description |
| challenge_participants | id, challenge_id, user_id, total_steps, last_logged_at |
