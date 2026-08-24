# Management Money Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Status:** ready for production deploy (2026-08-24). Steps 01–08 implemented
> on `dev`. Run [`actions/02-production-deploy.md`](./actions/02-production-deploy.md)
> to ship migrations 0055–0057 and smoke-test. Slice 02 (input reconciliation)
> remains post-deploy.

**Goal:** Make Agency Money a reliable compose-on-demand ledger whose
scoreboard follows the Fin-Sheet equations while preserving auditable payment
history.

**Architecture:** Drizzle stores source amounts, recurring templates, immutable
payment occurrences, rates, pools, and settlements. Billing services resolve
effective amounts and expose period read models through thin oRPC routers. The
Money hook composes those read models for props-only views.

**Tech Stack:** Bun, TypeScript, Drizzle/Postgres, oRPC, TanStack Query, React,
and shadcn UI.

## Global Constraints

- Golden-file layers: schema → API schemas → router → service → hook → container → view
- Product language is always `amount` (integer minor units). Never expose “cents”
- Agency currency is team-selected ISO 4217; soft-locked once money data exists
- Default Money range is the current calendar month, clamped to tenure start/end
- Client bills default to an external filter badge; dismissing it also shows internal clients
- Effective billable rate is project override → client rate; an unset project
  override always inherits
- A manual Team salary pool replaces rate-derived member salary lines for its
  period and drives the full scoreboard salary cost
- Subscription templates schedule future cycles; paid occurrences preserve
  period history and remain in Expenses totals
- Money **Rules** define who qualifies; **Formulas** define amounts; formulas
  bind rules via `ruleId` for payout eligibility and `cohort_size`
- Waste classification is unified: entry `isWaste`, waste-flagged tasks,
  waste-named projects (word-boundary “waste”), applied across reports, Money,
  payouts, and member profile — not the entry flag alone
- Writes never apply from Orch without Approve/Reject

## Actions

Local/ops runbooks in [`actions/`](./actions/README.md).

- [`actions/01-relabel-agency-currency-egp.md`](./actions/01-relabel-agency-currency-egp.md) — restored local DB: relabel EGP-scale rows and preserve USD client rates with FX
- [`actions/02-production-deploy.md`](./actions/02-production-deploy.md) — **now:** Railway deploy + migrations 0055–0057 + smoke

## Slices

Work lives in [`slices/`](./slices/README.md). Execute one slice at a time.

- [`slices/01-finsheet-equations.md`](./slices/01-finsheet-equations.md) — Fin-Sheet BF algebra (team profit, ROI, profit share) in Orch formulas + eval order
- [`slices/02-money-input-reconciliation.md`](./slices/02-money-input-reconciliation.md) —
  **post-deploy:** audit each scoreboard input against Fin-Sheet and close
  source/data gaps without hardcoded totals

## Executed steps

Actual local execution is recorded in [`steps/`](./steps/README.md).

- [`steps/01-local-currency-migration.md`](./steps/01-local-currency-migration.md) — local EGP migration, client-rate FX branch, and verification
- [`steps/02-finsheet-equations-implementation.md`](./steps/02-finsheet-equations-implementation.md) — TDD sequence, implementation, review fixes, and final checks
- [`steps/03-client-rate-only-invoicing.md`](./steps/03-client-rate-only-invoicing.md) — client-only revenue rates, invoice pricing, and aligned rounding
- [`steps/04-team-salary-pool.md`](./steps/04-team-salary-pool.md) — manual Team salaries pool, member partial/final payments, scoreboard precedence
- [`steps/05-project-rate-overrides.md`](./steps/05-project-rate-overrides.md) — project rate overrides client rate; unset projects inherit client catalog rate
- [`steps/06-period-range-bounds.md`](./steps/06-period-range-bounds.md) — valid future tenure-period bounds for scoreboard reads
- [`steps/07-subscription-expense-occurrences.md`](./steps/07-subscription-expense-occurrences.md) — paid subscription history, stable scoreboard totals, Due/Paid visibility
- [`steps/08-formula-rule-binding.md`](./steps/08-formula-rule-binding.md) — formulas bind Money Rules for eligibility and cohort size

## Sources

Task knowledge base lives next to this plan:

- [`sources/README.md`](./sources/README.md) — index
- [`sources/restored-local-db.md`](./sources/restored-local-db.md) — local DB after 2026-08-24 prod restore
- [`sources/money-surface-feature.md`](./sources/money-surface-feature.md) — current Money surface, layers, queries
- [`sources/product-constraints.md`](./sources/product-constraints.md) — locked product rules and prior plans
- [`sources/finsheet-latest-month-equations.md`](./sources/finsheet-latest-month-equations.md) — Fin-Sheet July (BF) equations
- [`sources/finsheet-july-equations.canvas.tsx`](./sources/finsheet-july-equations.canvas.tsx) — July equation canvas

## File map

- `packages/db/src/schema/agency-ops.ts` — Money persistence
- `packages/db/src/migrations/0055_agency_salary_pool.sql` — salary pool + member settlements
- `packages/db/src/migrations/0056_agency_project_billable_rate.sql` — optional project rate override
- `packages/db/src/migrations/0057_agency_expense_occurrence.sql` — paid subscription-cycle history
- `packages/api/src/routers/agency-ops/billing/money-formula-rule.ts` — formula ↔ rule eligibility
- `packages/api/src/routers/agency-ops/shared/waste-helpers.ts` — unified waste classification
- `packages/api/src/routers/agency-ops/billing/` — amount resolution, expenses,
  payouts, formulas, scoreboard, exports, and routers
- `apps/web/src/features/billing/` — tested Money-domain view-model helpers
- `apps/web/src/features/money/` — Money hook/container/views
- `apps/web/src/features/shared/stores/agency-ops.ts` — Money mutation and
  invalidation bridge

---

## Tasks

- [x] Relabel restored local ledger to EGP without converting EGP-scale values
- [x] Align Team profit, ROI, and profit-share formulas with Fin-Sheet
- [x] Restrict client invoicing to client/project rates
- [x] Add manual Team salary pool and member partial/final settlement
- [x] Add project rate overrides with client-rate inheritance
- [x] Fix inverted future tenure-period scoreboard bounds
- [x] Preserve paid subscription cycles in totals and add Due/Paid visibility
- [x] Bind formulas to Money Rules (`ruleId`) for payout eligibility
- [x] Unified waste helpers across reports, Money, and payouts
- [ ] Run production deploy ([`actions/02-production-deploy.md`](./actions/02-production-deploy.md))
- [ ] Execute [`slices/02-money-input-reconciliation.md`](./slices/02-money-input-reconciliation.md)
