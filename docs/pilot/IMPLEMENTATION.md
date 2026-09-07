# Paid pilot implementation checkpoint

Approved scope: full paid pilot, 300 ETB program fee + 500 ETB stake defaults, 20 members, 30 days, 10/12 attendance qualification. Full refund before start; after start voluntary withdrawal follows attendance rules. Operator cancellation returns stakes plus undelivered service.

Branch: `feat/paid-pilot`; review base: `42be89ffeaf5374aed250a75e638a3ad3eaa2459`.

Test seams authorized in the implementation plan: real database money/attendance RPCs, API routes with Chapa mocked at the network boundary, Telegram/web browser journeys.

2026-09-06 read-only production check: original v1 `equb_members.equb_id` / `equb_ledger.entry_type` remain. No `payment_intents` columns; latest applied migration is `20260403091652 add_web_auth_columns`. July S2 and money migrations are NOT applied. No production mutations performed. Do not infer row counts from the old snapshot.

Isolated PostgreSQL cluster used `/tmp/fitequb-pilot.9QJdD2`, port 55439, database `fitequb_pilot_test`. PostgreSQL/PostgREST were stopped and this 148 MiB scratch directory, downloaded tools and pilot browser output were removed after validation. Pre-existing build directories and review documents were preserved. Free disk: 60 GiB at start; 59 GiB before cleanup.

Milestones:
- [x] Forward migration, pilot configuration and staff access
- [x] Combined enrollment, refunds, payout verification
- [x] Authoritative attendance and settlement
- [x] Participant and operator UI, auth returns
- [x] GTM records, operating docs, integration/browser tests
- [x] Standards/spec review and implementation checks
- [x] Feature commits
- [x] Scratch cleanup

Production checkout stays disabled. Actual partner, merchant acceptance, customer pricing acceptance, funding, and live launch are operational gates, not implied by passing code tests.

## Acceptance scope for the implementation review

This file records the approved user plan; RUNBOOK.md carries the operational terms.

1. Deliver invitation → enrollment → combined service/stake payment → staff-approved attendance → settlement → verified transfer → a new paid renewal. Defaults: one gym/coach, 20 minimum/maximum, 30 days, 12 target days, 80% (ceil = 10), 300 ETB service + 500 ETB stake, 800 upfront, 5% fee on forfeited stakes. Gym membership excluded; prices are unvalidated assumptions.
2. Inspect production history read-only. Rehearse S2 only if its current-data emptiness guards permit it; never replay destructive reconciliation against populated tables. Apply the new forward migration after a compatible baseline. One pilot configuration per room, assigned staff internal IDs, both existing auth methods, API-only RLS/service RPCs, append-only ledger/audit, freeze commercial rules on first credit, checkout disabled until configured and ready.
3. One server-priced pilot_enrollment intent with immutable fee/stake split and provider reference. Credit all components and member atomically after exact successful ETB amount/reference verification. Serialize capacity. Reuse unresolved attempts; ambiguous initialization must not start another charge. Wrong/late/duplicate/overcapacity receipts create no membership and enter operator refund review.
4. Add program_fee/program_refund/payment_refund ledger vocabulary; refund remains stake return. Link components uniquely to receipt. Fees are excluded from prize pots and forfeiture-based affiliate commissions. Report program collections, refunds, stake balances, payout obligations and actual/estimated operating costs separately.
5. Remain pending until scheduled start. Cancel underfilled at deadline with full refunds. Pre-start withdrawal returns both once and blocks delayed credit. After start voluntary/illness withdrawal retains fee and stakes follow attendance. Operator cancellation returns remaining stakes and cents-rounded fee for unserved time. Refund jobs have deterministic references and confirmed delivery status; refund initiation/finality cannot later become enrollment.
6. Resolve payout codes from Chapa bank list; collect account details before checkout. Verify transfers through the provider endpoint. Submitted/pending/unparseable/timeouts are not delivered or retryable. Only confirmed failure permits retry. Keep unresolved results visible.
7. Attendance is unique per member/room/EAT calendar date, timestamps UTC, assigned staff current-day only, admin corrections require reasons before settlement; no self approval. Audit all corrections. SQL qualification derives approved attendance, never cached counters. Block workout, increment RPC and daily-reset bypasses. Activity can remain personal. Disputes accepted through end+24h; SQL settlement waits until that deadline and all disputes resolved; explicit hold supported. No duplicate settlement money; deterministic allocation conserves cents for all/mixed/no winners.
8. `/pilot/:roomId` displays real partner, dates, inclusions, prices, targets, rules and refund terms. Preserve destination through native and Telegram entry. Show pending/credited/failed/refund-review from backend, never simulated success. Show approved days, disputes, obligations and delivery separately. Renewal requires new checkout for configured next cohort. Operator has configuration, staff, roster, corrections/disputes, cancellation, refund and reconciliation controls; staff see attendance essentials, finances admin-only. All APIs use `{data,error}` and internal user identity; old join routes cannot bypass pilot pricing.
9. Track source/offers, backend fee payment/first attendance/day counts/refunds, renewal offers/new fee payments, manual prospect register, costs/operator time and admin CSV. Renewal denominator is original non-refunded fee-paying cohort, never stake-only participants. Partner briefing/participant offer/staff/daily operations/launch-stop criteria included. Compensation remains manual and recorded. No paid ads, automated outreach or new AI/duel/marketplace features.
10. Real PostgreSQL contracts with mocked Chapa network boundary: concurrency, duplicate webhooks, clicks, stale failure, wrong amount/currency, late payment; atomic splits; withdrawal/underfill/operator refund/idempotency; staff/cross-room/EAT/corrections/disputes/bypass; early settlement/all outcomes/conservation/repeat; transfer timeout/ambiguity/failure/approval/delivery; Telegram/native auth/payment recovery/renewal. Route tests must not start listener. Test actual settlement SQL, add DB CI and run lint/typecheck/build/unit/DB/API/browser checks.
11. Feature branch preserves prior review documents; checkout stays disabled. Rehearsal on isolated database precedes production. Financial/access/concurrency review required. Actual partner, staff, terms/price acceptance, merchant approval and refund funding are launch gates. Migrations precede app rollout; controlled live payment and verified refund/payout precede open enrollment. After money exists disable enrollment and reconcile; never restore a snapshot over financial history. Continue commercially only with 20 fee payers, 10 paid renewals, willing repeat partner and positive direct contribution (experiment thresholds).

## Validation result — 2026-09-06

- `pnpm lint`: pass (116 files; existing formatting/accessibility failures corrected).
- `pnpm typecheck`: pass across shared, web, API and bot.
- `pnpm build`: pass across all workspaces.
- `pnpm run test --run`: 17 unit tests pass. The 37 database/API tests intentionally skip without their disposable-database environment variables.
- `pnpm test:db` with isolated PostgreSQL 16 and PostgREST 16.2: all 37 tests pass, including actual migration/settlement/refund SQL, EAT dates, capacity races, delayed webhook/withdrawal, provider ambiguity, retry-generation concurrency and revoked-operator access.
- `pnpm test:pilot-browser`: six browser journeys pass, including native staff session reload and direct Telegram start parameter. These use explicit HTTP fixtures; the separate API suite exercises real SQL.
- Both independent reviewers rechecked their findings against the fixes and found no remaining issue in those findings; they reviewed tests but did not independently rerun them. See REVIEW.md.
- CI job added; remote GitHub Actions was not run here.
- No production migration, deployment, checkout enablement, provider payment or external outreach performed. The disposable schema rehearsal is not a full production clone rehearsal; production S2/data-preservation and merchant/live-payment gates remain in RUNBOOK.md.
