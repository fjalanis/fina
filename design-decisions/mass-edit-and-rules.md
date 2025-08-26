# Mass Edit and Rules Design (Query + Action + Eligibility)

## Goals
- Avoid tracking historical "applied rules" while keeping mass changes safe and idempotent.
- Unify ad-hoc mass edits with saved rules; support editing current transactions and auto-applying to future ones.
- Enforce global date-range discipline: every query requires a bounded range (<= 1 year).

## Core Model
- **Query**: selector for candidate transactions (regex on description, accounts, entry type, date range mandatory).
- **Action**:
  - ComplementaryAdd: add entries to destination accounts by ratios (sum=1.00, each > 0). Destination type is opposite of source.
  - MergeInto: coalesce counterpart entries (two-for-one) to balance transactions. Takes precedence over ComplementaryAdd.
  - EditFields: set fields like phone/url/category when missing or mismatched.
- **Eligibility**: deterministic check that ensures we only modify transactions that still "need" the change.

## Eligibility (No Versioning, Idempotent by Design)
- ComplementaryAdd
  - Eligible only if transaction is fully unbalanced: one side totals to 0; the other side > 0.
  - Source type inferred from which side is non-zero.
  - Apply ratios against source total; create opposite-type entries.
  - Optional metadata on generated entries: `generated.kind = 'complementary'`.
- MergeInto
  - Eligible if fully unbalanced OR transaction was balanced previously by ComplementaryAdd (detected via metadata), in which case Complementary entries can be removed and replaced by merge.
  - Requires a counterpart query (not implemented in the first cut here) to identify merges; complementary removal is implemented now.
- EditFields
  - Eligible when target fields are missing or differ from desired values.

## UX
- Transactions and Account pages gain a "Mass Edit" section (no new standalone page):
  - A collapsible search bar (query builder) that powers the live list below.
  - Action panel (Complementary/Merge/Edit) appears when expanded.
  - Preview Eligible: show count via backend.
  - Apply: run bulk apply with progress via socket; Cancel supported.
  - Save as Rule: persist Query + Action for future auto-apply.
- Rules list becomes "future transactions only" management; for existing data, mass edits happen from the transaction context.

## API Changes
- Require date ranges and cap to <= 1 year across endpoints.
- New endpoints:
  - POST `/api/mass/preview-eligible` → { totalCandidates, eligibleCount }
  - POST `/api/mass/apply` → progress and final { processed, eligible, modified }
- Socket.io events: `rule-apply-progress` for progress updates (reuse existing socket infra).

## Schema
- Minimal metadata on entries:
  - `entries.generated.kind` in { complementary, merge } (optional but simplifies precedence handling for MergeInto replacing ComplementaryAdd).

## Validation
- ComplementaryAdd ratios: every ratio > 0; sum exactly 1.00 (± epsilon). Absolute amounts removed to reduce confusion.

## Rationale
- Idempotency is derived from current state + eligibility, not a history ledger.
- Eligibility definitions are simple and auditable (fully unbalanced for Complementary/Merge; field mismatch for EditFields).
- Merge precedence over Complementary via metadata allows continuous improvement in auto-balancing without fragile re-application logic.

## Notes / Next Steps
- Implement counterpart detection for MergeInto to truly coalesce two transactions.
- Add UI layer on the transaction/account pages to expose Query + Action + Eligibility with preview and apply.
- Keep rules focused on future transactions; remove "apply existing" UI from the rules area and surface "load rule as search" near the transaction search bar.
