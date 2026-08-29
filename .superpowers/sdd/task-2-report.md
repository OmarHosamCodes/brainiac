# Task 2 Report: Tables view

**Status:** DONE_WITH_CONCERNS

## Commit

- `2eb83a62 feat: render bills as per-surface tables`

## Implemented

- Replaced the non-expense Bills instrument lists with stacked shadcn tables for Clients, Team, and Adjustments.
- Added responsive overflow, sticky primitive headers, status and carry badges, conditional Waste columns, neutral numeric columns, and warning-only positive remaining amounts.
- Added client initials and team avatars, highlighted search matches, party links that stop row propagation, and keyboard-accessible row activation.
- Moved the salary pool into the Team table footer and removed the former list/card-only view helpers.
- Kept header chrome, loading/error/empty states, expenses, dialogs, and Task 3 row actions unchanged.

## Verification

- `bun test apps/web/src/features/billing/money-bills-table-columns.test.ts`: 11 passed, 0 failed.
- Touched-file `oxfmt` and `oxlint`: passed.
- `bun run check-types`: passed across all 8 executed workspace tasks.
- `git show --check HEAD`: passed.
- The new view is 396 lines, below the brief's concern threshold.

## Self-review

- Confirmed each required column and conditional Waste behavior.
- Confirmed All renders only non-empty visible sections and section headings include counts.
- Confirmed row Enter/Space behavior and party-button event isolation.
- Confirmed Task 2 mount callbacks remain no-ops for rows and salary pool until Task 3.
- Confirmed only the two requested product files were committed.

## Concerns

- `bun run check:conventions` still reports 8 pre-existing violations in task-management, workspace-agent, and workspace-knowledge files.
- `bun run check:golden` reports existing inventory drift and expects inventory entries for Task 1 files plus the new tables view. Inventory maintenance was left out to keep this task scoped to the requested product files.

## Review fix

**Status:** DONE_WITH_CONCERNS

### What changed

- Narrowed `AgencyMoneyBillsTablesView` to explicit `clientGroups`, `teamGroups`, and `adjustments` collections. The tables view no longer imports or consumes `MoneyBillComposeSection`.
- `agency-money-bills-section-view.tsx` splits those arrays from `bills.rows` and still passes no-op `onOpenRow` / `onOpenSalaryPool`.
- Section titles + counts render only when more than one of {clients, team, adjustments} is visible. Team is visible when `teamGroups.length > 0` or `salaryPool.pool` is set. Empty surfaces are skipped.
- Added inventory rows for `agency-money-bills-tables-view.tsx`, `money-bills-table-columns.ts`, and `money-bills-table-columns.test.ts`.
- Also corrected three pre-existing inventory rows so `bun run check:golden` could pass without a full regenerate: `agency-task-rate-popover.tsx` (missing; web-query semantics), `agency-project-tasks.tsx` (evidence), `money-formula-payout-prune.ts` (api-service layer).

### Covering tests

**`bun test apps/web/src/features/billing/money-bills-table-columns.test.ts`** — pass (11 pass, 0 fail)

```
bun test v1.3.14 (0d9b296a)

apps/web/src/features/billing/money-bills-table-columns.test.ts:
(pass) moneyBillGroupCarryCount > counts carry lines only
(pass) moneyBillGroupCarryCount > returns zero when no carry lines
(pass) moneyBillGroupPeriodLabel > formats a single non-carry period
(pass) moneyBillGroupPeriodLabel > ignores carry periods when non-carry lines share one range
(pass) moneyBillGroupPeriodLabel > returns Mixed when non-carry lines span multiple periods
(pass) moneyBillGroupPeriodLabel > falls back to carry lines when no non-carry lines exist
(pass) moneyBillGroupPeriodLabel > returns Mixed for carry-only lines with multiple periods
(pass) moneyBillGroupPeriodLabel > returns empty string when lines are empty
(pass) moneyBillTableShowsWaste > returns false for empty rows
(pass) moneyBillTableShowsWaste > returns false when all waste amounts are zero
(pass) moneyBillTableShowsWaste > returns true when any waste amount is positive

 11 pass
 0 fail
 18 expect() calls
Ran 11 tests across 1 file. [56.00ms]
```

**`bun run check:golden`** — pass

```
$ node scripts/check-golden-file-inventory.mjs
check-golden: 1426 artifacts semantically validated across 28 domains
```

**`bun run check-types`** — pass (8/8 packages; `web:check-types` cache miss after the prop change)

```
Tasks:    8 successful, 8 total
Cached:    7 cached, 8 total
Time:    24.765s
```

Touched-view `oxfmt` / `oxlint` also passed.

### Concerns

- Golden inventory for this branch now includes three unrelated pre-existing corrections (task-rate popover, project-tasks evidence, formula payout prune layer) because `check:golden` still failed after adding only the Task 2 files. A full inventory regenerate was not used.
