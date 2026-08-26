# Step 10 — Task billable rate overrides

**Date:** 2026-08-26  
**Scope:** Optional per-task catalog rate that overrides project then client;
unset task rates inherit project override, then client default.

## Behavior

- `agency_ops_project_task.billable_rate_amount` nullable — `null` means inherit
- Effective rate = task override ?? project override ?? client rate
- Untasked entries use project ?? client only
- Mixed effective rates within one project bucket by `(projectId, rate)` for
  income aggregation and invoice lines
- Setting/clearing a task rate is owner-only (FX-resolved like project rates)

## Layers touched

- Schema/migration `0061_agency_task_billable_rate.sql`
- `client-billable-income.ts` — three-arg `resolveEffectiveBillableRate`,
  rate-bucket aggregation, invoice pricing
- `billing/service.ts` — period rows + invoice create load task rates
- `tasks/service.ts` + router — list/update with parent rate hints + FX update
- My Tasks edit dialog — owner Commercial rate field with inherit/effective hints

## Checks

```bash
bun test packages/api/src/routers/agency-ops/billing/client-billable-income.test.ts
bun run check-types
```

Apply locally: `cd packages/db && bun run db:push -- --force`
