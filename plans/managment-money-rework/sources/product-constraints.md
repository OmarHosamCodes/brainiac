# Locked Money product constraints

Copied from current workspace prefs and earlier Money plans. Override only if this rework explicitly changes them.

## Language and money model

- Product word is always **amount**. Integer minor units in storage/API. Never say “cents” in UI or API.
- One **agency currency** (ISO 4217) on money settings. Soft-locked once money data exists.
- Foreign inputs store source amount/currency plus FX-resolved agency `amount`. FX rates are team-owned; live suggest is optional.
- Total income defaults to **billable external-client** amounts **excluding waste**. Invoicing moves amounts into received vs remaining.
- Client bills use an **external** filter badge; dismissing it also shows internal clients.

## Bills (compose-on-demand)

Prior plan: `docs/superpowers/plans/2026-08-06-money-compose-on-demand.md`  
Spec: `docs/superpowers/specs/2026-08-06-money-compose-on-demand-design.md`

- Period groups show **current plus prior-period carry** as nested narrower sub-rows under the main balance.
- Preview (invoice / payslip) is **ephemeral**, not persisted.
- Export supports carry-on multi-select: **combine** or **split by period**.
- Adjust: collect / pay / refund / partials, plus discount / surcharge / debt.
- Client Adjust is **Collect**. People/member Adjust stays **Pay**.
- Paying **Ready** soft-exports then records payment.

## Expenses and payouts

- Expenses: subscriptions + recent one-time. Pay must **advance next due** for
  subscriptions and persist an immutable paid occurrence for the completed
  cycle. Paid cycles leave the default Due list but remain in the selected
  period’s Expenses total. The Subscriptions menu can independently show Due
  and Paid cycles; paid rows are read-only.
- Payout formulas/rules apply from Money settings (rules + chip/token formulas).
- A manual Team salary pool takes precedence over rate-derived member salary
  lines for that period. Partial/final member settlements reduce the pool’s
  shared remaining amount; the scoreboard uses the full pool total.
- Effective client income/invoice rate is project override → client rate.
  Projects with no override inherit automatically.
- Money cohort **Rules** define who qualifies; **Formulas** calculate amounts.
  Formulas may bind a rule via `ruleId` for payout eligibility and `cohort_size`.
- Fin-Sheet mental model (stats cards): income-cash, deductions, profitability, allocations. Original UI plan: `docs/superpowers/plans/2026-08-04-management-money-ui.md`. Domain reference: `artifacts/Fin-Sheet.csv`.
- Currency/FX plan: `docs/superpowers/plans/2026-08-06-agency-currency-amount.md`.

## Chrome and UX

- Money lives under Agency Management Commercial hub (`/agency/management/money`). Tags and Rates are **not** Management nav panes; member rates stay under People.
- shadcn theme tokens only. No liquid glass. Prefer existing Agency UI classes.
- Money dialogs reuse the Dashboard command-bar **client chooser** (single-select) and the member-profile off-day **time-range chooser**.
- Leave/date-range calendars stay open until explicit confirm.
- Default Dashboard/Money/member-profile range: current calendar month clamped to tenure window (not a quarter).
- Global toasts: bottom-right.

## Engineering

- Golden-file pattern. Agency Time Tracking is the exemplar, but Money already follows the same container/hook/view split.
- Routers stay thin; services take `(actorUserId, input)` and `requireTeamMembership` before protected reads/writes.
- Actor identity comes from session, never from the client.
- `bun run check`, `check-types`, `check:conventions` before finish. Conventional commits.

## Waste (cross-surface)

- Waste totals include entry `isWaste`, waste-flagged tasks, and word-boundary
  “waste” in project/task names — not the entry flag alone.
- Shared helper: `packages/api/src/routers/agency-ops/shared/waste-helpers.ts`
- Money income excludes waste; displayed hour totals subtract waste everywhere
  reports and dashboards show paid/waste/internal breakdowns.

## Out of scope unless this rework says otherwise

- Polar SaaS billing / upsell chrome
- PDF/email send of invoices
- Restoring Management Rates as a nav pane
- Changing Tracker/Reports waste UX (waste still subtracts from displayed totals; Money income excludes waste; classification uses shared waste helpers)
