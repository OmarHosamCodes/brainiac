# Shape brief — Money ledger unified merge (D5)

**Target:** `apps/web/src/features/money/agency-money-surface-view.tsx` and downstream Bills + Expenses views  
**Mode:** Operate  
**Visitor:** Agency owner closing a period — collect client bills, pay team/adjustments, record expenses, without relearning two different row languages.

**Status:** Proposed — awaiting confirmation before implementation.

## Job and audience

Money’s lower half currently splits **Bills** (Clients · Team · Adjustments, instrument rows, search, shadcn Tabs) and **Expenses** (scoreboard strip, glyph plates, morph filter pills). The owner scans both columns to answer: *who do I collect from, who do I pay, what ops spend is due?* Success = one scannable ledger with consistent row anatomy, filters that behave the same, and all existing dialogs/flows preserved.

## Outcome and proof

| Task | Success signal |
|------|----------------|
| Find largest client receivable | Clients filter → largest **Remaining** amount visible without horizontal scroll at ~1310px |
| Pay team salary partial | Team filter → Team salaries row + member rows share row language; Pay action obvious |
| Record expense | Expenses filter → glyph + Record/Pay link on due rows |
| Deep-link from stats plate | Income → Clients; Deductions → Team or Expenses; Profitability → Adjustments — filter pill activates, list scrolls into view |
| Arabic client/task names | `dir="auto"`, truncate + title, amount column never clips |

**Product truth preserved:** compose-on-demand bills, salary pool, adjustment types, expense subscription cycles, all 11 dialogs, golden-file hook → container → view split, semantic color on glyphs/badges/amounts only (not plate backgrounds).

## Selected direction — D5 · Unified Operate Ledger

Replace the `xl:grid-cols-[1.35fr_1fr]` twin panels with **one full-width ledger panel** below instrument plates.

### Structural thesis (best of both)

| Keep from Bills | Keep from Expenses | Merge rule |
|-----------------|-------------------|------------|
| Client hue mark, member avatar | Neutral instrument glyph plate | **Mark column** — party-specific, always `size-9 rounded-xl` |
| Search + bill count | Period spend insight + count | **Header band 2** — contextual insight line per active party |
| Party Tabs (Clients/Team/Adjustments) | Morph filter pills (`LayoutGroup`) | **Party pills** — morphing pills, not shadcn Tabs |
| Semantic status Badge on bills | Neutral Badge on expenses | **Status** — Badge; semantic tint only when status is actionable (Due/Outstanding/Ready), muted secondary when Paid |
| Instrument row meta rail | Mono meta + amount micro-label | **Shared row grid** — one `MoneyLedgerRow` component |
| Section insight (“7 accounts still open…”) | Urgency-sorted strip | **Insight strip** under pills when filter ≠ Expenses |
| Nested section headers (Clients/Team) | Single list | **Section labels** — quiet uppercase label only when `partyFilter === all` and both groups visible |

### Topology

```
┌─ Money stats instrument plates (unchanged) ─────────────────────────┐
└─────────────────────────────────────────────────────────────────────┘
┌─ Ledger panel (single agencyPanelClass) ────────────────────────────┐
│ Band 1: Ledger · [search…………] · count · [+] contextual add        │
│ Band 2: [Clients] [Team] [Expenses] [Adjustments]  (+ morph bg)   │
│ Band 3: insight line OR period spend (contextual)                   │
│ Optional: status pills (Outstanding / Ready / Paid) + filter chips  │
├─────────────────────────────────────────────────────────────────────┤
│ ul — unified MoneyLedgerRow list (divide-y, no nested card chrome)  │
│   [mark] [name + badge] [meta mono]     [REMAINING] [action link]   │
│ …                                                                   │
│ Team salaries pool row (Team/Adjustments only, unchanged logic)     │
└─────────────────────────────────────────────────────────────────────┘
```

### Row anatomy (canonical)

```
[Mark 36px] | [Identity flex-1 min-w-0] | [Amount column shrink-0 text-end]
```

- **Mark:** `BillClientMark` · `AgencyMemberAvatar` · `ExpenseStripGlyph` · adjustment glyph (new, same plate language as expenses)
- **Identity line 1:** name button (link) + `Badge` status
- **Identity line 2:** mono meta (`period · hours · totals` or `Monthly · next due`)
- **Amount column:** micro-label (`REMAINING` / `PAID` / `DUE`) + mono amount; paid/muted vs highlighted follows expenses rule
- **Action:** `Pay` · `Record` · `Export` · `Adjust` as link button; rest opacity until row hover/focus

### Party pill behavior

| Pill | List source | Primary + action | Insight line |
|------|-------------|-------------------|--------------|
| Clients | Client bill rows | Create invoice | Compose insight (open / ready) |
| Team | Member payout rows + salary pool | — | Team open count |
| Expenses | Expense strip items | Add expense | Period spend total |
| Adjustments | Adjustment bill rows | Add adjustment | Adjustment due summary |

Default pill: **Clients** (cash-in first). Stats deep-links set pill + optional status chip (existing hook handlers, retargeted).

### Responsive

| Breakpoint | Behavior |
|------------|----------|
| `xl+` | Full-width ledger; search inline in header |
| `md` | Party pills wrap; meta collapses to one line |
| `sm` | Search full width below title; amount stays right column |
| narrow | Amount stack below name only if <360px content width |

## Scope

**In:** Unified ledger section view, shared row component, shared filter pill, party pill bar, hook view-model merge (`ledger` namespace), surface view layout (single panel), stats deep-link retarget, harmonized loading/error/empty states.

**Out:** Stats plates, Money settings, all bill/expense dialogs and API layers, scoreboard formulas, payout-run section (removed).

**Anti-goals:** Two different row styles side by side; per-row nested cards; colored amount columns; reintroducing payout-run block; new dependency; Form/react-hook-form migration.

## States

- **Loading:** 6 skeleton rows matching mark + 3-column anatomy
- **Error:** shadcn retry panel (match expenses pattern)
- **Empty per pill:** dashed `Card` empty state with contextual copy (reuse existing empty copy helpers)
- **Salary pool:** pinned after Team member rows when pool exists
- **Search no results:** inline empty, don not clear party pill

## Interaction & motion

- Party + status pills: `LayoutGroup` + `layoutId="money-ledger-party-bg"` (expenses pattern)
- List: `AnimatePresence` keyed by `partyFilter + statusFilter`; row stagger cap 8
- Hover: row `bg-elevated/25`; action link opacity 80 → 100
- `motion-reduce:transition-none` on all transitions

## Design inspiration anchors

- **Linear / Revolut operate density:** monochrome surfaces, one action row, transaction list scan rhythm
- **Airbnb filter chips:** morph selected pill, horizontal wrap, persistent filters above list
- **Orch D01 instrument plates:** neutral surfaces, semantic color only on marks/badges/values
- **Orch D4 expenses strip:** glyph plates, amount hero, minimal chrome (already shipped)

## Open decisions (confirm before build)

1. **Default pill:** Clients (recommended) vs All-first combined list?
2. **Adjustments:** Fourth top-level pill (recommended, matches stats routing) vs nested under Team?
3. **“All” pill:** Omit (recommended — reduces cognitive load) vs show merged urgency list?
4. **Add button:** Single contextual + (recommended) vs split + icons per party?

## Confirmation

Reply **confirm D5** (with any open-decision choices) to proceed to Open Design comps + implementation plan execution.
