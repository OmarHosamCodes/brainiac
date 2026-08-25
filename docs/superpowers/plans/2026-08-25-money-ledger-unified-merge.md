# Money Ledger Unified Merge (D5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Bills and Expenses into one full-width Operate ledger with shared row anatomy, morph party pills, and preserved dialogs/API behavior.

**Architecture:** Extract presentation into `money-ledger-row.tsx` + `money-ledger-section-view.tsx`; extend `use-agency-money-surface` with a `ledger` view-model that composes existing bills/expenses data; replace the two-column grid in `agency-money-surface-view.tsx` with the unified section. No API or router changes.

**Tech Stack:** React 19, motion/react, shadcn (`Badge`, `Button`, `Input`, `Card`, `Dialog`, …), existing billing helpers.

## Global Constraints

- Golden-file layers: hook → container → view; views do not call oRPC or stores.
- Operate mode: motion ≤220ms; `prefers-reduced-motion` respected.
- Neutral plate/card surfaces; semantic color on marks, badges, amounts, actions only.
- All bill and expense dialogs unchanged unless explicitly reshaped later.
- Bun only; `bun run check`, `check-types`, `check:conventions` before done.
- Product language: `amount` not cents; Team not People in UI copy.

---

### Task 1: Ledger row types and mark resolver

**Files:**
- Create: `apps/web/src/features/money/money-ledger-row.tsx`
- Create: `apps/web/src/features/money/money-ledger-row.test.ts`
- Create: `apps/web/src/features/money/money-ledger-types.ts`

**Interfaces:**
- Produces: `MoneyLedgerRowModel`, `MoneyLedgerMark` discriminated union (`client` | `member` | `expense` | `adjustment`), `moneyLedgerAmountTone(item)`, `moneyLedgerRowClass`

- [ ] **Step 1: Write failing tests for amount tone and mark union exhaustiveness**

```typescript
import { describe, expect, it } from "bun:test";
import { moneyLedgerAmountTone } from "./money-ledger-row";

describe("moneyLedgerAmountTone", () => {
  it("mutes paid rows", () => {
    expect(moneyLedgerAmountTone({ statusLabel: "Paid", canRecordPayment: false })).toBe("muted");
  });
  it("highlights actionable rows", () => {
    expect(moneyLedgerAmountTone({ statusLabel: "Due", canRecordPayment: true })).toBe("highlighted");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `bun test apps/web/src/features/money/money-ledger-row.test.ts`

- [ ] **Step 3: Implement types + tone helper + presentational `MoneyLedgerRow`**

Row props: mark, name, statusLabel, meta, amountLabel, amountColumnLabel, actionLabel, onNameClick, onActionClick, note?, dir auto on name.

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/money/money-ledger-row.tsx apps/web/src/features/money/money-ledger-row.test.ts apps/web/src/features/money/money-ledger-types.ts
git commit -m "feat(money): add shared ledger row primitive"
```

---

### Task 2: Party pill + filter bar component

**Files:**
- Create: `apps/web/src/features/money/money-ledger-filter-bar.tsx`
- Modify: `apps/web/src/features/money/money-motion.ts` (reuse `moneyBaseTransition`)

**Interfaces:**
- Consumes: `moneyBaseTransition`
- Produces: `MoneyLedgerPartyPill`, `MoneyLedgerFilterBar` with morph `layoutId="money-ledger-party-bg"`

- [ ] **Step 1: Extract pill from expenses `ExpenseFilterPill` pattern into shared component**
- [ ] **Step 2: Wire party options: Clients, Team, Expenses, Adjustments**
- [ ] **Step 3: Optional status pill row when party supports status filters**
- [ ] **Step 4: Run `bun run check-types` on web package**

---

### Task 3: Hook — ledger view model composition

**Files:**
- Modify: `apps/web/src/features/money/hooks/use-agency-money-surface.ts`
- Create: `apps/web/src/features/money/money-ledger-build.ts`
- Test: `apps/web/src/features/money/money-ledger-build.test.ts`

