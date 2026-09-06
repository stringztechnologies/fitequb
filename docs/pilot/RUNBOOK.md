# Paid pilot operating and rollout runbook

## Offer and partner briefing

The pilot is a 30-day attendance accountability service at one gym, led by one coach. Initial configuration defaults: 20 participants, 300 ETB program fee, 500 ETB at-risk stake, 12 target days with 10 approved days required. Gym access and unlimited personal training are excluded. These are configurable test prices, not a claim about market demand.

Partner agreement must name the gym, coach and staff, existing-member recruitment responsibilities, attendance coverage, fixed compensation, service schedule, escalation contact, and repeat-cohort decision. Staff must already have signed-in FitEqub user accounts. Do not infer an agreement from seeded gym records. Compensation is manual and recorded as an actual cost, not inferred from affiliate commissions.

Participant message: “Build a consistent gym routine over 30 days with a coach and a small group. Your attendance is recorded. Read the program price, stake-loss rules, and schedule before joining.” Use `/pilot/<room-id>?source=<partner-code>`; Telegram bot invitation: `https://t.me/fitequb_bot?start=pilot_<room-id>`. No winnings or fitness results are guaranteed.

## Fixed pilot-v1 participant terms

- Program fees pay for delivery; stakes remain governed by the room's qualification and payout rules.
- Before the scheduled start, voluntary withdrawal returns the full program fee and stake.
- After starting, voluntary withdrawal, including illness, does not refund the program fee. Stake qualification continues under the published attendance rules.
- Operator cancellation returns remaining stakes and refunds the program fee proportionally to the unserved scheduled time, rounded to ETB cents. At or before start this is a full fee refund.
- A cohort that is below its published minimum at enrollment cutoff is cancelled and fully refunded. Meeting minimum does not start attendance early.
- Staff approve one attended day per Addis Ababa date. Report missing or incorrect attendance before 24 hours after program end. Corrections are recorded by the operator; unresolved disputes hold settlement.
- Qualified members split stake funds less 5% of forfeited stakes. If everyone qualifies, no house fee applies. If nobody qualifies, stakes are returned, but delivered program service is not refunded.
- Transfers can require provider approval and processing. Submitted is distinct from delivered. Do not promise instant availability.

The pilot-v1 wording is implemented in the offer. If applicable requirements or partner commitments require different terms, update the version and wording together before publishing; never change a paid cohort's bargain in place.

## Production baseline and migration gate

Read-only connector checks on 2026-09-06 confirmed v1 `equb_id` / `entry_type` columns, DATE room boundaries, INTEGER stakes/pots, and no `payment_intents`; latest applied migration was `20260403091652`. No production changes were made. This is not a current row-count guarantee.

1. Disable checkout and pause mutating crons for a cutover. Back up production and record current schema/migration history.
2. Rehearse on an isolated copy of the current schema. Use the S2 runbook in TASKS.md; its emptiness guards must pass for every rebuild target. If any target contains data, stop this destructive reconciliation path and author a preservation migration. Never bypass a guard or use CASCADE.
3. Baseline the historical unsafe coach file as instructed by S2; do not replay it. Apply S2, money hardening, then `20260906120000_paid_pilot.sql` in order. Already-applied migrations must not be rerun.
4. Verify date conversion, decimal amounts, RLS, restricted function privileges, immutable ledger, frozen configuration, and preservation of seed/reference data. Run money, attendance, refund and duplicate-notification rehearsals.
5. Deploy compatible API (`dist/server.js`), web and bot only after schema verification. Keep `PILOT_CHECKOUT_ENABLED=false`.
6. Set `ADMIN_TELEGRAM_ID` and/or `ADMIN_USER_ID` for the trusted operator, real API/web URLs, Chapa keys, QR secret and cron secret. Chapa wallet/bank codes come from its bank-list API, not a hardcoded name.
7. Operator creates a draft in `/pilot-admin`, assigns staff, reviews offer/terms, sets actual partner/funding/provider readiness, and publishes. Set a renewal cohort only after defining its actual offer.
8. Confirm merchant acceptance of the combined service/stake flow, provider fees, approval mechanism, and account details. Perform one controlled real payment and fully reconciled refund/payout before accepting the cohort. An OTP/server approval requirement is an operational step; pending verification must not be treated as failure or resent.
9. Only after all gates, enable the server switch and the cohort's checkout-ready setting. This runbook is not authorization to transfer money or apply production migrations automatically.

## Staff and operator checklist

Staff: sign in, open `/pilot/<room-id>/staff`, confirm only people actually seen at the gym today. Do not approve your own attendance. Send corrections to the operator with the member/date; no shared admin key or public day-pass page grants pilot approval rights.

Operator daily: check receipt mismatches, unknown initialization, `processing`/`sent` transfers, customer refunds, disputes, and cohort status. Run reconciliation before considering a retry. Each confirmed-failure retry has a new deterministic provider reference tied to its attempt number; old verification results cannot change a later attempt. Record Chapa charges, coach/gym costs, other actual costs, estimates separately, and operator minutes.

An unknown checkout must not trigger another charge. Verify the existing reference through the provider and the member status page. If the provider cannot establish its outcome, leave it unresolved and work with provider support; do not delete the reference to force a retry. Wrong-currency receipts require provider resolution and must not be returned as if they were ETB. Preserve the evidence until resolved.

Known ETB mismatches can be refunded through the operator refund action; this creates an obligation and job, not a claim that money already arrived. Partial refund delivery stays `refund_requested`. Fully confirmed refund jobs mark the payment `refunded`, and later webhooks cannot re-enroll the member.

Schedule `/cron/settle` and `/cron/payouts` frequently enough for operations; both run pilot lifecycle handling. Settlement itself waits for end + 24 hours and unresolved disputes. Keep secrets in headers. The existing general daily-reset must not award pilot attendance or purge pilot attendance audit records.

## Measurement and decision

Track introduction source, offer, fee payment, first attendance, approved days, withdrawals, refunds, money delivered, renewal offers and fee payments. The admin report/export uses backend payment/attendance facts. Stake-only participation is not a paid service renewal. A refunded program enrollment is excluded; paid renewal means a new positive program-fee payment after the original enrollment. Compare actual renewal prices separately; discounted renewals do not prove acceptance at the original price.

Record all costs before interpreting contribution; unentered fees and unpaid founder time are not profit. Targets: 20 fee payers, 10 paid renewals, partner willingness to repeat, positive direct contribution, no unreconciled customer losses. These are proposed continuation thresholds, not product-market-fit proof.

Preparation checkpoint after two weeks; once ready, seven days enrollment + 30 days delivery + eight days renewal. Diagnose channel/offer/checkout/delivery/renewal failures separately, make one targeted adjustment, then pause if repeat payment and viable delivery do not appear. No paid ads or unsolicited outreach is automated.

## Rollback

Before any money, revert application rollout if needed while keeping checkout disabled. After money exists, disable new enrollment, retain financial records, reconcile provider outcomes and apply forward fixes. Never restore an old snapshot that erases transactions. Refund obligations and stakes cannot fund operating expenses.

## Provider contract references

Transfer delivery reconciliation uses [Chapa transfer verification](https://developer.chapa.co/transfer/verify-transfers). A response without the matching provider reference or a recognized outcome stays unresolved. Confirm the merchant's actual response format and approval process during the controlled provider rehearsal.
