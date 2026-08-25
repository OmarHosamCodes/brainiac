# D01 — Instrument plates (confirmed)

**Target:** `apps/web/src/features/money/agency-money-stats-section-view.tsx`  
**Reference comp:** Open Design `d1-instrument-plates.html` (project `orch-money-stats-6-topologies-d5d1`)  
**Mode:** Operate  
**Status:** Shipped

## Job and audience

Agency **owner** on Money, mid-period or at close. They need collection status, cost base, team profit, and allocation totals in one scan — then one click into the right bills filter, expenses, formulas, or payout run.

## Selected direction

Replace the four generic metric cards with **four engineered instrument plates** aligned to member-profile `InstrumentPlate` language:

| Plate | Domain | Destination hint | Glyph | Metrics (always visible) |
|-------|--------|------------------|-------|--------------------------|
| Income | Cash in | Client bills | Collection pace bar (0–100%) | Total income, Received, Remaining |
| Deductions | Outgoing | Team / expenses | Stacked cost bars | Salaries, Expenses, Debt/Discount, Paid off days |
| Profitability | Outcome | Payout run | ROI arc | Team profit, Profit share, ROI |
| Allocations | Formula-driven | Formulas | Segment blocks | Device comp, Charity, PBC |

## Structural thesis

- **Neutral plate surfaces** (`instrumentPlateSurfaceClass`); semantic color on **glyphs and metric values only** (success for profit, warning/caution for remaining, default for neutral).
- **No Details collapsible** — every metric is a `metric-link` button in the plate grid.
- **Income plate** adds collection meter + percent label when `collectedRatio !== null`.
- **Quiet destination chip** per plate (sentence case in product: "Client bills", not shouty ALL CAPS).
- **Optional selection strip** below plates: last-focused metric + where it navigates (mirrors OD detail-panel; no blocking modal for primary path).

## Interaction

- Metric button → existing `onSelectMetric({ cardId, metricId })` (unchanged routing in hook).
- Keyboard: tab through metrics; `aria-label` includes value + action hint.
- Hover: subtle elevated row + chevron (existing pattern).
- **No plate-level morph dialog in v1** — direct metric navigation matches OD comp and reduces modal fatigue. Morph detail deferred unless user requests after ship.

## Layout

- Desktop: `grid grid-cols-4 gap-3` (plates equal width).
- Tablet: `sm:grid-cols-2`.
- Mobile: single column stack.
- Loading: four plate-shaped skeletons. Error: existing retry panel unchanged.

## Scope

**In:** Stats section view, plate glyphs, view-model plate metadata, selection hint strip.  
**Out:** Bills, expenses, settings, scoreboard API, payout-run mount (separate task — fixes broken `#money-period-run` scroll).  
**Preserve:** All 13 metrics, currency formatting (whole major units), `collectedRatio` / `collectedLabel`.

## Anti-goals

Generic SaaS hero-metric cards, hidden secondary metrics, tinted plate backgrounds, purple accents, nested cards, uppercase eyebrows on every plate.
