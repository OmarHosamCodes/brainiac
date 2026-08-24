# Executed step 03: client-rate-only invoicing

**Executed:** 2026-08-24  
**Scope:** client bill activity, scoreboard income, and persisted invoice lines  
**Commit:** not created

## 1. Trace the incorrect rate source

Two client-revenue paths depended on member billable rates:

1. `loadPeriodClientBillableRows` joined `agency_ops_member_rate` and selected
   each time-entry author's `billable_rate_amount`. This fed live client bill
   activity and the scoreboard billable pool.
2. `createInvoice` loaded every member billable rate, rejected members without
   one, and used those rates for invoice project lines.

This made the same client work worth different amounts depending on who tracked
it. A project containing multiple members also inherited the rate of whichever
member created its first bucket.

The required invariant is now:

```text
client revenue and invoices = tracked client time × client billable rate
member payroll              = tracked member time × member cost rate
```

## 2. Add the failing client-rate contract

The billable-income fixture was changed from `billableRateAmount` to the
explicit `clientRateAmount` contract.

The first test run failed with:

```text
Expected billable pool: 10,000
Received: 0
```

This proved the aggregator still read the old member-oriented field.

## 3. Remove member identity from client income rows

`ClientBillableIncomeRow` now contains:

- client identity and category
- project identity
- duration and waste state
- `clientRateAmount`

It no longer carries `userId` or a generic/member-derived billable rate.

The period activity query now selects
`agency_ops_client.billable_rate_amount` directly and no longer joins
`agency_ops_member_rate`.

## 4. Price persisted invoices from the client rate

Invoice creation now:

1. Loads the selected client's resolved `billable_rate_amount`.
2. Does not query member billable rates.
3. Does not require every time-entry author to have a member billable rate.
4. Rejects billable time when the client itself has no rate, with an actionable
   client-specific error.
5. Applies the same client rate to every project line.
6. Continues excluding waste from invoice totals.

Member cost-rate queries used for team payroll remain unchanged.

## 5. Align activity and invoice rounding

Review found that activity rounded every time entry while invoices rounded
after grouping time by project. Split entries could therefore produce a
different live total than the persisted invoice.

A failing regression used two one-second entries in one project at an hourly
rate of 1,800:

```text
Per-entry rounding: 1 + 1 = 2
Project rounding:   round(2 seconds × rate) = 1
```

Client activity now groups billable and waste seconds by project, then rounds
once per project. Persisted invoice lines use the same project-level pricing
policy.

## 6. Centralize invoice project pricing

The pure `priceClientInvoiceProjects` helper now owns:

- waste exclusion
- missing-client-rate detection
- per-project duration aggregation
- one client rate for every project
- project-level amount rounding

`createInvoice` consumes its priced project lines directly. Tests cover:

- multiple projects using one client rate
- waste exclusion
- missing client-rate rejection
- consistent project-level rounding

## 7. Verify

Completed checks:

```text
client billing + formula regression suite
23 pass, 0 fail, 45 assertions

packages/api: tsc -p tsconfig.json --noEmit
pass

edited-file diagnostics
no errors
```

The final scoped review found no Critical, Important, or Minor issues.

Browser verification was attempted, but the local browser-control service was
unavailable. No browser result is claimed for this step.

## Files changed

- `packages/api/src/routers/agency-ops/billing/client-billable-income.ts`
- `packages/api/src/routers/agency-ops/billing/client-billable-income.test.ts`
- `packages/api/src/routers/agency-ops/billing/service.ts`

## Result

Member billable rates can no longer affect client bill activity, scoreboard
income, waste valuation, or persisted invoice lines. Client revenue uses only
the client's resolved agency-currency rate; member cost rates remain available
for payroll.
