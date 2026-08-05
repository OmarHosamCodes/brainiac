# Money dynamic formulas — design spec

**Status:** Implemented  
**Date:** 2026-08-05  
**Surface:** Agency Management → Money → settings (Formulas) + period scoreboard / payout lines

## Purpose

Agency owners author how Money metrics and payroll section amounts compute for the active period — inspectable chip formulas, not buried hardwired code.

## Decisions

- Formulas drive **period scoreboard** and **payout line amounts** (not preview-only).
- Authoring is a **chip/token builder** (vars, numbers, ops, parens). No free-text `eval` / `Function`.
- Catalog = **locked Fin-Sheet templates** (editable tokens + enable) + **custom** formulas.
- **Eligibility stays in Rules** (cohort / members). Formulas define **amounts** only.
- Enabled formulas are **pinned** onto `agency_ops_payout_run.formula_snapshot_json` so mid-run edits do not rewrite paid/partial math until Sync on a draft run.

## Primary flow

1. Open Money settings → Formulas.
2. Open a template or Add formula.
3. Compose chips → see Preview · this period.
4. Save → scoreboard metrics update.
5. Period run → Sync formula lines → draft section amounts upsert from the pinned/current snapshot.

## Anti-goals

- Spreadsheet grid UI
- Arbitrary JS evaluation
- Auto-rewriting historical paid runs
- Collapsing Rules into Formulas

## Data

- `agency_ops_money_settings.calc_options_json.formulas[]`
- `agency_ops_payout_run.formula_snapshot_json`
- Safe evaluator: `packages/api/.../money-formula-eval.ts`

## UX notes

- Chips: `rounded-md` / `bg-muted` / mono for ops
- Inline validation under the strip (no toast spam)
- Empty custom list: “Add a formula to compute an extra allocation”
