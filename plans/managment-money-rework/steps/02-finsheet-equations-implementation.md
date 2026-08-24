# Executed step 02: Fin-Sheet equations implementation

**Executed:** 2026-08-24  
**Scope:** API formula context, templates, fallback scoreboard, and unit tests  
**Branch:** `dev`  
**Commit:** not created

## 1. Load the implementation slice

Execution followed
[`../slices/01-finsheet-equations.md`](../slices/01-finsheet-equations.md) and
kept this algebra locked:

```text
cost   = salaries + expenses + debt_discount + device_comp + paid_vacation
profit = total_income - cost
ROI    = profit / cost
share  = (profit - charity) / 2
```

No web views, schema, router contracts, or persisted data were changed.

## 2. Add failing device-cost tests

Tests were changed first:

1. Added a July-shaped formula-context case expecting team profit `-119,823`.
2. Updated the fallback scoreboard expectation so device compensation is part
   of cost.
3. Updated fallback ROI to expect profit divided by cost.

The first run failed as expected:

- Formula context returned `-95,823`, proving it omitted 24,000 device
  compensation.
- Fallback scoreboard returned 50,000 instead of 49,000, proving the same
  omission.

## 3. Include device compensation in both profit paths

Implementation then:

1. Added `deviceCompAmount` to `buildMoneyFormulaContext` team cost.
2. Added `deviceCompAmount` to `buildPeriodScoreboard` fallback cost.
3. Changed fallback ROI from profit/income to profit/cost.
4. Kept zero-cost ROI at `0`.

The targeted tests passed after this change.

## 4. Add a failing formula-order test

A July-shaped integration test supplied paid-vacation and device fact chips and
asserted:

- Team profit: `-119,823`
- Profit/loss share: `-59,911` at the initial rounding behavior
- ROI: `-119,823 / 426,146`

The test failed with share `-47,911`, proving the share formula ran before the
device chip and final team-profit formula were reflected in context.

## 5. Reorder formula evaluation

`applyFormulasToScoreboard` now evaluates:

1. Remaining
2. Paid vacation
3. Device compensation
4. Charity
5. PBC
6. Rebuild formula context
7. Team profit
8. Write final team profit into context
9. Profit/loss share
10. ROI

The formula-order test then passed.

## 6. Add failing system-template tests

Tests next asserted the exact locked tokens for:

- `sys_team_profit`
- `sys_roi`
- `sys_profit_loss_share`

They also asserted that disabled ROI falls back to profit/cost. The run failed
because:

- Team profit omitted `device_comp`.
- ROI divided by `total_income`.
- Profit/loss share still read `team_loss`.
- Disabled ROI fallback still divided by income.

## 7. Replace the three Fin-Sheet templates

The locked templates were updated to:

```text
team_profit =
  total_income -
  (salaries + expenses + debt_discount + device_comp + paid_vacation)

roi =
  team_profit /
  (salaries + expenses + debt_discount + device_comp + paid_vacation)

profit_loss_share =
  (team_profit - charity) / 2
```

`mergeMoneyFormulas` now replaces stored tokens for those three system keys
with the current templates while retaining each stored `enabled` value. Custom
formulas and the other system templates remain unchanged.

## 8. Fix negative half rounding found in review

The first code review found that JavaScript `Math.round(-59_911.5)` produces
`-59,911`, while the implementation slice requires the displayed minor-unit
amount `-59,912`.

A failing regression test was added, then
`roundMoneyFormulaAmount` was changed to round absolute values and restore the
sign. Negative half amounts now round away from zero.

The July integration expectation was updated to `-59,912`.

## 9. Cover all lockstep migrations

Review also noted that stale-token replacement was tested only for ROI. The
test was expanded to seed stale tokens for all three keys:

- `team_profit`
- `roi`
- `profit_loss_share`

It verifies that all three receive current template tokens and that stored
enabled state and custom formulas survive.

## 10. Final verification

Completed checks:

```text
bun test .../money-formula-eval.test.ts .../period-scoreboard.test.ts
18 pass, 0 fail, 35 assertions

packages/api: tsc -p tsconfig.json --noEmit
pass

bun run check-types
pass

edited-file diagnostics
no errors

git diff --check
pass
```

`bun run check` and `bun run check:conventions` were also attempted. They remain
blocked by 7 pre-existing `golden-view-no-hooks` violations in:

- `apps/web/src/features/workspace-agent/workspace-agent-view.tsx`
- `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx`

Those files were not changed by this step.

The final scoped review approved the implementation with no Critical,
Important, or Minor findings.

## Files changed

- `packages/api/src/routers/agency-ops/billing/money-formula-context.ts`
- `packages/api/src/routers/agency-ops/billing/money-formula-eval.ts`
- `packages/api/src/routers/agency-ops/billing/money-formula-templates.ts`
- `packages/api/src/routers/agency-ops/billing/period-scoreboard.ts`
- `packages/api/src/routers/agency-ops/billing/money-formula-eval.test.ts`
- `packages/api/src/routers/agency-ops/billing/period-scoreboard.test.ts`

## Result

The local code now evaluates Team profit, ROI, and Profit/loss share with the
Fin-Sheet algebra for whatever period facts are available. Matching July's
typed totals still requires later data-input slices.
