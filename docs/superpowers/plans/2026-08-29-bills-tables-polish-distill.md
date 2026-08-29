# Bills tables polish + distill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distill the Agency Money Bills tables to a three-band Operate ledger (north-star remaining, party tabs, dense table) and polish the row-to-sheet Collect/Pay path so first-time owners can settle a period without hunting.

**Architecture:** Refinement of `feat/bills-tables`, not a redesign. Pure display helpers stay in `money-bills-table-columns.ts`. Chrome, tables, and sheets stay presentational views; hooks drop the leftover Expenses catalog dialog. Existing preview/adjust/pay dialogs and toasts stay the action surface.

**Tech Stack:** React 19, shadcn Table/Sheet/Tabs/Select/Badge/Button, existing `money-panel-chrome`, Bun tests.

## Global Constraints

- Visitor mode: Operate. Quiet instrument. DESIGN.md world unchanged.
- Golden-file: views presentational; hooks own state; no router/service/schema work.
- Product language: `amount` not cents; Team not People; no em dashes in UI copy.
- Semantic color only on status badges, open remaining (warning), and Ready (action). Amounts otherwise mono.
- Party profile/client navigation lives in the **sheet title** only. Table row click opens the sheet. Do not put `Link` on table party names (walkthrough: name-as-link steals the row action).
- Reuse `MoneyPanelMetricBlock` for Remaining / Period spend. Do not invent a second metric treatment.
- Dialogs (preview, export, adjust, create, expense pay/edit) stay. Do not reimplement compose.
- `prefers-reduced-motion` already on Sheet/primitives; do not add decorative motion.
- Bun only. `bun run check`, `check-types`, `check:conventions` (Money files only), `check:golden` if files are added. Covering tests in `apps/web/src/features/billing/*.test.ts`.
- Work from `/home/omar/Projects/brainiac/.worktrees/bills-tables` on `feat/bills-tables`.

---

## Distill thesis (what gets removed)

Primary goal: **see remaining, open the right party, Collect/Pay.**

| Cut | Why |
| --- | --- |
| `MoneyPanelCount` ("N bills") | Insight already says "10 accounts still open · 13 ready to export" |
| "All expenses" header button + catalog dialog | Same items as the Expenses table, grouped; Kind column + filter Select cover it |
| Empty-state ghost preview + gradient overlay | Second empty competing with the real empty card |
| Table party `Link`s | Clicking the name navigates away; row click is the Collect/Pay path |
| Client hue status-dot overlay | Loud; initials mark is enough |
| Carry column when every group has 0 carry | Empty column is noise |
| Duplicate Remaining inside expense/adjustment sheet body | Header already owns Remaining |
| Generic sheet copy ("Expense details", "N bill lines") | Not outcome language |
| Status Select beside search | Reads as search-scope; belongs with party Tabs |
| Instrument-row loading skeleton | Lies about the surface; use a table skeleton |

Keep: Add menu, FX apply line, External dismissible chip, party Tabs, status/expense Select, search, tables, sheets, dialogs, salary-pool footer, waste column (when any waste > 0).

---

## Growth Design Audit (current tables, 2026-08-29)

Standard SaaS Operate ledger. Not AI-native. Frameworks: Psych, B.I.A.S., C.L.E.A.R., Dashboard rules of thumb, Psychological triggers.

### 1. Psych Framework Analysis

**Net Perceived Value Assessment:**
- **Motivation signals found:** Remaining amount; insight ("accounts still open", "ready to export"); warning tone on open remaining; Collect/Pay in sheet footer; toasts ("Collection recorded").
- **Friction points found:** Five header bands; status Select next to search; party name is a navigation link; Collect is one click behind the row with no row-level cue; "All expenses" is a second catalog; loading still looks like the old instrument list.
- **Psych Additions present:** Insight as progress marker; toast on settle; selected-row highlight.
- **Psych Subtractions to fix:** Redundant count; catalog dialog; ghost empty; duplicate Remaining in sheets; "Due/meta" jargon; "Expense details" non-copy.
- **Labor Illusion usage:** Missing. Bills loading is three fake instrument rows. Replace with a table skeleton whose `aria-label` is "Loading this period's bills".

