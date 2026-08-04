# Money stats cards — design brief

**Status:** Confirmed · Crafted (stats cards)  
**Date:** 2026-08-04  
**Surface:** Agency Management → Money (`manage=money`)  
**Living plan:** [`docs/superpowers/plans/2026-08-04-management-money-ui.md`](../plans/2026-08-04-management-money-ui.md)

---

## 1. Feature summary

Four Fin-Sheet-shaped **stats cards** at the top of Money give operators a tenure-clamped **active month** scoreboard: income/cash, deductions, profitability, and extra allocations. Cards are **jump-off points** — each metric (and optionally the card) is selectable so later parts can open detail; this slice ships production UI with fixture numbers and wired select handlers that no-op until detail exists.

## 2. Primary user action

Scan the active month’s money health in one viewport, then click a metric to go deeper (detail TBD).

## 3. Design direction

- **Color:** Restrained — shadcn / Agency tokens only; no category color paint on cards.
- **Scene:** An agency owner or ops lead at a desk, light product UI, checking whether this month’s cash and payouts are on track.
- **Anchors:** Agency Dashboard panels (`agencyPanelClass` + mono metrics); Fin-Sheet row vocabulary; Stripe-style metric density without Stripe chrome.

## 4. Scope

| Axis          | Choice                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| Fidelity      | Production-ready in-app                                                                   |
| Breadth       | Money page header + 4-card grid only                                                      |
| Interactivity | Selectable metrics (jump-off); period fixed to tenure active month (no picker this slice) |
| Time intent   | Ship this slice                                                                           |

## 5. Layout strategy

1. Existing **Money** title + subtitle.
2. Quiet **period chip** under subtitle: active month label (e.g. “August 2026”) — tenure-clamped current calendar month (same mental model as Dashboard / member profile default).
3. **Responsive grid:** 1 col → 2 cols (`sm`) → 4 cols (`xl`) of equal cards.
4. Each card: card title (sentence case) → stacked metric rows (label left, mono value right). Numbers right-aligned / tabular.
5. No nested cards. No decorative charts this slice.

### Cards & metrics (Fin-Sheet vocabulary)

| Card                       | Metrics                                                    |
| -------------------------- | ---------------------------------------------------------- |
| **Income & cash flow**     | Total income · Received · Remaining                        |
| **Deductions & expenses**  | Salaries · Expenses · Debt / Discount · 200H paid vacation |
| **Profitability metrics**  | Team profit · Profit share / Loss share · ROI              |
| **Additional allocations** | Device compensation · Charity · PBC                        |

Money **settings** (gear in header) opens a team-settings-style dialog: **Rules** (cohorts) · **Formulas** (ROI vars, charity, P/L share, paid vacation, …).

## 6. Key states

| State          | Behavior                                                                         |
| -------------- | -------------------------------------------------------------------------------- |
| Default        | Fixture amounts for active month; all metrics selectable                         |
| Loading        | Skeleton panels matching card grid (when real query lands; fixtures may skip)    |
| Empty / zero   | Show `0` (or `—` for undefined ROI only if fixture lacks it) — never hide rows   |
| Error          | Soft error panel under header (Part later when API exists); fixtures won’t error |
| Reduced motion | No entrance choreography                                                         |

## 7. Interaction model

- Metric row is a **button** (full-width row): hover/focus via `agencyFocusRingClass`; optional quiet chevron.
- `onSelectMetric({ cardId, metricId })` on ViewModel — **stub no-op** this slice (no toast spam); ready for Part detail.
- Card title is not required to be clickable (metric-level jump-offs are enough).
- No month picker yet; period is derived (tenure active month).

## 8. Content requirements

- Page title/subtitle unchanged.
- Period label: month + year, localized.
- Card titles / metric labels as table above (sentence case; keep “Debt / Discount”, “200H paid vacation”, “PBC”).
- Currency: team currency later; fixtures use a single currency string (e.g. EGP) with `Intl.NumberFormat`.
- No empty-state marketing copy on the grid.

## 9. Implementation notes (for after confirm)

- Golden layers: `agency-money-surface*` under `features/billing/` (or `money/` if preferred — **prefer `billing/`** to keep domain).
- Hook returns fixture `statsCards` + `periodLabel` + `onSelectMetric`.
- Mount from `agency-management-surface` when `manage=money` (replace title-only branch for money only; Rates stays title-only).
- Update living plan Part “stats cards”; regenerate golden inventory.

## 10. Recommended impeccable refs (implement)

`product.md` · Agency `agency-ui` · Dashboard panel density — skip brand/landing refs.

## 11. Defaults locked

- **ROI:** display fixture number only; formula deferred to backend/Fin-Sheet rule later.
- **PAC:** omitted (not in your Card 4 list).
- **Tenure active month:** reuse shared tenure/month helpers if present (`use-agency-time-range-filters` mental model); do not invent a second period system.

---

**Confirm or override** this brief (especially: metric-row jump-offs vs whole-card jump-offs, and `billing/` folder). After you confirm, we implement.
