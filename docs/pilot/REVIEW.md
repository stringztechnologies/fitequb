# Paid pilot review

Review base: `42be89ffeaf5374aed250a75e638a3ad3eaa2459`. Initial implementation: `df3647a`. Two independent read-only reviews followed the repository code-review skill.

## Standards

1. **P1 — unresolved checkout replacement:** pending withdrawal changed enrollment state, allowing a second intent before the old provider outcome was known. Resolution: preparation searches unresolved intents across withdrawn enrollment states; regression verifies the same reference is reused.
2. **P1 — stale transfer verification:** overlapping reconcilers could apply a prior failure to a new attempt. Resolution: generation compare-and-set on claims, verification and submission results; every retry gets a deterministic attempt-specific provider reference. The actual API/PostgREST test delays an old failure across a successful retry.
3. **P2 — operator revocation:** persisted SQL administrator entries outlived environment configuration. Resolution: every staff/admin authorization check synchronizes the actor's registry membership from current trusted configuration and resolved internal identity, supporting Telegram and native web authentication. Regression removes operator configuration while retaining staff assignment and verifies loss of correction privileges.

## Spec

1. **P1 — stale transfer failure:** same concurrency defect found independently, violating the rule that only a confirmed failure of the current attempt permits retry. Resolved as above.
2. **P2 — stale administrator privileges:** same privilege-retention defect found independently, violating current-day staff restrictions. Resolved as above.
3. **Partial concurrency coverage:** previous tests did not cover delayed verification across retry generations. The real database/API interleaving test now covers this.

No material extra feature was identified by the spec review. Broad existing formatting and accessibility corrections were necessary to make the required repository lint check pass.

Additional validation fixes: immutable offer snapshot catches schedule changes before first credit; null provider fields cannot imply successful payment; PostgREST's one-to-one payout relationship is normalized for the UI/report; native staff/operator pages restore sessions before loading; participant terms disclose enrollment cutoff, capacity, underfill refunds and exclusive attendance cutoff.

Findings: Standards 3 (worst P1 transfer retry race); Spec 3 including coverage (worst P1 transfer retry race). All addressed; final regression results and reviewer recheck recorded in IMPLEMENTATION.md.