### 2. B.I.A.S. Behavioral Audit

| Dimension | Status | Finding |
| :--- | :---: | :--- |
| **Block** (Visual Hierarchy & Trust) | Fail | Remaining is `text-sm` in a wrap row under Tabs, not the north-star. Hue dots and badges compete with it. |
| **Interpret** (Clarity over Cleverness) | Fail | "Due/meta", "Mixed", "Expense details", "N bill lines" do not state the job. |
| **Act** (Decision Simplicity) | Fail | Row click vs name link vs All expenses vs Add vs status Select. Collect is not visible from the table. |
| **Store** (Peak-End Rule) | Pass | Settle toasts already exist (`Collection recorded` / `Payment recorded`). Keep sheet open so Remaining updates. Do not add a second success chrome. |

### 3. C.L.E.A.R. Scorecard

| Dimension | Score (1-5) | Finding |
| :--- | :---: | :--- |
| **C** - Copywriting | 2/5 | Outcome copy is the insight line only. Sheets and empty states describe structure, not the job. |
| **L** - Layout | 3/5 | Tables scan. Chrome is still five stacked bands. Status lives in the search cluster. |
| **E** - Emphasis | 3/5 | Open remaining is warning (good). Ready uses the same outline badge as Partial. Remaining strip is too small. |
| **A** - Accessibility | 4/5 | Row keyboard, sheet labels, mobile `side=bottom` + max-height. Table Links confuse the row hit target. |
| **R** - Reward | 3/5 | Toasts on settle. No labor illusion on load. Pending CTAs disable without "Saving…". |
| **Total Score** | **15/25** | Target after this plan: Copy 4, Layout 4, Emphasis 4, A11y 4, Reward 4 = **20/25** |

### 4. UI Rules of Thumb

- **Page Type Identified:** Dashboard / dense Operate table (period close).
- **Rule 1 North-star at top:** Remaining must use `MoneyPanelMetricBlock` (label + `text-base` mono value + insight hint), above Tabs, not a wrap line below them.
- **Rule 2 Eliminate chart junk:** Drop hue dots, empty Carry column, ghost empty, extra count, catalog dialog.
- **Rule 3 Action-required distinct:** `Ready` badge uses `default` (filled). `Outstanding` stays `warning`. `Paid` stays `success`. `Partial` / `Mixed` / `Refunded` stay `outline`. Open remaining stays `text-warning`.

### 5. Psychological Triggers

- **IKEA Effect:** Present (party Tabs, status Select, Add menu). Do not add more customization.
- **Zeigarnik Effect:** Insight line is the open-loop ("N accounts still open"). Keep it beside Remaining. Do not add a checklist.
- **Loss Aversion:** Present as warning remaining. Do not add scarcity copy.

---

## Cognitive Walkthrough (owner, first period close)

**Task:** Filter to Clients, open an outstanding client, Collect, confirm remaining dropped.
**Persona:** Agency owner, intermediate domain, high time pressure, desktop then phone.
**Start:** Money > Bills, All tab, period already chosen.
**Estimated first-try success (current):** ~55% novice / ~80% expert. Target: ≥80% novice.

Critical actions (Q1–Q4 condensed):

