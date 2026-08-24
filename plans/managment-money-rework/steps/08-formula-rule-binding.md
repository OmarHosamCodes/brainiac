# Step 08 — Formula ↔ rule binding

**Date:** 2026-08-24  
**Scope:** Persist `ruleId` on formulas; drive payout eligibility, cohort labels,
and `cohort_size` from Money Rules; formula editor Rule picker and post-save
flow for new custom rules.

## Behavior

- **Rules** define who qualifies (cohort label + optional member pick).
- **Formulas** define how much (`tokens`, output, metric/section destinations).
- Each formula may bind **`ruleId`** — eligibility for payout sync and
  `cohort_size` in the chip equation uses that rule’s members.
- System templates ship with default bindings:
  - `profit_loss_share` → `profit-loss-share`
  - `paid_vacation` → `paid-vacation`
  - `device_compensation` → `device-compensation`
- Custom rules (Rent, TRANSPORTATION, etc.) work once a formula sets **Rule**
  and a **Payout section**.
- Saving a **new custom rule** opens Formulas with a draft formula pre-bound to
  that rule.

## Layers

- Schema/type: `AgencyOpsMoneyFormulaDef.ruleId`
- API: `money-formula-rule.ts` (eligibility + cohort resolution)
- Payout sync + formula preview use bound rule, not section-only mapping
- Web: `MoneyFormulaChipEditorView` Rule select; `listMoneyRuleOptions`;
  settings save handoff for new rules

## Checks

```bash
bun test packages/api/src/routers/agency-ops/billing/money-formula-rule.test.ts
bun test apps/web/src/features/billing/money-settings-form.test.ts
bun run check-types
```
