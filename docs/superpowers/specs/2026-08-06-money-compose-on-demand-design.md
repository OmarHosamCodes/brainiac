# Money compose-on-demand — design

**Status:** Confirmed  
**Date:** 2026-08-06  
**Surface:** Agency Management → Money (`manage=money`), Bills  
**Reference UI:** Open Design `money-compose-on-demand`  
**Related:** [`2026-08-05-money-bills-section-design.md`](./2026-08-05-money-bills-section-design.md), Approach 03 merged rows

---

## 1. Feature summary

Period Bills list each client/member as a **group** with **current-period lines** and **prior-period carry lines**. Carry includes open documents (remaining > 0) and Ready activity not yet on a document. Operators preview a branded invoice/payslip **ephemerally**, export to persist (combine or split by period), and use **Adjust** for pay/partial/refund plus pending discount/surcharge/debt that feeds the next export.

## 2. Primary user actions

1. Scan April (or any period) Bills — see current + prior lines under each person.
2. Open **Preview** — on-the-fly branded invoice (client) or payslip (member); multi-select carry-ons; Export.
3. Open **Adjust** — pay / partial / refund, or add discount / surcharge / debt (+ note).

## 3. List model

- Viewing period `P` shows person groups (clients in Clients, members in Team).
- Under each group: lines for activity/docs in `P`, plus **carry** lines whose obligation period ends before `P` starts.
- **What carries:** open invoices/payout lines with remaining > 0, and prior Ready (tracked/payable with no covering document).
- Metrics per line/group: Total · Received/Paid · Remaining · Waste (contained strip).
- Trailing actions: **Preview** (invoice/payslip icon), **Adjust**.
- Settlements always post to the **original period document**.

## 4. Preview + Export

- Preview is **compose-on-demand** — not a saved draft. Dismiss without Export leaves no document state.
- Checklist = current + carry lines for that person; **Select all** available.
- **Export** persists:
  - Default: **one combined document** with line items across selected periods (period labeled on lines).
  - Toggle: **Split by period** → one document per selected period.
- Pending Adjust deltas (discount / surcharge / debt + note) appear in compose totals and apply on Export.

## 5. Adjust + soft-export

- **Pay / Partial / Refund** — money movements on a document.
- **Adjustments** — discount / surcharge / debt amount + optional note; stored as pending until Export (or reflected in compose).
- Target = line opened from (current or prior).
- **Ready** target: Pay/Partial **soft-exports** first — creates the period invoice/payout for that original period, then records payment (idempotent ensure).
- Refund only when received/paid > 0.
- After soft-export, Ready becomes a real document line in the original period; later months still show remaining as prior carry until settled.

## 6. Data & API

| Concern | Approach |
| ------- | -------- |
| Documents | Keep `agency_ops_invoice` / payout run+line; `receivedCents` / `paidCents` counters |
| Pending adjustments | `agency_ops_money_pending_adjustment` — team, partyType (`client`\|`member`), partyId, optional period, kind (`discount`\|`surcharge`\|`debt`), amountCents, note |
| No shadow drafts | Persist only on Export or soft-export-on-pay |
| List | Period bills payload includes current lines + carry-in + pending adjustments |
| Export | `exportMoneyDocuments` — selected obligations, combine\|split, apply pending |
| Adjust | Soft-export-if-Ready then existing payment recorders; pending upsert/list |

## 7. Web layers (golden file)

- Pure row/carry helpers + tests in `apps/web/src/features/billing/`.
- Hook orchestrates queries/mutations/ViewModel; view is presentational.
- API routers thin → services with `actorUserId` + `requireTeamMembership`.

## 8. Testing

- Unit: carry-in selection, compose totals with adjustments, combine vs split grouping, soft-export-then-pay idempotency.
- API: payment on Ready creates original-period doc; later period list surfaces remaining until settled.
- UI: preview closes without persist; export multi-select; Adjust hub paths.

## 9. Out of scope

- Full PDF print pipeline beyond on-screen branded preview.
- Payment ledger rewrite (counters stay).
- Scoreboard cash-basis rewrite beyond list carry-in.
- Replacing Adjustments party-tab payout sections (`debt_discount`, etc.).

## 10. Success criteria

- Late client pay and partial member salary are visible and actionable from a later month without hunting the old period.
- Preview never creates docs; Export and soft-export are the only persist paths for new docs.
- Combine/split export and pending adjustments behave as specified above.