**Interfaces:**
- Consumes: existing `bills`, `expenses`, `expenseStripItems`, bill row mappers
- Produces: `ledger: { partyFilter, partyOptions, onPartyChange, rows: MoneyLedgerRowModel[], insightLabel, searchTerm, onSearchChange, headerCountLabel, onPrimaryAdd, statusFilters, empty, loading, error, … }`

- [ ] **Step 1: Write tests mapping party filter → row source (clients vs expenses vs team)**
- [ ] **Step 2: Implement `buildMoneyLedgerRows(party, bills, expenses)` pure function**
- [ ] **Step 3: Map `onSelectMetric` to `ledger.onPartyChange` (replace separate bill/expense navigation where duplicated)**
- [ ] **Step 4: Retain `bills` and `expenses` dialog slices on view model for unchanged dialogs**
- [ ] **Step 5: Run tests + typecheck**

---

### Task 4: Unified ledger section view

**Files:**
- Create: `apps/web/src/features/money/agency-money-ledger-section-view.tsx`
- Create: `apps/web/src/features/money/containers/agency-money-ledger-section-container.tsx` (if golden pattern requires — else bind in existing container)

**Interfaces:**
- Consumes: `AgencyMoneySurfaceViewModel["ledger"]`, `MoneyLedgerRow`, `MoneyLedgerFilterBar`
- Mounts: all existing bill + expense dialogs via re-export or sibling mount from surface view

- [ ] **Step 1: Build section shell (header, search, count, contextual +)**
- [ ] **Step 2: Render filter bar + insight line**
- [ ] **Step 3: Map `ledger.rows` → `MoneyLedgerRow` with correct mark components**
- [ ] **Step 4: Team salaries pool footer (reuse existing salary pool subview from bills)**
- [ ] **Step 5: Loading / error / empty states aligned to expenses dashed Card pattern**

---

### Task 5: Surface integration + remove twin grid

**Files:**
- Modify: `apps/web/src/features/money/agency-money-surface-view.tsx`
- Modify: `apps/web/src/features/money/agency-money-surface-container.tsx` (if present)

- [ ] **Step 1: Replace grid with single `MoneyLedgerSection`**
- [ ] **Step 2: Keep dialog mounts (`MoneySettingsDialog`, bill dialogs, expense dialogs) at surface level**
- [ ] **Step 3: Deprecate direct `BillsSection` / `ExpensesSection` mount — leave files until Task 6 cleanup**

---

### Task 6: Adjustment glyph + visual harmonization pass

**Files:**
- Create: `apps/web/src/features/money/money-ledger-adjustment-glyph.tsx`
- Modify: `apps/web/src/features/money/agency-money-bills-section-view.tsx` (optional: thin re-export wrapper only)

- [ ] **Step 1: Add adjustment instrument glyph matching expense strip plate size**
- [ ] **Step 2: Browser verify at 1310px and ~360px — screenshot pass**
- [ ] **Step 3: Run `node .claude/skills/impeccable/scripts/detect.mjs --json apps/web/src/features/money/agency-money-ledger-section-view.tsx`**

---

### Task 7: Cleanup and golden inventory

**Files:**
- Modify: `apps/web/src/features/money/agency-money-bills-section-view.tsx` — extract shared pieces or mark `@deprecated` section wrapper
- Modify: `apps/web/src/features/money/agency-money-expenses-section-view.tsx` — same
- Run: `bun run check:golden` if files added

- [ ] **Step 1: Remove unused twin-panel exports if fully superseded**
- [ ] **Step 2: Update `money-stats-plate-meta` destination hints if needed (Clients / Team / Expenses / Adjustments)**
- [ ] **Step 3: Definition of done — `bun run check`, `check-types`, `check:conventions`**

---

## Test plan (manual)

- [ ] Stats Income → Clients pill active, client rows visible
- [ ] Stats Expenses → Expenses pill, period spend insight
- [ ] Stats Profitability → Adjustments pill
- [ ] Pay subscription + Record one-time expense from ledger rows
- [ ] Export client bill from client row actions
- [ ] Arabic name truncation with title tooltip
- [ ] Filter pill morph animation; reduced motion off