1. **Find remaining.** Q1 yes. Q2 weak (small type under Tabs). Q3 ok. Q4 N/A. **Fix:** `MoneyPanelMetricBlock` above Tabs.
2. **Filter to Clients.** Q1 yes. Q2 yes (Tabs). Q3 yes. Q4 yes (tables swap). **Keep.**
3. **Open the client.** Q1 yes. Q2 row is the hit target but the **name looks like the control** and is a `Link`. Q3 fail for ~40% (navigate to client instead of sheet). Q4 sheet opens only if they miss the name. **Fix:** plain name in the table; `Link` only on sheet title.
4. **Collect.** Q1 yes once sheet is open. Q2 footer primary is visible. Q3 Collect vs Preview compete (Preview is also a Button). Q4 dialog then toast. **Fix:** Preview `variant="ghost"`; Collect is the only filled button; pending label "Saving…".
5. **Prior carry.** Q1 unclear ("Prior" chip). Q2 yes if column exists. Q3 ok. Q4 sheet lists Prior lines. **Keep chip; omit column when unused.**
6. **Pay a due expense.** Q1 yes if they find Expenses tab. Q2 "All expenses" competes with the table. Q3 "Due/meta" is opaque. Q4 sheet Pay. **Fix:** remove catalog; rename column to "Due".

**Locked copy (no em dashes):**
- Bills remaining hint: existing `moneyBillComposeListInsight` string.
- Expenses remaining label: "Period spend".
- Sheet captions via `moneyBillsSheetCaption` (Task 1).
- Expense empty CTA stays "Add expense". Bills empty CTA stays "Create invoice" / "Add adjustment or cost".

---

## File map

| File | Responsibility |
| --- | --- |
| `apps/web/src/features/billing/money-bills-table-columns.ts` | Pure display helpers (carry visibility, group status, badge variant, sheet caption) |
| `apps/web/src/features/billing/money-bills-table-columns.test.ts` | Unit tests for those helpers |
| `apps/web/src/features/money/agency-money-bills-section-view.tsx` | Distilled chrome, table skeleton, quiet empty |
| `apps/web/src/features/money/agency-money-bills-tables-view.tsx` | Quieter tables (no name links, no hue dot, optional Carry, Ready badge) |
| `apps/web/src/features/money/agency-money-bill-detail-sheet-view.tsx` | Caption, CTA hierarchy, Saving… |
| `apps/web/src/features/money/agency-money-expenses-section-view.tsx` | Due column, drop catalog dialog |
| `apps/web/src/features/money/agency-money-expense-detail-sheet-view.tsx` | Caption, no duplicate Remaining, Due field, Saving… |
| `apps/web/src/features/money/hooks/use-agency-money-expenses-panel.ts` | Remove `details` state/VM |
| `apps/web/src/features/money/money-panel-chrome.tsx` | Reuse only (`MoneyPanelMetricBlock`). Do not change the primitive unless a type error forces it. |

No new files. No golden inventory row unless a file is added (it should not be).

---

### Task 1: Display helpers

**Files:**
- Modify: `apps/web/src/features/billing/money-bills-table-columns.ts`
- Modify: `apps/web/src/features/billing/money-bills-table-columns.test.ts`

**Interfaces:**
- Consumes: `MoneyBillPersonGroup` from `money-bill-obligation-rows.ts`
- Produces:
  - `moneyBillTableShowsCarry(groups: ReadonlyArray<Pick<MoneyBillPersonGroup, "lines">>): boolean`
  - `moneyBillGroupStatusLabel(group: Pick<MoneyBillPersonGroup, "lines">): string`
  - `moneyBillStatusBadgeVariant(label: string): "success" | "warning" | "default" | "outline"`
  - `moneyBillsSheetCaption(input: MoneyBillsSheetCaptionInput): string`
  - `type MoneyBillsSheetCaptionInput = { kind: "group" \| "adjustment" \| "salary-pool" \| "expense"; remainingAmount: number; carryCount?: number; party?: "client" \| "team"; sectionTitle?: string; expenseKind?: "subscription" \| "one_time"; expenseStatus?: "paid" \| "due" \| "partial" }`

- [ ] **Step 1: Write the failing tests** (append to the existing test file)

