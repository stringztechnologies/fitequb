# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

FitEqub uses a single-context domain docs layout.

Expected files:

- `CONTEXT.md` at the repo root, when domain language has been captured
- `docs/adr/` for architectural decision records, when decisions have been captured

If these files do not exist, proceed silently. Do not block work or suggest creating them upfront. The domain-modeling flow can create them later when domain terms or architectural decisions need to be resolved.

## Before Exploring

When available, read:

- `CONTEXT.md` at the repo root
- Relevant ADRs under `docs/adr/`
- Existing project docs such as `CLAUDE.md`, `AGENTS.md`, `KNOWLEDGE.md`, `SPEC.md`, `REVIEW.md`, `TASKS.md`, and `docs/ARCHITECTURE.rst`

## Use The Project Vocabulary

When an output names a domain concept, use FitEqub's existing language:

- Equb
- room
- stake
- workout
- day pass
- challenge
- duel
- coach pass
- trainer commission
- payout
- immutable ledger

If the concept is not defined yet, note the gap for future domain modeling rather than inventing competing terminology.

## Flag ADR Conflicts

If a recommendation contradicts an existing ADR, surface the conflict explicitly instead of silently overriding the decision.
