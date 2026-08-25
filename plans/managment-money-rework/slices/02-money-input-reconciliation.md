# Slice 02 — Money input reconciliation

> **Status:** in progress. Production read-only fact audit completed 2026-08-24;
> see
> [`../steps/09-production-currency-and-input-audit.md`](../steps/09-production-currency-and-input-audit.md).
>
> **Prerequisite:** executed steps 01–08 and migrations 0055–0057 applied in
> production. Deploy via [`../actions/02-production-deploy.md`](../actions/02-production-deploy.md).

**Goal:** Explain every difference between the selected Orch Money period and
the corresponding Fin-Sheet period, then close genuine source/aggregation gaps
without hardcoding sheet totals.

This follows the completed equation slice. Formula algebra is already locked;
the next risk is the facts supplied to those formulas.

## Current fact sources

- `total_income` — external, non-waste time priced per project using project
  override → client rate
- `received` / `remaining` — composed client obligations and recorded invoice
  payments
- `salaries` — full manual Team salary pool when present; otherwise payout
  salary lines
- `expenses` — selected-period one-time expenses, current subscription cycles,
  and persisted paid subscription occurrences
- `debt_discount`, `paid_vacation`, `device_comp`, `charity`, `pbc` — payout
  sections plus configured formula behavior

## Constraints

- Reconcile one explicit Fin-Sheet period, starting with July/BF.
- Work in agency-currency integer minor units.
- Preserve per-project pricing/rounding.
- Never create synthetic time, invoices, expenses, or payments merely to force
  a total.
- Keep formula templates unchanged unless the audit proves an equation defect.
- Report data gaps separately from code defects.

---

### Task 1 — Produce a read-only period fact audit

**Likely files:**

- `packages/api/src/routers/agency-ops/billing/period-scoreboard.ts`
- `packages/api/src/routers/agency-ops/billing/money-formula-context.ts`
- `packages/api/src/routers/agency-ops/billing/client-billable-income.ts`
- `packages/api/src/routers/agency-ops/billing/expense-service.ts`
- `packages/api/src/routers/agency-ops/billing/payout-service.ts`

- [x] Select and record the exact Orch/Fin-Sheet period bounds and currency.
- [x] Capture each raw scoreboard fact before formulas.
- [x] Break income down by client/project/effective-rate source.
- [x] Break salaries, expenses, and payout sections down by persisted source.
- [x] Classify every delta as missing source data, currency/range mismatch,
  rounding mismatch, or aggregation defect.
- [x] Do not mutate data during this task.

**Output:** a compact reconciliation report with evidence for every nonzero
delta and a proposed fix owner (data or code).

---

### Task 2 — Fix only proven aggregation defects

- [ ] Add one focused failing Bun test per proven defect.
- [ ] Fix the shared service/helper at the lowest correct layer.
- [ ] Verify sibling consumers (scoreboard, invoice pricing, export, and bills)
  still use the same effective amount.
- [ ] Leave missing business records as explicit data gaps; do not silently
  manufacture them.

**Expected first investigation:** determine whether device compensation, paid
vacation, debt/discount, charity, and PBC have durable period records in the
restored database or exist only as Fin-Sheet inputs.

---

### Task 3 — Reconcile and verify the live Money period

- [ ] Apply migrations 0055–0057 locally.
- [ ] Run focused billing tests.
- [ ] Run `bun run check`, `bun run check-types`, and
  `bun run check:conventions`; separate pre-existing failures from regressions.
- [ ] Browser-verify the selected period’s scoreboard, bills, and expenses.
- [ ] Record the executed work as the next numbered file under `steps/`.

## Completion rule

This slice is complete when every scoreboard input has a traceable persisted
source or an explicitly documented data gap, and the selected period’s Orch ↔
Fin-Sheet delta is explained without hardcoded totals.
