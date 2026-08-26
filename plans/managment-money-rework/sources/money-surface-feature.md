# Current Money surface (code)

Public entry is a one-line golden-file re-export:

`apps/web/src/features/money/agency-money-surface.tsx` → `AgencyMoneySurfaceContainer`.

Billing still has a compatibility re-export: `apps/web/src/features/billing/agency-money-surface.tsx` → `@/features/money/agency-money-surface`.

## Route and chrome

| Piece | Path |
| --- | --- |
| URL | `/agency/management/money` (legacy `?section=billing` / `manage=invoices|billing|money` redirect here) |
| Route module | `apps/web/src/routes/_authenticated/_agency-chrome/agency.management.money.tsx` |
| Page | `apps/web/src/pages/agency-management-money-page.tsx` — selected `teamId` into `<AgencyMoneySurface />` |
| Nav | Management Commercial hub pane `money`. Label **Money**. Subtitle: “Client invoices, payroll, and cash in one place.” |
| Period query | `from` / `to` search params via `parseAgencyPeriodQuery` / `agencyPeriodQuery` helpers |

Default range: current **calendar month**, clamped to tenure start/end. Tenure month keys (`tm:YYYY-MM-DD`) apply when tenure is on; the “This month” preset stays calendar month.

## Golden-file layout (web)

```
apps/web/src/features/money/
  agency-money-surface.tsx              # public export
  containers/agency-money-surface-container.tsx
  hooks/use-agency-money-surface.ts     # queries, handlers, ViewModel (~1800 lines)
  agency-money-surface-view.tsx
  agency-money-stats-section-view.tsx
  agency-money-bills-section-view.tsx
  agency-money-expenses-section-view.tsx
  agency-money-settings-dialog-view.tsx
  agency-money-shared-view.tsx
  money-motion.ts
```

Container contract: exactly one hook call, one view, bind only.

Most domain math and copy still live under `apps/web/src/features/billing/` (not `money/`):

- `money-bills-filters.ts` — party / status / external-client badge
- `money-bill-obligation-rows.ts` — client/member groups, carry lines, pending adjustments
- `money-bills-rows.ts` — amount format, Adjust/Collect copy, payment parse
- `money-expense-form.ts`
- `money-subscription-visibility.ts` — Due/Paid cycle filtering and count copy
- `money-stats-live.ts` / `money-stats-fixtures.ts` — Fin-Sheet cards
- `money-settings-form.ts` / `money-formula-chips.ts` / `money-cohort-allocations-fixture.ts`
- `money-currency-settings-view.tsx`, `money-formula-chip-editor-view.tsx`, `money-payout-run-view.tsx`

## Who can use it

`team.get` role must be `owner`. Non-owners get a static “Owners manage Money” panel. Queries for invoices, payouts, obligations, expenses, settings, and scoreboard are all `enabled` only when `isOwner`.

## UI sections (view)

1. **Header** — title/subtitle, settings gear (owners), `RangePresetChooser`, custom range uses the same leave/date-range calendar (open until confirm).
2. **Stats** — Fin-Sheet cards from `agencyOps.money.periodScoreboard`. Metric click jumps filters or opens expenses/settings.
3. **Bills + Expenses** — two-column from `xl`. Bills compose person groups;
   expenses split subscriptions vs one-time. Subscriptions default to Due and
   expose independent Due/Paid checkbox visibility.
4. **Money settings dialog** — rules / formulas / currency+FX panes.

Stats card ids: `income-cash`, `deductions`, `profitability`, `allocations`.  
Metric ids: `total-income`, `received`, `remaining`, `salaries`, `expenses`, `debt-discount`, `paid-vacation`, `team-profit`, `profit-loss-share`, `roi`, `device-compensation`, `charity`, `pbc`.

Bills party filters: All / Clients / Team / Adjustments. Client category filter starts as **external** when party is `all` or `client`. Status: outstanding / partial / paid / refunded.

Bills actions on the hook: preview (ephemeral invoice/payslip), Export combine|split, Adjust (Collect for clients, Pay for members; Ready soft-exports then records payment), pending discount/surcharge/debt, create invoice, create payout line, record payment.

## Data the hook loads (oRPC)

| Query | When |
| --- | --- |
| `team.get` | always (role) |
| `agencyOps.invoices.list` | owner + client bills visible |
| `agencyOps.payouts.list` | owner + team or adjustments |
| `agencyOps.periodObligations.list` | owner + client or team bills |
| `agencyOps.invoices.periodActivity` | owner + client or team |
| `agencyOps.clients.list` | always (pageSize 200) |
| `agencyOps.expenses.list` | owner |
| `agencyOps.expenses.subscriptionCycles` | owner |
| `agencyOps.salaryPool.get` | owner + team or adjustments |
| `agencyOps.moneySettings.get` | owner |
| `agencyOps.fxRates.list` | owner + settings open on currency pane |
| `team.members.list` | owner + settings open |
| `agencyOps.money.periodScoreboard` | owner |

Mutations go through `useAgencyOpsStore` (create invoice/payout/expense,
payments, status, money settings, currency, FX) plus direct Money export,
settlement, pending-adjustment, and salary-pool procedures. Expense mutations
invalidate both the expense template list and subscription-cycle read model.

Income scoreboard rule in product prefs: total income defaults to **billable external-client amounts excluding waste**; invoicing splits received vs remaining.

## Persistence (schema)

Defined in `packages/db/src/schema/agency-ops.ts`:

- `agency_ops_invoice` + `agency_ops_invoice_line_item` — client AR; `amount` / `received_amount` integer minor units
- `agency_ops_money_pending_adjustment` — discount / surcharge / debt, apply on next export
- `agency_ops_payout_run` / `_section` / `_line` — money out. Section keys: `salaries`, `team_loss`, `device_comp`, `paid_vacation`, `debt_discount`, `charity`, `pbc`
- `agency_ops_salary_pool` / `_member_settlement` — manual period salary total
  and cumulative per-member payments
- `agency_ops_money_settings` — currency + rules JSON + calc/formula JSON
  (each formula may bind `ruleId` for payout eligibility and `cohort_size`)
- `agency_ops_fx_rate` — team-owned pairs; optional live suggest
- `agency_ops_expense` — one-time expense or recurring subscription template
- `agency_ops_expense_occurrence` — immutable paid subscription-cycle snapshot
- `agency_ops_project.billable_rate_amount` — nullable project override; `null`
  inherits the client rate
- `agency_ops_project_task.billable_rate_amount` — nullable task override; `null`
  inherits project then client rate

API/services: `packages/api/src/routers/agency-ops/billing/` (`router.ts`, `service.ts`, scoreboard, export, FX, expenses, payouts, formula eval, bill carry). Waste classification for income/scoreboard uses `packages/api/src/routers/agency-ops/shared/waste-helpers.ts` (entry flag, task flag, waste-named project/task).

## Layer note for any rework

`use-agency-money-surface.ts` is the orchestration hub. Views stay props-only. Do not call oRPC from views. Do not skip service/router when adding writes. Prefer existing billing helpers over new `utils.ts` files inside the money feature.
