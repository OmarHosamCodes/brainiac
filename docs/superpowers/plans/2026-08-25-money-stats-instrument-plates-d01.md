# Money Stats Instrument Plates (D01) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `MoneyStatsSection`’s four generic metric cards with four **instrument plates** (D01) — all 13 Fin-Sheet metrics visible, glyph + destination hint per domain, metric clicks preserve existing `onSelectMetric` routing.

**Architecture:** View-only redesign in the money feature. Reuse member-profile instrument surface helpers (`instrumentPlateSurfaceClass`, `instrumentPlateInkClass`, `PaceBarGlyph`, `DonutGlyph`). New money-specific SVG glyphs + `MoneyStatsPlate` presentational component. Hook extends `MoneyStatsCardViewModel` with plate metadata (short title, destination hint, plate tone). No API/schema changes.

**Tech Stack:** React 19 + Vite, Motion (optional selection strip fade only), shadcn tokens, Bun test, golden-file layers unchanged.

## Global Constraints

- **Scope:** `MoneyStatsSection` + supporting view files under `apps/web/src/features/money/` only (payout-run mount is Task 6, separate section in same surface view).
- **Layers:** View ← container ← hook ViewModel. Views do not call oRPC. Hook keeps `buildMoneyStatsCards` + `buildCardViewModel`.
- **Styling:** Neutral `instrumentPlateSurfaceClass`; ink on glyphs/metric tones only. Poppins labels, IBM Plex Mono tabular metrics.
- **Copy:** Sentence case plate names ("Income", "Deductions"). Destination hints: "Client bills", "Outgoing", "Payout run", "Formulas".
- **Metrics:** All 13 ids from `money-stats-fixtures.ts` visible without collapsible.
- **Checks:** `bun run check`, `bun run check-types`, `bun run check:conventions`, `bun test` for new pure helpers.
- **Reference comp:** `/home/omar/open-design/.tmp/tools-pack/runtime/linux/namespaces/default/data/projects/orch-money-stats-6-topologies-d5d1/d1-instrument-plates.html`

## File map

| File | Responsibility |
| ---- | -------------- |
| Create: `apps/web/src/features/money/money-stats-plate-glyphs.tsx` | SVG glyphs: collection bar, cost stack, profit arc, allocation segments |
| Create: `apps/web/src/features/money/money-stats-plate-glyphs.test.ts` | Ratio/bar segment sanity tests |
| Create: `apps/web/src/features/money/money-stats-plate-view.tsx` | `MoneyStatsPlate` + `MoneyStatsMetricRow` presentational components |
| Modify: `apps/web/src/features/money/agency-money-stats-section-view.tsx` | Replace `StatsCard` grid with plate grid + selection hint strip |
| Modify: `apps/web/src/features/money/hooks/use-agency-money-surface.ts` | Extend view model; track `lastSelectedMetric` for hint strip |
| Modify: `apps/web/src/features/money/agency-money-surface-view.tsx` | Task 6 only: mount `MoneyPayoutRunView` so profitability scroll works |

---

### Task 1: Plate metadata constants

**Files:**

- Create: `apps/web/src/features/money/money-stats-plate-meta.ts`

**Interfaces:**

- Produces:
  - `moneyStatsPlateMeta(cardId: MoneyStatsCardId): { shortTitle: string; destinationHint: string; tone: InstrumentPlateTone }`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/features/money/money-stats-plate-meta.test.ts
import { describe, expect, test } from "bun:test";
import { moneyStatsPlateMeta } from "./money-stats-plate-meta";

