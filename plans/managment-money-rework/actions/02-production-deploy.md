# Action 02 — Production deploy (Money rework batch)

**When:** Shipping steps 01–08 to Railway/production **now** (2026-08-24 batch).

This batch includes Money rework migrations **0055–0057**, formula/rule binding,
salary pool, project rates, subscription occurrences, unified waste
classification (`waste-helpers`), and related API/web changes. It does **not**
include Fin-Sheet input reconciliation (slice 02) — deploy code first, reconcile
totals after.

## Execution result — 2026-08-24

- Railway project/environment: `Internal Tools` → `Orch`
- Active deployment: commit `b674e0c8`, status `SUCCESS`
- Service topology: the `web` service starts both the API and TanStack Start web
  process
- Pre-deploy `drizzle-kit push` applied the schema; 0055–0057 tables, columns,
  indexes, and foreign keys were verified directly in production Postgres
- Both production domains returned HTTP 200
- The guarded EGP currency migration and read-only input audit are recorded in
  [`../steps/09-production-currency-and-input-audit.md`](../steps/09-production-currency-and-input-audit.md)

## Pre-flight

```bash
bun run check
bun run check-types
bun run check:conventions   # note any pre-existing violations outside this batch
bun test packages/api/src/routers/agency-ops/billing/salary-pool.test.ts
bun test packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts
bun test packages/api/src/routers/agency-ops/billing/money-formula-rule.test.ts
bun test packages/api/src/routers/agency-ops/shared/waste-helpers.test.ts
```

Confirm branch is **`dev`**, changes are committed and pushed, and CI is green.

## Migrations (production Postgres)

Apply in order on production (Railway Postgres). Drizzle journal entries:

| Migration | Ships |
| --- | --- |
| `0055_agency_salary_pool.sql` | Team salary pool + member settlements |
| `0056_agency_project_billable_rate.sql` | Nullable project billable rate override |
| `0057_agency_expense_occurrence.sql` | Paid subscription cycle history |

**Preferred:** let the deploy pipeline run pending migrations the same way other
agency-ops migrations ship (server/db deploy step). If applying manually:

```bash
# From repo root, with production DATABASE_URL set (Railway CLI or env)
cd packages/db && bun run db:migrate
```

Do **not** run `db:push --force` against production unless that is already the
team’s established emergency path.

## Deploy

1. Merge/push to **`dev`** (default deploy branch).
2. Railway: promote web + server services (or wait for auto-deploy from `dev`).
3. Confirm both services report healthy after migration.

## Post-deploy smoke (owner, production)

1. **Money → Settings → Rules** — list loads; edit Rent/custom rule members.
2. **Money → Settings → Formulas** — Rule dropdown on custom formula; save.
3. **Money → Expenses** — Subscriptions Due/Paid menu; pay advances due date;
   scoreboard Expenses total retains paid cycle.
4. **Money → Bills → Team** — salary pool panel if pool exists; partial pay.
5. **Project detail** — Commercial panel shows effective billable rate
   (override or inherit).
6. **Tracker / Reports** — waste column and totals include task/project/name
   waste signals (not entry flag alone).

## Rollback notes

- Migrations are additive (new tables/columns). Roll back **code** first if
  needed; do not drop new tables without a planned data migration.
- Formula snapshots on existing payout runs keep prior `formulaSnapshotJson`;
  refresh draft runs via formula sync if eligibility looks stale.

## Out of scope for this deploy

- Local-only EGP relabel ([`01-relabel-agency-currency-egp.md`](./01-relabel-agency-currency-egp.md))
- Slice 02 Fin-Sheet input reconciliation ([`../slices/02-money-input-reconciliation.md`](../slices/02-money-input-reconciliation.md))
