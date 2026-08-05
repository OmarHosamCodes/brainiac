# Money income flow — Approach 02 (segmented bar)

**Status:** Confirmed · Crafted (Approach 02)  
**Date:** 2026-08-05  
**Surface:** Agency Management → Money (`manage=money`) Bills + Income & cash scoreboard  
**Open Design:** [money-income-flow-visuals](http://127.0.0.1:7456/api/projects/money-income-flow-visuals/raw/index.html) · Approach 02 Segmented bar  
**Prior:** [`2026-08-04-money-stats-cards-design.md`](./2026-08-04-money-stats-cards-design.md), [`2026-08-05-money-bills-section-design.md`](./2026-08-05-money-bills-section-design.md)

---

## 1. Feature summary

Make Income & cash **conserved**: Total income is all **external billable** tracked value (waste excluded). Invoicing moves value into **Remaining** (unpaid) or **Received** (paid). Waste stays outside Total and is **not** a scoreboard metric.

On every **client** bill row, replace the old subtitle (“Ready to bill from tracked time” / invoice meta-only line) with Approach 02’s **allocation block**: Received / Remaining / Uninvoiced labels + proportional segmented bar + Total + Waste chip.

## 2. Accounting model

```text
Total income ≈ Uninvoiced + Remaining + Received
Waste ∉ Total
```

| Metric                            | Definition                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Billable pool**                 | Σ (non-waste duration × member billable rate) for **external** clients in the active Money period |
| **Total income**                  | `max(billablePool, received + invoicedRemaining)` so over-invoicing never breaks the card         |
| **Received**                      | Invoice payments in period (unchanged)                                                            |
| **Remaining**                     | Invoiced unpaid (`invoiceSummary.remainingCents`) — **not** `total − received`                    |
| **Uninvoiced** (implicit on card) | `max(0, total − received − remaining)` — not a fourth card metric                                 |
| **Waste**                         | Non-waste-excluded value of `isWaste` time × rates; row chip only                                 |

Team profit / ROI continue to use Total income as today (now including uninvoiced billable).

## 3. Row visual (Approach 02)

Under the client title (keep status chip on invoices):

1. **Bar labels** — Received · Remaining · Uninvoiced (tabular amounts)
2. **Segmented bar** — success / caution / muted segments; widths share of **Total** (skip 0-width segments)
3. **Footer** — `Total …` left · **Waste** chip right (always show chip; `0` when none)
4. Trailing amount / actions unchanged

| Row kind                  | Total          | Received         | Remaining         | Uninvoiced | Waste                        |
| ------------------------- | -------------- | ---------------- | ----------------- | ---------- | ---------------------------- |
| `client-activity` (ready) | billable cents | 0                | 0                 | = Total    | client waste cents           |
| `invoice`                 | invoice amount | invoice received | invoice remaining | 0          | client waste cents in period |

Team / adjustment rows keep existing subtitle treatment (out of scope).

## 4. Scope

| In                                                          | Out                                            |
| ----------------------------------------------------------- | ---------------------------------------------- |
| Scoreboard Total / Remaining math                           | Waste on Income & cash card                    |
| Client row allocation UI                                    | Merged per-client rows (Approach 03)           |
| Period activity money fields for clients                    | Compact strip (Approach 01)                    |
| Exclude waste from invoice line pricing (same product rule) | Internal clients in Total (external-only pool) |

External filter badge on Bills still hides internal **rows**; scoreboard Total stays external-only regardless of badge.

## 5. Layers

```text
period-scoreboard (+ tests)
→ money-scoreboard-service (billable pool query)
→ period-bill-activity / listPeriodBillActivity (billable/waste cents)
→ invoice create (exclude isWaste entries)
→ router Zod
→ money-bills-rows allocation helpers + BillListRow view
→ use-agency-money-surface wiring
```

## 6. A11y / motion

- Bar is `role="img"` (or `meter` group) with a concise `aria-label` summarizing the four figures.
- `prefers-reduced-motion`: no segment grow animation; static widths.
- Waste chip is text, not color-only.

**Also:** Team bill rows (ready members + payout lines) use the same Approach 02 allocation with Paid / Remaining / Ready vocabulary; waste excluded from payout drafts.

1. With only uninvoiced external billable time, Total income equals that pool; Received/Remaining = 0.
2. Creating an invoice (no payment) moves that slice into Remaining; Total stays stable when pool was the source.
3. Payment moves Remaining → Received; collected % = Received / Total.
4. Ready and invoice client rows show the segmented allocation; old “Ready to bill…” subtitle gone.
5. Waste chip visible; waste not counted in Total / bar segments.
6. `bun run check` · `check-types` · `check:conventions` · targeted tests pass.
