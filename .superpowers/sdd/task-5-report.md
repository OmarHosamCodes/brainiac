# Task 5 report: Bills expenses table and sheet

## Status

Complete. Expenses now use the Bills table grammar, row selection opens a right-side detail
sheet, and the Due/Paid/All pills are a header Select. Existing create, edit, payment, and all
expenses dialogs remain in place.

## Changes

- Added a keyboard-accessible expenses table with neutral glyphs, status badges, numeric columns,
  selected-row highlighting, and a table-shaped loading skeleton.
- Added `agency-money-expense-detail-sheet-view.tsx` with expense metadata and Edit plus Pay or
  Record footer actions.
- Added expense selection state to the panel hook and automatic closure when filtering or search
  removes the selected expense.
- Regenerated the golden source inventory for the new presentational view.

## Verification

- Targeted expense strip, bills filter, and table column tests: 45 pass, 0 fail.
- `bun run check-types`: pass.
- Touched-file oxlint and oxfmt checks: pass.
- `bun run check:golden`: pass.
- Browser verification: expenses table rendered with two live rows; row click opened the expected
  sheet with Edit and Record actions.

## Concerns

- `bun run check` and `bun run check:conventions` remain blocked by eight pre-existing golden view
  violations in task management, workspace agent, and workspace knowledge files. No violation
  points to the Task 5 files.

## Review fix

Selection now uses unique strip item `id` (`selectedRowId`). `expenseId` remains only for Edit/Pay.
The sheet and filter-close path look up via `findExpenseStripItem`.

Covering tests:

```
$ bun test apps/web/src/features/money/money-expenses-strip.test.ts
bun test v1.3.14 (0d9b296a)

apps/web/src/features/money/money-expenses-strip.test.ts:
(pass) buildExpenseStripItems > sorts one-time before subscriptions on all [5.45ms]
(pass) buildExpenseStripItems > shows paid one-time expenses and subscriptions on paid filter [0.30ms]
(pass) buildExpenseStripItems > includes one-time expenses in the due filter [0.12ms]
(pass) expenseStripFilterFromSearch > accepts known values and falls back to all [0.20ms]
(pass) expenseStripEmptyCopy > returns paid empty copy when paid filter has no rows [0.19ms]
(pass) expenseStripFilterVisibility > maps all filter to due and paid visibility [0.11ms]
(pass) expenseStripItemMatchesSearch > matches name, meta, note, and amount label [0.29ms]
(pass) filterExpenseStripItems > returns all items when search is empty [0.10ms]
(pass) filterExpenseStripItems > filters strip items by search term [0.10ms]
(pass) expenseStripEmptyCopy > returns search empty copy when filtered list is empty [0.05ms]
(pass) expenseStripInsight > summarizes due and paid counts [0.16ms]
(pass) expenseStripMeta > prefers row meta when present [0.06ms]
(pass) findExpenseStripItem > looks up the matching cycle when two items share an expenseId [0.25ms]
(pass) findExpenseStripItem > returns null when the selected id is missing [0.05ms]
(pass) expenseStripAmountLabel > shows the remaining balance for payable rows [0.05ms]
(pass) expenseStripAmountLabel > shows the recorded amount for settled rows [0.02ms]

 16 pass
 0 fail
 22 expect() calls
Ran 16 tests across 1 file. [77.00ms]
```

```
$ bun run check-types
$ turbo check-types
• turbo 2.10.2

   • Packages in scope: @orch/agent, @orch/api, @orch/auth, @orch/config, @orch/db, @orch/env, @orch/workspace, server, web
   • Running check-types in 9 packages
   • Remote caching disabled, using shared worktree cache

web:check-types: cache miss, executing c9862cb7d29da7db
web:check-types: $ tsc -b --noEmit

 Tasks:    8 successful, 8 total
Cached:    7 cached, 8 total
  Time:    24.425s
```
