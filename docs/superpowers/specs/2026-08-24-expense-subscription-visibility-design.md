# Expense Subscription Visibility Design

## Goal

Let owners use the subscription list control to show due subscriptions, paid subscription cycles, or both for the selected Money period. Paying a subscription removes it from the due view but preserves it in paid history and in the Expenses scoreboard total.

## Interaction

- Rename the group to **Subscriptions** with the selected Money period as its scope.
- Replace the list button’s direct action with a dropdown menu.
- The menu contains independent checkbox items:
  - **Due** — enabled by default.
  - **Paid** — disabled by default.
- Keep **View all expenses** as a menu action below a separator.
- Both checkboxes may be enabled together.
- The group count reflects the active visibility:
  - Due only: `N due`
  - Paid only: `N paid`
  - Both: `N shown`
- If neither option is enabled, show explicit empty copy: “Choose Due or Paid from visibility.”

## Row Behavior

- Due rows represent the subscription’s current cycle and retain the Pay action.
- A partially paid current cycle remains Due and shows its existing partial status.
- Paid rows represent immutable paid occurrences in the selected period.
- Paid rows show the subscription name, snapshotted cycle amount, period cadence, and paid cycle date.
- Paid rows are read-only and never expose Pay.
- Advancing `nextDueAt` removes the completed cycle from Due without removing its Paid row or scoreboard amount.

## Data Flow

Add a dedicated protected API procedure for subscription cycles rather than changing the generic expense list contract.

The service:

1. Requires owner membership.
2. Validates the selected period.
3. Loads current subscription templates due on or before the selected period end, preserving the existing overdue behavior.
4. Loads fully paid `agency_ops_expense_occurrence` rows whose immutable `dueAt` belongs to the selected period, joined to their subscription template for display metadata.
5. Returns display-ready cycle records with a stable cycle ID, parent expense ID, state (`due` or `paid`), amount, currency, cadence, due date, note, and payment eligibility.

The Money hook queries the cycle procedure for the selected period, applies local Due/Paid checkbox state, and maps records to the existing presentational row shape. The existing expense list remains responsible for one-time expenses and the All expenses dialog.

## Error and Empty States

- Cycle-query failures use the existing Expenses error panel and retry path.
- No due cycles: “Nothing due soon.”
- No paid cycles: “No paid subscriptions this period.”
- Neither visibility selected: “Choose Due or Paid from visibility.”
- The scoreboard remains independent from visibility controls and always totals all period expenses.

## Testing

- Service tests cover due-only, paid-only, combined cycles, period boundaries, partial current cycles, and stable separation of successive cycles.
- UI mapping tests cover count labels, visibility filtering, paid row labels, and disabled payment actions.
- Browser verification covers:
  1. Due enabled and Paid disabled by default.
  2. Paying a subscription removes it from Due.
  3. Enabling Paid reveals the completed cycle.
  4. Enabling both shows both sets.
  5. Expenses scoreboard total does not change when visibility changes.
