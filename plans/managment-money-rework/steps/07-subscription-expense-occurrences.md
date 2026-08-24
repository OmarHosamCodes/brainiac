# Step 07 — Subscription expense occurrences and visibility

**Date:** 2026-08-24  
**Scope:** Preserve paid subscription cycles in period expense totals while
advancing the recurring schedule, and expose Due/Paid visibility controls.

## Root cause

The subscription template held both the recurring schedule and the current
cycle’s accounting state. A full payment advanced `next_due_at` and reset
`paid_amount`, so the completed cycle no longer belonged to the selected period
query and disappeared from Expenses totals.

## Persistence (`0057_agency_expense_occurrence.sql`)

Added `agency_ops_expense_occurrence`:

- one immutable row per subscription + due date
- snapshotted agency-currency `amount`, cumulative `paid_amount`, and currency
- unique `(expense_id, due_at)`
- cascade delete with the parent expense

Subscription payment now upserts the occurrence and advances the template in
one transaction.

## Scoreboard behavior

- Current due subscriptions contribute their current cycle amount.
- Fully paid historical occurrences contribute their snapshotted cycle amount.
- A partial occurrence matching the current due cycle is not double-counted.
- Paying changes due/paid state, not the selected period’s total expense.

Verified local example:

```text
Expenses = EGP 58,290
         = EGP 50,000 paid subscription
         + EGP 1,780 paid subscription
         + EGP 6,510 other selected-period expenses
```

## Subscription visibility

The list icon beside **Subscriptions** now opens a checkbox menu:

- **Due** — enabled by default
- **Paid** — disabled by default
- **View all expenses**

The dedicated `agencyOps.expenses.subscriptionCycles` read model combines:

- current due/overdue subscription cycles, which retain Pay
- fully paid occurrences in the selected period, which are read-only

Counts adapt to the active visibility (`N due`, `N paid`, `N shown`). Query
invalidation refreshes the cycle list and scoreboard after create, pay, or
remove.

## Main files

- `packages/db/src/schema/agency-ops.ts`
- `packages/db/src/migrations/0057_agency_expense_occurrence.sql`
- `packages/api/src/routers/agency-ops/billing/expense-helpers.ts`
- `packages/api/src/routers/agency-ops/billing/expense-service.ts`
- `packages/api/src/routers/agency-ops/billing/router.ts`
- `apps/web/src/features/billing/money-subscription-visibility.ts`
- `apps/web/src/features/money/hooks/use-agency-money-surface.ts`
- `apps/web/src/features/money/agency-money-expenses-section-view.tsx`
- `apps/web/src/features/shared/stores/agency-ops.ts`

## Checks and runtime evidence

```bash
bun test packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts
bun test apps/web/src/features/billing/money-subscription-visibility.test.ts
bun run check-types
```

- 12 focused tests passed.
- Full monorepo typecheck passed.
- Local `subscriptionCycles` service returned paid EGP 50,000, EGP 1,780, and
  EGP 5,000 cycles with `canRecordPayment: false`.
- The live oRPC endpoint returned HTTP 200.
- The payment flow was browser-verified: the paid row left Upcoming while the
  Expenses scoreboard retained the cycle amount.

Repository-wide convention and golden-inventory checks still report unrelated
pre-existing workspace violations; this step introduced no targeted lint or
type errors.