```typescript
import {
  moneyBillGroupStatusLabel,
  moneyBillStatusBadgeVariant,
  moneyBillTableShowsCarry,
  moneyBillsSheetCaption,
} from "./money-bills-table-columns";

describe("moneyBillTableShowsCarry", () => {
  test("returns false when no group has carry", () => {
    expect(moneyBillTableShowsCarry([{ lines: [{ isCarry: false }] }])).toBe(false);
  });

  test("returns true when any group has a carry line", () => {
    expect(
      moneyBillTableShowsCarry([
        { lines: [{ isCarry: false }] },
        { lines: [{ isCarry: true }] },
      ]),
    ).toBe(true);
  });
});

describe("moneyBillGroupStatusLabel", () => {
  test("returns the shared status when every line matches", () => {
    expect(
      moneyBillGroupStatusLabel({
        lines: [{ statusLabel: "Outstanding" }, { statusLabel: "Outstanding" }],
      }),
    ).toBe("Outstanding");
  });

  test("returns Mixed when statuses differ", () => {
    expect(
      moneyBillGroupStatusLabel({
        lines: [{ statusLabel: "Outstanding" }, { statusLabel: "Paid" }],
      }),
    ).toBe("Mixed");
  });

  test("returns Ready when lines are empty", () => {
    expect(moneyBillGroupStatusLabel({ lines: [] })).toBe("Ready");
  });
});

describe("moneyBillStatusBadgeVariant", () => {
  test("maps action and settlement states", () => {
    expect(moneyBillStatusBadgeVariant("Paid")).toBe("success");
    expect(moneyBillStatusBadgeVariant("Outstanding")).toBe("warning");
    expect(moneyBillStatusBadgeVariant("Ready")).toBe("default");
    expect(moneyBillStatusBadgeVariant("Partial")).toBe("outline");
    expect(moneyBillStatusBadgeVariant("Mixed")).toBe("outline");
    expect(moneyBillStatusBadgeVariant("Refunded")).toBe("outline");
  });
});

describe("moneyBillsSheetCaption", () => {
  test("names the collect job when a client still owes, including prior periods", () => {
    expect(
      moneyBillsSheetCaption({
        kind: "group",
        remainingAmount: 1200,
        carryCount: 2,
        party: "client",
      }),
    ).toBe("Open balance, including prior periods");
  });

  test("names the pay job when a team member still has remaining", () => {
    expect(
      moneyBillsSheetCaption({
        kind: "group",
        remainingAmount: 500,
        carryCount: 0,
        party: "team",
      }),
    ).toBe("Open balance for this period");
  });

  test("names settled when remaining is zero", () => {
    expect(
      moneyBillsSheetCaption({
        kind: "group",
        remainingAmount: 0,
        carryCount: 0,
        party: "client",
      }),
    ).toBe("Settled for this period");
  });

  test("names adjustment and expense jobs", () => {
    expect(
      moneyBillsSheetCaption({
        kind: "adjustment",
        remainingAmount: 100,
        sectionTitle: "Debt",
      }),
    ).toBe("Debt still open");
    expect(
      moneyBillsSheetCaption({
        kind: "salary-pool",
        remainingAmount: 800,
      }),
    ).toBe("Shared salary pool still open");
    expect(
      moneyBillsSheetCaption({
        kind: "expense",
        remainingAmount: 230,
        expenseKind: "subscription",
        expenseStatus: "due",
      }),
    ).toBe("Subscription due this period");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `bun test apps/web/src/features/billing/money-bills-table-columns.test.ts`

Expected: FAIL with `moneyBillTableShowsCarry is not a function` (or similar export miss).

- [ ] **Step 3: Implement the helpers**

Append to `money-bills-table-columns.ts` (keep existing carry/period/waste helpers):

```typescript
export function moneyBillTableShowsCarry(
  groups: ReadonlyArray<{ lines: ReadonlyArray<{ isCarry: boolean }> }>,
): boolean {
  return groups.some((group) => group.lines.some((line) => line.isCarry));
}

export function moneyBillGroupStatusLabel(
  group: Pick<MoneyBillPersonGroup, "lines"> | { lines: ReadonlyArray<{ statusLabel: string }> },
): string {
  const firstStatus = group.lines[0]?.statusLabel ?? "Ready";
  return group.lines.every((line) => line.statusLabel === firstStatus) ? firstStatus : "Mixed";
}

