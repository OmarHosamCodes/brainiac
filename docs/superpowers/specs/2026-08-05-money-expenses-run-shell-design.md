# Money Expenses + Period run shell

Companion notes for Agency Management Money after Client/Team Bills.

## Expenses

- Separate `agency_ops_expense` catalog (not payout lines).
- Upcoming = subscriptions by `nextDueAt`; Recent = one-time in the selected period.
- Amount + currency required; partial payments via `paidCents` / status `due → partial → paid`.
- Subscriptions that pay in full advance `nextDueAt` and reset to due for the next cycle.
- Expenses stay on the Expenses card only — not Bills party rows.

## Period run

- Compact instrument below stats cards (`#money-period-run`).
- `payouts.getRun` returns run status + section aggregates (due / paid / remaining / lineCount).
- Expand a section to list lines grouped by optional `cohortKey` (Ungrouped fallback).
- Salaries deep-link to Team Bills; other sections can Add line (Adjustments dialog for debt/charity/pbc).
- Salaries amounts remain hours × cost rate until Part 9 (member monthly sheet).
