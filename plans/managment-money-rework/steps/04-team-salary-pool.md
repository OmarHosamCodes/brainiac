# Step 04 — Team salary pool and member payments

**Date:** 2026-08-24  
**Scope:** Manual period Team salaries total, shared-balance payments, formula/scoreboard integration.

**Update 2026-08-25:** UI/API simplified to pool-level partial pay (`paid_amount` on
`agency_ops_salary_pool`). Per-member settlement rows remain in the schema for
historical audit only.

## What changed

### Schema (`0055_agency_salary_pool.sql`, `0058_agency_salary_pool_paid_amount.sql`)

- `agency_ops_salary_pool` — one manual total per payout run/period; `paid_amount`
  tracks cumulative pool payments
- `agency_ops_salary_member_settlement` — legacy per-member audit rows (no longer written)

### API

- `packages/api/src/routers/agency-ops/billing/salary-pool.ts` — pure validation
  and totals helpers (+ Bun tests)
- `packages/api/src/routers/agency-ops/billing/salary-pool-service.ts` —
  get/upsert pool, record pool payment
- `agencyOps.salaryPool.*` router procedures (owner-only via service membership)
- `getPayoutSummary` prefers pool total/paid/remaining when a pool exists
- `createPayoutLineFromMember` and member soft-export blocked when pool exists
- Scoreboard continues to use `getPayoutSummary` → full manual total for
  `salariesAmount` (not paid-to-date)

### Web

- Adjustments create: **Team salaries total** option
- Team bills: pool Total/Paid/Remaining + single amount field and **Pay**

## Locked behavior verified in code

- One pool per period (unique on `run_id`)
- Pool create blocked when nonzero rate-derived salary lines exist
- Rate-derived salary line create/export blocked once pool exists
- Pool payments reduce shared remaining
- Total update rejected below paid-to-date

## Checks run

```bash
bun test packages/api/src/routers/agency-ops/billing/salary-pool.test.ts
bun run check-types   # pass
bun run check:conventions  # 7 pre-existing golden-view-no-hooks elsewhere
```

## Apply locally

```bash
bun run db:push
```

## Browser smoke (owner, Money → Bills)

1. Adjustments → Add → **Team salaries total** → save amount
2. Team tab → confirm pool Total/Paid/Remaining
3. Enter partial amount → Pay → Paid/Remaining update
4. Pay remaining → Remaining = 0; Pay hidden
5. Scoreboard Team profit/ROI reflect full pool total (not paid-to-date)
