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
