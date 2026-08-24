# Step 05 — Project billable rate overrides

**Date:** 2026-08-24  
**Scope:** Optional per-project catalog rate that overrides the client rate; unset
project rates inherit the client default.

## Behavior

- `agency_ops_project.billable_rate_amount` nullable — `null` means inherit client rate
- Effective rate = project override ?? client rate (income, invoices, activity)
- Mixed clients: some projects can override, others inherit in the same period
- Project-level rounding preserved (aggregate/invoice still round per project bucket)

## Layers touched

- Schema/migration `0056_agency_project_billable_rate.sql`
- `client-billable-income.ts` — `resolveEffectiveBillableRate`, aggregation, invoice pricing
- `billing/service.ts` — period rows + invoice create load project rates
- `projects/service.ts` + router — list/update with FX-resolved override
- Project detail UI — Commercial panel (owner edit, inherit hint, effective rate)

## Checks

```bash
bun test packages/api/src/routers/agency-ops/billing/client-billable-income.test.ts
bun run check-types
```

Apply locally: `cd packages/db && bun run db:push -- --force`
