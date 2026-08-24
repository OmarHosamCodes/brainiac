# Step 04 — Team salary pool and member payments

**Date:** 2026-08-24  
**Scope:** Manual period Team salaries total, shared-balance member payments, Final
payment marker, formula/scoreboard integration.

## What changed

### Schema (`0055_agency_salary_pool.sql`)

- `agency_ops_salary_pool` — one manual total per payout run/period
- `agency_ops_salary_member_settlement` — cumulative paid amount + optional
  `finalized_at` per member

### API

- `packages/api/src/routers/agency-ops/billing/salary-pool.ts` — pure validation
  and totals helpers (+ Bun tests)
- `packages/api/src/routers/agency-ops/billing/salary-pool-service.ts` —
  get/upsert pool, record payment (+ optional finalize), reopen member
- `agencyOps.salaryPool.*` router procedures (owner-only via service membership)
- `getPayoutSummary` prefers pool total/paid/remaining when a pool exists
- `createPayoutLineFromMember` and member soft-export blocked when pool exists
- Scoreboard continues to use `getPayoutSummary` → full manual total for
  `salariesAmount` (not paid-to-date)

### Web

- Adjustments create: **Team salaries total** option
- Team bills: pool Total/Paid/Remaining + per-member partial pay, **Final
  payment** checkbox, owner **Reopen** on finalized members

## Locked behavior verified in code

- One pool per period (unique on `run_id`)
- Pool create blocked when nonzero rate-derived salary lines exist
- Rate-derived salary line create/export blocked once pool exists
- Member payments reduce shared remaining; finalize does not consume remainder
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
3. Pay two members partially; finalize one → only that member locks
4. Reopen finalized member
5. Scoreboard Team profit/ROI reflect full pool total (not paid-to-date)
