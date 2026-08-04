# Money bills section — design brief

**Status:** Confirmed · Crafted · Polished (instrument panel + segmented party + quiet status + ghost preview)  
**Date:** 2026-08-05  
**Surface:** Agency Management → Money (`manage=money`), below stats cards  
**Living plan:** [`docs/superpowers/plans/2026-08-04-management-money-ui.md`](../plans/2026-08-04-management-money-ui.md)

---

## 1. Feature summary

A **Bills** section lists unified money lines for the selected period (client invoice, team payout, or ops expense — one row type). This slice ships **production filter chrome + empty state only** (no rows, no fixtures). Filters match the Fin-Sheet dual money model and prepare jump-offs for later list data.

## 2. Primary user action

Choose who/what kind of bill to review, then (later) scan or open a line. Today: switch filters and see a clear empty state for that lens.

## 3. Design direction

- **Color:** Restrained — Agency / shadcn tokens; no category paint on empty state.
- **Scene:** Same ops desk as stats cards; after scanning KPIs, operator drills into bills for the period.
- **Anchors:** Airbnb sticky filter chips; Linear density; Revolut transaction-list shell; Agency Tracker segmented filters.
- **Polish (2026-08-05):** One `agencyPanelClass` instrument; default segmented party Tabs (not line); borderless status chips + Clear; “N bills” + “Showing …” summary; ghost list preview behind empty card (structure without inventing data).

## 4. Scope

| Axis          | Choice                                                             |
| ------------- | ------------------------------------------------------------------ |
| Fidelity      | Production-ready in-app                                            |
| Breadth       | Bills section under stats only (empty)                             |
| Interactivity | Filter switching; empty copy updates by filter; no create/list yet |
| Time intent   | Ship this slice                                                    |

**Out of scope:** Row data, create bill, API, metric-card → filter deep-links (can wire stubs later).

## 5. Layout strategy

1. **Instrument panel** wrapping header + filters + empty body.
2. Section header: **Bills** + search + optional “Showing {party · status}” + quiet **`N bills`**.
3. **Party rail** (segmented `TabsList` default):  
   `All` · `Clients` · `Team` · `Adjustments`
4. **Status chips** (section-specific; none = any; Clear when active):
   - **Clients:** Paid · Refunded · Partial · Outstanding
   - **Team:** Outstanding · Partial · Paid
   - **All / Adjustments:** no status chips
5. **Search** — Clients-style input; `AgencySearchHighlight` on empty copy (and future rows).
6. Empty card over faded ghost rows — preview only, not fake data.
7. Period comes from existing Money header selector (no second period control).

### Filter semantics

| Id            | Kind   | Meaning                                           |
| ------------- | ------ | ------------------------------------------------- |
| `all`         | Party  | Every unified bill                                |
| `client`      | Party  | Money in — client AR / invoices (label: Clients)  |
| `team`        | Party  | Money out — salaries / member payouts             |
| `adjustments` | Party  | Debt/Discount, charity, PBC, device comp, similar |
| `paid`        | Status | Fully settled (Clients + Team)                    |
| `refunded`    | Status | Refunded client bills only                        |
| `partial`     | Status | Installments in flight                            |
| `outstanding` | Status | Remaining > 0                                     |

**v1 interaction:** Party is exclusive (tabs). Status chips swap by party; invalid status clears on party change. Status is exclusive including implicit “any” when none selected. Clear appears when a status is selected.

## 6. Key states

| State          | Behavior                                                      |
| -------------- | ------------------------------------------------------------- |
| Default        | Party `all`, no status chip → empty “No bills in this period” |
| Filtered empty | Copy names the lens; header shows “Showing …” summary         |
| Loading        | N/A (no query)                                                |
| Error          | N/A                                                           |
| Reduced motion | Instant filter switch                                         |

## 7. Interaction model

- Party tabs: click sets `partyFilter`; focusable Tabs pattern (segmented default).
- Status chips: toggle one status or clear (click active again, or Clear).
- Empty state has **no primary CTA** this slice (no “Create bill” until create exists).

## 8. Content (UX writing)

- Section title: **Bills**
- Count: `0 bills` (pluralization ready)
- Active lens: `Showing Clients · Outstanding` (omit when All + any status)
- Empty titles (examples):
  - All: "No bills in this period"
  - Clients: "No client bills"
  - Team: "No team bills"
  - Adjustments: "No adjustments"
  - + status: "No outstanding client bills" when both set
  - + search: "No matching bills" (query highlighted via AgencySearchHighlight)
- Body: "When invoices, payouts, or expenses land in this range, they'll appear here."

## 9. Implementation notes

- ViewModel: `partyFilter`, section `statusOptions`, `statusFilter`, `searchTerm`, `activeFilterSummary`, setters, `emptyCopy`, `billCount`.
- Presentational instrument panel in view; no store/API.
- Ghost rows are presentational only — do **not** invent bill row data.
- Update living plan; keep golden layers.

## 10. Defaults locked

- Unified bill model (1A).
- Section-specific status chips; All/Adjustments have none.
- Production empty shell + search chrome.
- Period from existing Money range chooser.
