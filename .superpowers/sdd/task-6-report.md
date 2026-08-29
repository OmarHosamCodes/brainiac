# Final review merge nits — oxfmt + exhaustive status badge

## Status

**DONE.** oxfmt on `moneyBillTableShowsWaste`; shared `expenseStatusVariant` in `money-expenses-strip.ts`; section + sheet views use it (no nested ternary).

## Commit

`d7a07492` — `fix: format waste helper and exhaust expense status badge`

## oxfmt --check

```text
$ bunx oxfmt --check apps/web/src/features/billing/money-bills-table-columns.ts apps/web/src/features/money/agency-money-expenses-section-view.tsx
Checking formatting...

All matched files use the correct format.
Finished in 99ms on 2 files using 12 threads.
```

Exit code: 0.

## Tests

```text
$ bun test apps/web/src/features/billing/money-bills-table-columns.test.ts apps/web/src/features/money/money-expenses-strip.test.ts
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

apps/web/src/features/money/money-expenses-strip.test.ts:
(pass) buildExpenseStripItems > sorts one-time before subscriptions on all
(pass) buildExpenseStripItems > shows paid one-time expenses and subscriptions on paid filter
(pass) buildExpenseStripItems > includes one-time expenses in the due filter
(pass) expenseStripFilterFromSearch > accepts known values and falls back to all
(pass) expenseStripEmptyCopy > returns paid empty copy when paid filter has no rows
(pass) expenseStripFilterVisibility > maps all filter to due and paid visibility
(pass) expenseStripItemMatchesSearch > matches name, meta, note, and amount label
(pass) filterExpenseStripItems > returns all items when search is empty
(pass) filterExpenseStripItems > filters strip items by search term
(pass) expenseStripEmptyCopy > returns search empty copy when filtered list is empty
(pass) expenseStripInsight > summarizes due and paid counts
(pass) expenseStripMeta > prefers row meta when present
(pass) findExpenseStripItem > looks up the matching cycle when two items share an expenseId
(pass) findExpenseStripItem > returns null when the selected id is missing
(pass) expenseStripAmountLabel > shows the remaining balance for payable rows
(pass) expenseStripAmountLabel > shows the recorded amount for settled rows

 27 pass
 0 fail
 40 expect() calls
Ran 27 tests across 2 files. [71.00ms]
```

Exit code: 0.

## Concerns

None for this pass. Other deferred Minors from final review intentionally untouched.

---

# Golden inventory — use-money-detail-sheet-side

## Status

**DONE.** Registered `use-money-detail-sheet-side.ts` in `docs/golden-file-source-inventory.md` so `bun run check:golden` passes on HEAD.

## Commit

`31130250` — `chore: register money detail sheet hook in golden inventory`

## check:golden

```text
$ bun run check:golden
$ node scripts/check-golden-file-inventory.mjs
check-golden: 1429 artifacts semantically validated across 28 domains
```

Exit code: 0.

## Concerns

None. Evidence field uses checker-computed content (no oRPC/TanStack in this hook) rather than sibling feature-hook boilerplate.

---

# Salary-pool bill status fix