export function moneyBillStatusBadgeVariant(
  label: string,
): "success" | "warning" | "default" | "outline" {
  switch (label) {
    case "Paid":
      return "success";
    case "Outstanding":
      return "warning";
    case "Ready":
      return "default";
    default:
      return "outline";
  }
}

export type MoneyBillsSheetCaptionInput = {
  kind: "group" | "adjustment" | "salary-pool" | "expense";
  remainingAmount: number;
  carryCount?: number;
  party?: "client" | "team";
  sectionTitle?: string;
  expenseKind?: "subscription" | "one_time";
  expenseStatus?: "paid" | "due" | "partial";
};

export function moneyBillsSheetCaption(input: MoneyBillsSheetCaptionInput): string {
  switch (input.kind) {
    case "group": {
      if (input.remainingAmount <= 0) return "Settled for this period";
      if ((input.carryCount ?? 0) > 0) return "Open balance, including prior periods";
      return "Open balance for this period";
    }
    case "adjustment":
      return input.remainingAmount > 0
        ? `${input.sectionTitle ?? "Adjustment"} still open`
        : `${input.sectionTitle ?? "Adjustment"} settled`;
    case "salary-pool":
      return input.remainingAmount > 0
        ? "Shared salary pool still open"
        : "Shared salary pool settled";
    case "expense": {
      if (input.expenseStatus === "paid" || input.remainingAmount <= 0) {
        return "Recorded in this period";
      }
      return input.expenseKind === "subscription"
        ? "Subscription due this period"
        : "One-time expense still open";
    }
    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
}
```

Note: `MoneyBillPersonGroup["lines"]` items already have `statusLabel` and `isCarry`. The carry-visibility helper should accept the narrower `{ isCarry: boolean }` shape so tests do not need full groups.

- [ ] **Step 4: Run tests — expect PASS**

Run: `bun test apps/web/src/features/billing/money-bills-table-columns.test.ts`

Expected: PASS (existing carry/period/waste tests still pass; new describes pass).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/billing/money-bills-table-columns.ts apps/web/src/features/billing/money-bills-table-columns.test.ts
git commit -m "feat(money): add bills table display helpers for status and captions"
```

---

### Task 2: Distill Bills chrome

**Files:**
- Modify: `apps/web/src/features/money/agency-money-bills-section-view.tsx`
- Reuse: `MoneyPanelMetricBlock` from `apps/web/src/features/money/money-panel-chrome.tsx`

**Interfaces:**
- Consumes: `bills.remainingLabel`, `expensesPanel.periodSpendLabel`, `moneyBillComposeListInsight`, `expensesPanel.strip.insight`
- Produces: three-band header: (1) title + search + Add (2) metric block + FX (3) Tabs + status/expense Select + External chip

- [ ] **Step 1: Restack the header**

In `BillsSection` header (`moneyPanelHeaderClass`):

1. `MoneyPanelTitleRow` children: search input only + `MoneyBillsCreateMenu`. **Remove** `MoneyPanelCount`, **remove** the Expenses "All expenses" `Button`, **remove** both status/expense `Select`s from this row.
2. Keep `MoneyPeriodFxLine` immediately under the title row.
3. Render north-star with `MoneyPanelMetricBlock`:
   - Expenses: `label="Period spend"`, `value={expensesPanel.periodSpendLabel}`, `hint={insight}`
   - Bills: `label="Remaining"`, `value={bills.remainingLabel}`, `hint={insight}`
   - Skip the block when there is no value and no insight.
4. One row: `overflow-x-auto` Tabs (unchanged options) + the status `Select` (bills) or expense filter `Select` (expenses) as `ml-auto shrink-0`. Then the External `ActiveBillFilterChip` on the same wrap row when `showExternalClientFilter`.

Status Select markup stays the same (`id="money-bills-status-filter"`, `bills.statusFilter ?? "all"`, existing handlers). It only moves.

Remove unused `MoneyPanelCount` import if nothing else uses it in this file.

- [ ] **Step 2: Quiet empty and loading**

Replace `BillInstrumentRowSkeleton` + `<ul>` loading with a table skeleton matching Expenses (`ExpenseTableSkeleton` pattern): wrapper `overflow-x-auto rounded-dense border border-default/55`, header cells Party/Status/Period/Total/Remaining, four skeleton rows. `aria-label="Loading this period's bills"`.

Empty: **delete** `MoneyListGhostPreview`, the gradient overlay `bg-linear-to-b`, and the `relative` overlay wrapper. Keep one centered empty card (`rounded-2xl border border-default bg-default px-5 py-8 text-center`) with icon, title, body, and the existing CTA. Drop `MoneyListGhostPreview` import if unused.

- [ ] **Step 3: Typecheck the view**

Run: `bun run check-types --filter=web` (or repo `bun run check-types` if the filter is unavailable)

Expected: PASS for this file. Unused imports fail `oxlint` later; remove them now.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/money/agency-money-bills-section-view.tsx
git commit -m "refactor(money): distill bills chrome to remaining, tabs, and add"
```

---

### Task 3: Quieter tables

**Files:**
- Modify: `apps/web/src/features/money/agency-money-bills-tables-view.tsx`

**Interfaces:**
- Consumes: `moneyBillTableShowsCarry`, `moneyBillGroupStatusLabel`, `moneyBillStatusBadgeVariant` from Task 1
- Produces: same table props as today; Carry column only when `moneyBillTableShowsCarry(groups)` is true

- [ ] **Step 1: Drop table party links and the hue status-dot**

`PartyCell`: render `AgencySearchHighlight` as a `<span className="min-w-0 truncate font-medium text-highlighted">`. Delete `Link` usage, `moneyBillClientHref` / `moneyBillMemberHref` imports, and `stopPropagation`. Keep `AgencyMemberAvatar` and `BillClientMark`.

`BillClientMark`: delete the absolute `span` dot (`-right-0.5 -bottom-0.5 size-2 rounded-full`). Keep initials + hue fill.

- [ ] **Step 2: Optional Carry column + shared status badge**

In `PersonBillsTable`:

```typescript
const showCarry = moneyBillTableShowsCarry(groups);
const showWaste = moneyBillTableShowsWaste(groups);
```

Pass `"Carry"` into `BillsTableHeader` only when `showCarry`. Render `<CarryCell>` only when `showCarry`. Salary pool footer: extra empty `<TableCell />` only when `showCarry` (same as waste).

Replace local `groupStatusLabel` and `BillStatusBadge` variant ternaries:

```tsx
function BillStatusBadge({ label }: { label: string }) {
  return <Badge variant={moneyBillStatusBadgeVariant(label)}>{label}</Badge>;
}
```

Use `moneyBillGroupStatusLabel(group)` at the call site.

- [ ] **Step 3: Row affordance**

On `InteractiveBillRow` `<TableRow>` add `aria-haspopup="dialog"`. Keep `tabIndex={0}`, `Enter`/`Space`, selected ring. Do **not** add a chevron column.

- [ ] **Step 4: Run existing column tests + typecheck**

Run: `bun test apps/web/src/features/billing/money-bills-table-columns.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/money/agency-money-bills-tables-view.tsx
git commit -m "refactor(money): quiet bills tables and omit unused carry column"
```

---

### Task 4: Polish detail sheets

**Files:**
- Modify: `apps/web/src/features/money/agency-money-bill-detail-sheet-view.tsx`
- Modify: `apps/web/src/features/money/agency-money-expense-detail-sheet-view.tsx`

**Interfaces:**
- Consumes: `moneyBillsSheetCaption`, `moneyBillGroupStatusLabel`, `moneyBillStatusBadgeVariant`, `moneyBillGroupCarryCount`
- Produces: unchanged sheet open/close API

- [ ] **Step 1: Bills sheet caption + CTA hierarchy**

`DetailHeader` `description` prop: pass `moneyBillsSheetCaption(...)` instead of `` `${n} bill lines` `` / `` `${section} adjustment` `` / `"Shared salary pool for the selected period"`.

`GroupDetail` caption:

```typescript
moneyBillsSheetCaption({
  kind: "group",
  remainingAmount: group.remainingAmount,
  carryCount: moneyBillGroupCarryCount(group),
  party: group.party,
})
```

`StatusBadge` in this file: use `moneyBillStatusBadgeVariant`. Delete the local `groupStatusLabel` duplicate; import `moneyBillGroupStatusLabel`.

Footer: Preview button `variant="ghost"` (already). Primary Collect/Pay/Uncollect/Refund/Adjust stays `variant="default"`. When `disabled` (`bills.isMutationPending`), primary children are `Saving…` not the CTA label. Preview stays "Preview invoice" / "Preview payslip" while disabled (still `disabled`).

`AdjustmentDetail`: same `Saving…` on the filled primary (Record payment / Mark paid / Dismiss). Do **not** repeat Remaining in the body `dl` (header already has it). Keep Type, Period, Amount, Paid.

`SalaryPoolDetail`: caption via helper; Pay button shows `Saving…` when `disabled`.

- [ ] **Step 2: Expense sheet caption + Due field**

Replace `<SheetDescription>Expense details</SheetDescription>` with:

```typescript
moneyBillsSheetCaption({
  kind: "expense",
  remainingAmount: item.remainingAmount,
  expenseKind: item.kind,
  expenseStatus: item.status,
})
```

Remove the body Remaining `ExpenseDetailValue` (header already shows it). Rename the Meta field label from `"Meta"` to `"Due"`. Footer: Edit stays ghost; Pay/Record is filled; when `disabled`, filled children are `Saving…`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/money/agency-money-bill-detail-sheet-view.tsx apps/web/src/features/money/agency-money-expense-detail-sheet-view.tsx
git commit -m "fix(money): clarify bill sheet captions and keep one primary CTA"
```

---

### Task 5: Remove All expenses catalog + Due column

**Files:**
- Modify: `apps/web/src/features/money/agency-money-expenses-section-view.tsx`
- Modify: `apps/web/src/features/money/hooks/use-agency-money-expenses-panel.ts`

**Interfaces:**
- Consumes: table + create/pay/edit dialogs (unchanged)
- Produces: expenses panel VM **without** `details`

- [ ] **Step 1: Rename the Due column**

In `ExpenseTable` and `ExpenseTableSkeleton`, header `"Due/meta"` becomes `"Due"`. Cell content stays `expenseStripMeta(item)`.

- [ ] **Step 2: Delete the catalog dialog**

In `MoneyExpensesPanelContent`:
- Remove `const details = panel.details`
- Delete the entire `<Dialog open={details.open} ...>` block (the "All expenses" catalog). Keep create and payment dialogs.
- Remove unused `DialogClose` import if payment/create still need it (they do).

In `agency-money-bills-section-view.tsx` Task 2 already removed the header button. Confirm no remaining `details.onOpenChange` references.

- [ ] **Step 3: Drop `details` from the hook**

In `use-agency-money-expenses-panel.ts`:
- Delete `expenseDetailsOpen` / `setExpenseDetailsOpen`
- Delete `expenseDetailsSections` useMemo
- Delete `details: { ... }` from the returned panel object

If `filterExpenseStripItems` is only used for details sections, keep it; strip still uses it for the table items. Do not remove strip filtering.

- [ ] **Step 4: Run expense strip tests + typecheck**

Run:

```bash
bun test apps/web/src/features/money/money-expenses-strip.test.ts
bun run check-types
```

Expected: PASS. Type errors will name any leftover `panel.details` access; delete those.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/money/agency-money-expenses-section-view.tsx apps/web/src/features/money/hooks/use-agency-money-expenses-panel.ts apps/web/src/features/money/agency-money-bills-section-view.tsx
git commit -m "refactor(money): drop expenses catalog dialog and rename Due column"
```

---

### Task 6: Verify

**Files:** none new. Touch only if checks fail.

- [ ] **Step 1: Unit tests**

Run:

```bash
bun test apps/web/src/features/billing/money-bills-table-columns.test.ts \
  apps/web/src/features/billing/money-bills-filters.test.ts \
  apps/web/src/features/billing/money-bills-rows.test.ts \
  apps/web/src/features/money/money-expenses-strip.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Lint / types / conventions**

Run from the worktree root:

```bash
bun run check
bun run check-types
bun run check:conventions
```

Expected: Money files clean. Pre-existing convention violations outside Money are out of scope (do not "fix" task-management / workspace-agent). New Money `oxfmt` / nested-ternary / golden-view hits must be fixed in this task.

`check:golden` only if a file was added (it should not be).

- [ ] **Step 3: Browser pass** (worktree app, not main `dev` on port 7001 unless that process is serving this worktree)

Desktop and `sm` width:

1. All tab: Remaining is the largest number in the Bills panel; insight sits beside it; Tabs + status Select share one row; no "N bills" count.
2. Clients: row click opens sheet; clicking the name does **not** navigate; sheet title is the client `Link`; Collect is the filled footer button; Preview is ghost; carry lines appear in the sheet; Carry column absent when nobody has prior.
3. Team: salary pool footer still opens Pay; status filter hides the pool when it does not match (existing helpers).
4. Adjustments: Record payment / Mark paid / Dismiss hierarchy unchanged except Saving… when pending.
5. Expenses: no "All expenses" button; Due column; row click; Pay sticky; Edit ghost.
6. Empty search, loading skeleton looks like a table, error Retry still works.
7. Mobile: sheet from bottom, footer visible, Tabs scroll.

- [ ] **Step 4: Impeccable detector once** (context required this; do not loop)

```bash
node /home/omar/.claude/skills/impeccable/scripts/detect.mjs --json \
  apps/web/src/features/money/agency-money-bills-section-view.tsx \
  apps/web/src/features/money/agency-money-bills-tables-view.tsx \
  apps/web/src/features/money/agency-money-bill-detail-sheet-view.tsx \
  apps/web/src/features/money/agency-money-expenses-section-view.tsx \
  apps/web/src/features/money/agency-money-expense-detail-sheet-view.tsx
```

Fix real defects in one batch. Do not add detector passes.

- [ ] **Step 5: Commit only if Step 2–4 required fixes**

```bash
git add -u
git commit -m "fix(money): finish bills polish verification nits"
```

---

## Development plan coverage

| Growth item | Task |
| --- | --- |
| P1 Remaining north-star (`MoneyPanelMetricBlock`) | 2 |
| P1 Status Select next to Tabs, not search | 2 |
| P1 Table name is not a link; sheet title is | 3, 4 |
| P1 One primary sheet CTA; Preview ghost; Saving… | 4 |
| P1 Drop All expenses catalog | 2, 5 |
| P1 Labor-illusion table skeleton | 2 |
| P1 Due column / Due field copy | 4, 5 |
| P1 Outcome sheet captions | 1, 4 |
| P2 Omit unused Carry column | 1, 3 |
| P2 Ready badge `default` vs Outstanding `warning` | 1, 3 |
| P2 Quiet client mark (no hue dot) | 3 |
| P2 Quiet empty (no ghost overlay) | 2 |
| P2 Drop redundant count | 2 |
| P2 Drop duplicate Remaining in sheet body | 4 |
| P3 Keep insight (Zeigarnik) beside remaining | 2 |
| P3 Keep settle toasts (Store); no extra success UI | 4 (do not add) |
| P3 `aria-haspopup="dialog"` on rows | 3 |

---

## Spec coverage self-check

- Distill cuts listed above each map to a task.
- Growth P1–P3 all mapped.
- Walkthrough failure points (remaining, name-link, Collect vs Preview, All expenses, Due/meta) mapped.
- No API/schema. No DESIGN.md rewrite. No nested cards. Party links preserved in sheets.
- Helper names used in later tasks match Task 1.
- No TBD / "implement later" / "similar to Task N".
