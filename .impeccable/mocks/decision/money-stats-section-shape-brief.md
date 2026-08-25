# Shape brief — MoneyStatsSection reimagined

**Target:** `apps/web/src/features/money/agency-money-stats-section-view.tsx`  
**Mode:** Operate  
**Visitor:** Agency owner reviewing period financial health before collecting bills or adjusting payouts.

## Job and audience

An owner lands on Money to answer: *How did this period perform, what is still outstanding, and where do I act next?* They arrive structured and execution-focused, often mid-month or at period close. Success is a 3-second scan of income collection, cost base, and team profit, then one click into the right bills filter or settings pane.

## Outcome and proof

- **Primary task:** Scan period health → click a metric to filter bills, open expenses, formulas, or payout detail.
- **Success:** Owner knows collection status, profit, and the largest open obligation without opening "Details" on four separate cards.
- **Product truth:** 13 Fin-Sheet metrics from `periodScoreboard`; waste excluded from total income; formulas drive allocations; click routing in `onSelectMetric` (bills filters, expenses dialog, settings formulas, `#money-period-run` scroll).

## Current diagnosis (anti-reference)

| Problem | Evidence |
|---------|----------|
| Generic SaaS card grid | 4 identical `agencyPanelClass` cards, uppercase eyebrows on each |
| Hidden metrics | 9 of 13 metrics behind per-card "Details" collapsible |
| No narrative | Income, costs, profit, allocations feel unrelated |
| Weak collection story | Progress bar only on income card; 0% collected reads as broken |
| Inconsistent with product | Member profile uses instrument plates; Money stats do not |
| Broken deep-link | Team profit / ROI scroll to `#money-period-run` but payout run is not mounted |

## Six directions (Open Design gallery generating)

| ID | Topology | Thesis | References |
|----|----------|--------|------------|
| D1 | Instrument plates | Reuse member-profile plate language: glyph + mono metric + short label; morph detail on click | Internal `InstrumentPlate`, Teenage Engineering |
| D2 | Period ledger strip | Single horizontal Fin-Sheet narrative: income → collection → costs → profit | Mercury, Brex, Productive P&L |
| D3 | Morphing scoreboard | One bento hero expands into income/cost/profit flow | Agency Dashboard project-share morph |
| D4 | Dense KPI rail | All 13 metrics visible in one strip, hairline dividers | Linear stats row, Vercel metrics |
| D5 | Hero + ledger table | Wide collection hero + grouped metric table below | Scoro reports, Fin-Sheet |
| D6 | Outcome-first arc | Team profit north-star with radial collection ring | Revolut balance card, Headspace ring |

## Scope and boundaries

- **In scope:** `MoneyStatsSection` layout, hierarchy, metric visibility, click affordances, loading/error states, responsive grid.
- **Out of scope (this slice):** Bills toolbar, expenses panel, settings dialog, scoreboard API, formula engine.
- **Must preserve:** All 13 metrics, `onSelectMetric` routing, `collectedRatio` on income, currency formatting (whole EGP display).
- **Anti-goals:** Purple gradient heroes, nested cards, uppercase eyebrow on every group, hiding metrics by default, tinted card backgrounds.

## States and ranges

- **Typical:** Mixed income/collection; non-zero salaries and expenses; positive team profit.
- **Edge:** 0% collected (current prod sample), all-zero deductions, very large amounts (500k+ EGP).
- **States:** loading (skeleton), error + retry, ready with live data.

## Interaction and layout

- Metrics are buttons with aria-labels; hover reveals chevron or focus ring.
- Income collection: meter or glyph when `collectedRatio !== null`.
- Responsive: 4 plates → 2×2 on tablet → stacked on mobile; ledger strip may wrap to two rows.
- No modal as first action; prefer inline expand or scroll-to-section (fix payout run mount when implementing D3/D6).

## Constraints

- shadcn tokens only; Poppins + IBM Plex Mono for metrics.
- Golden-file: changes stay in view + view model mapping; hook owns `statsCards` build.
- WCAG 2.1 AA contrast; `prefers-reduced-motion` for morph/expand.

## Open decisions (awaiting gallery pick)

1. Default topology (D1–D6).
2. Secondary metrics: always visible vs one-click expand vs morph dialog.
3. Whether to extract shared `MoneyInstrumentGlyph` components or inline SVG in view.