describe("moneyStatsPlateMeta", () => {
  test("maps income plate", () => {
    expect(moneyStatsPlateMeta("income-cash")).toEqual({
      shortTitle: "Income",
      destinationHint: "Client bills",
      tone: "info",
    });
  });

  test("maps profitability plate", () => {
    expect(moneyStatsPlateMeta("profitability").destinationHint).toBe("Payout run");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/features/money/money-stats-plate-meta.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement metadata map**

```typescript
// apps/web/src/features/money/money-stats-plate-meta.ts
import type { MoneyStatsCardId } from "@/features/billing/money-stats-fixtures";
import type { InstrumentPlateTone } from "@/features/member-profile/member-profile-instrument-plate";

export function moneyStatsPlateMeta(cardId: MoneyStatsCardId): {
  shortTitle: string;
  destinationHint: string;
  tone: InstrumentPlateTone;
} {
  switch (cardId) {
    case "income-cash":
      return { shortTitle: "Income", destinationHint: "Client bills", tone: "info" };
    case "deductions":
      return { shortTitle: "Deductions", destinationHint: "Outgoing", tone: "neutral" };
    case "profitability":
      return { shortTitle: "Profitability", destinationHint: "Payout run", tone: "success" };
    case "allocations":
      return { shortTitle: "Allocations", destinationHint: "Formulas", tone: "info" };
    default: {
      const _exhaustive: never = cardId;
      return _exhaustive;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/features/money/money-stats-plate-meta.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/money/money-stats-plate-meta.ts apps/web/src/features/money/money-stats-plate-meta.test.ts
git commit -m "feat(money): add instrument plate metadata for stats cards"
```

---

### Task 2: Money plate SVG glyphs

**Files:**

- Create: `apps/web/src/features/money/money-stats-plate-glyphs.tsx`
- Create: `apps/web/src/features/money/money-stats-plate-glyphs.test.ts`

**Interfaces:**

- Produces: `MoneyStatsPlateGlyph({ plateId, collectedRatio?, className? })` — renders one of four SVG glyphs

- [ ] **Step 1: Write failing test for collection ratio clamp**

```typescript
import { describe, expect, test } from "bun:test";
import { clampPlateRatio } from "./money-stats-plate-glyphs";

describe("clampPlateRatio", () => {
  test("clamps to 0-1", () => {
    expect(clampPlateRatio(-0.2)).toBe(0);
    expect(clampPlateRatio(1.5)).toBe(1);
    expect(clampPlateRatio(0.42)).toBe(0.42);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement glyphs**

Reuse `PaceBarGlyph` for income when `collectedRatio` provided; inline SVG for deductions (3 bars), profitability (`DonutGlyph` or arc), allocations (3 segment rects). Export `clampPlateRatio` helper.

```tsx
export function clampPlateRatio(ratio: number): number {
  return Math.min(1, Math.max(0, ratio));
}

export function MoneyStatsPlateGlyph({
  plateId,
  collectedRatio = 0,
  className,
}: {
  plateId: MoneyStatsCardId;
  collectedRatio?: number;
  className?: string;
}) {
  switch (plateId) {
    case "income-cash":
      return <PaceBarGlyph ratio={clampPlateRatio(collectedRatio)} className={className} />;
    // ...deductions, profitability, allocations cases mirroring OD comp geometry
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(money): add instrument plate SVG glyphs for stats scoreboard"
```

---

### Task 3: MoneyStatsPlate presentational component

**Files:**

- Create: `apps/web/src/features/money/money-stats-plate-view.tsx`

**Interfaces:**

- Consumes: `MoneyStatsCardViewModel`, `onSelectMetric`, plate meta from Task 1
- Produces: `MoneyStatsPlate`, `MoneyStatsMetricRow` exported for section view

- [ ] **Step 1: Implement plate shell**

Structure per D01 comp:

```tsx
<article className={cn(instrumentPlateSurfaceClass(), "flex flex-col gap-3 p-4 rounded-xl border")}>
  <header className="flex items-center justify-between gap-2">
    <h2 className="text-sm font-semibold text-foreground">{shortTitle}</h2>
    <span className="text-[0.625rem] font-medium text-muted-foreground">{destinationHint}</span>
  </header>
  <div className={cn("h-7 w-full", ink)}><MoneyStatsPlateGlyph ... /></div>
  {/* income only: meter + collectedLabel */}
  <ul className="flex flex-col gap-0.5">
    {allMetrics.map(metric => <MoneyStatsMetricRow ... />)}
  </ul>
</article>
```

`MoneyStatsMetricRow`: label left, mono amount right, hover `bg-muted/40`, chevron on hover, `onClick` → `onSelectMetric`.

Map `MoneyStatsMetricTone` → text classes: `positive` → `text-success`, `caution` → `text-warning`, default → `text-foreground`.

- [ ] **Step 2: Wire all metrics (primary + secondary) in display order from fixture card**

- [ ] **Step 3: Income collection meter**

When `collectedRatio !== null`, render `role="meter"` bar below glyph (reuse existing meter markup from current `StatsCard`).

- [ ] **Step 4: Manual smoke in browser** — Money page, verify four plates, all metrics visible, no Details button.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(money): add MoneyStatsPlate presentational component"
```

---

### Task 4: Replace MoneyStatsSection layout

**Files:**

- Modify: `apps/web/src/features/money/agency-money-stats-section-view.tsx`

- [ ] **Step 1: Remove `StatsCard`, `MetricRowButton`, Collapsible Details**

- [ ] **Step 2: Render plate grid**

```tsx
<section
  className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
  aria-label="Money period stats"
>
  {statsCards.map((card) => (
    <MoneyStatsPlate key={card.id} card={card} onSelectMetric={onSelectMetric} />
  ))}
</section>
```

- [ ] **Step 3: Update loading skeleton** — four `Skeleton` plates `min-h-[12rem] rounded-xl`

- [ ] **Step 4: Add selection hint strip (optional but in D01 comp)**

Below grid, when a metric was last clicked, show quiet panel: `"{label}: {value} · Opens {destination}"`. State lives in hook (Task 5).

- [ ] **Step 5: Run checks**

```bash
bun run check && bun run check-types && bun run check:conventions
```

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(money): replace stats cards with instrument plates (D01)"
```

---

### Task 5: Hook — selection hint + plate-ready view model

**Files:**

- Modify: `apps/web/src/features/money/hooks/use-agency-money-surface.ts`

- [ ] **Step 1: Add state**

```typescript
const [lastStatsMetricSelection, setLastStatsMetricSelection] =
  useState<MoneyStatsMetricSelection | null>(null);
```

- [ ] **Step 2: Wrap `onSelectMetric`**

```typescript
function onSelectMetric(selection: MoneyStatsMetricSelection) {
  setLastStatsMetricSelection(selection);
  // existing switch unchanged
}
```

- [ ] **Step 3: Expose hint ViewModel**

```typescript
lastStatsMetricHint: {
  label: string;
  value: string;
  destination: string;
} | null
```

Resolve label/value from `statsCards` + `moneyStatsPlateMeta(cardId).destinationHint`.

- [ ] **Step 4: Pass through container/view** — `MoneyStatsSection` accepts optional `metricHint` prop.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(money): track last selected stats metric for hint strip"
```

---

### Task 6: Fix profitability deep-link (mount payout run)

**Files:**

- Modify: `apps/web/src/features/money/agency-money-surface-view.tsx`
- Modify: `apps/web/src/features/money/hooks/use-agency-money-surface.ts` (build `payoutRunViewModel` if not already exported)

- [ ] **Step 1: Grep hook for existing payout run data** — `payoutsQuery`, section totals, period label.

- [ ] **Step 2: Build minimal `MoneyPayoutRunViewModel`** wired to live queries (read-only OK for v1: no add-line if not wired).

- [ ] **Step 3: Mount between stats and bills grid**

```tsx
<MoneyPayoutRunView viewModel={payoutRun} />
```

- [ ] **Step 4: Verify** — click Team profit / ROI scrolls to `#money-period-run` and section is visible.

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(money): mount payout run so profitability stats deep-link works"
```

---

### Task 7: Definition of done

- [ ] **Step 1: Full check suite**

```bash
bun run check && bun run check-types && bun run check:conventions
bun test apps/web/src/features/money/
```

- [ ] **Step 2: Browser verify** — Money with production-local data: 4 plates, 13 metrics, collection meter at 0%, metric clicks filter bills / open expenses / settings.

- [ ] **Step 3: Impeccable detector** (if hook active)

```bash
node /home/omar/.claude/skills/impeccable/scripts/detect.mjs --json apps/web/src/features/money/agency-money-stats-section-view.tsx apps/web/src/features/money/money-stats-plate-view.tsx
```

- [ ] **Step 4: Update shape brief status** in `.impeccable/mocks/decision/money-stats-d01-instrument-plates-brief.md` → `Status: Shipped`

---

## Spec coverage checklist

| Requirement | Task |
|-------------|------|
| 4 instrument plates | 3, 4 |
| All 13 metrics visible | 3, 4 |
| Collection meter on income | 3 |
| Glyph per domain | 2 |
| Destination hints | 1, 3 |
| onSelectMetric preserved | 4, 5 |
| Loading/error states | 4 |
| Responsive 4/2/1 columns | 4 |
| Profitability scroll fix | 6 |
| Neutral surfaces, ink on glyphs | 2, 3 |
