# Member Profile Present → Attendance Streak Plate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Present instrument plate’s `9/31` pace-bar read with an attendance **streak** — current consecutive working days with logged time as the hero metric, a 7-working-day segment-chain glyph, and best-in-month context in the morph dialog.

**Architecture:** Pure streak math in a feature helper (TDD, mirroring `member-profile-gauge-detail.ts`). The hook derives streak fields from existing profile payload (`heatMap`, `calendarMonth`, `leave`, team work schedule from `tenurePolicy`). Only the **present** plate changes glyph, metric, label, aria copy, and morph detail; other three plates stay untouched. Neutral shadcn plate surface; green ink on glyph segments only.

**Tech Stack:** React 19 + Vite, Motion shared-layout morph (existing), Bun test, `isWeekendDateKey` from time-tracking utils, golden-file layers unchanged.

## Global Constraints

- **Scope:** Present (`StatPlateKey === "present"`) plate + its morph dialog content only.
- **Surface styling:** Neutral `instrumentPlateSurfaceClass`; color on glyph segments only (`text-success` / muted / warning).
- **Copy:** Sentence case in dialog; plate short label `STREAK` (uppercase via existing label class). No exclamation marks, no gamified hype (“on fire!”).
- **Streak rules (confirmed):**
  - **Current streak:** Consecutive **working days** with logged time (`totalSeconds > 0`), walking backward from anchor day. Weekends skipped (do not count, do not break). Off days and team holidays **break** the streak. Incomplete **today** does not break an active streak (anchor = yesterday if today is a working day with zero seconds).
  - **Best in month:** Longest consecutive present run among in-month working days in visible `calendarMonth`.
  - **Hero metric:** Streak count only (e.g. `5` + `STREAK`). Month total moves to morph dialog.
- **Morph dialog:** Keep Explain + Inspect + Act. Add row “Best this month · N days”. Primary CTA stays profile-local: focus latest present day in activity rail.
- **Motion:** Respect `prefersReducedMotion`; existing `layoutId` morph unchanged.
- **Layers:** No router/service/schema changes unless streak math must move to API (prefer web pure helper first).
- **Checks:** `bun run check`, `bun run check-types`, `bun run check:conventions`, `bun test apps/web/src/features/member-profile/member-profile-attendance-streak.test.ts`.

## File map

| File | Responsibility |
| ---- | -------------- |
| Create: `apps/web/src/features/member-profile/member-profile-attendance-streak.ts` | Pure streak + segment-chain model |
| Create: `apps/web/src/features/member-profile/member-profile-attendance-streak.test.ts` | TDD for current, best, anchor, segments |
| Modify: `apps/web/src/features/member-profile/member-profile-instrument-plate.tsx` | `StreakChainGlyph`, wire `present` in `StatPlateGlyph` |
| Modify: `apps/web/src/features/member-profile/hooks/use-agency-member-profile.ts` | Compute streak; update present gauge fields |
| Modify: `apps/web/src/features/member-profile/member-profile-gauge-detail.ts` | Present case: streak explain, best row, month total row |
| Modify: `apps/web/src/features/member-profile/member-profile-gauge-detail.test.ts` | Update present tests |
| Modify: `apps/web/src/features/member-profile/agency-member-profile-view.tsx` | Present plate aria-label only (if not fully driven by hook) |

---

### Task 1: Attendance streak pure helper

**Files:**

- Create: `apps/web/src/features/member-profile/member-profile-attendance-streak.ts`
- Create: `apps/web/src/features/member-profile/member-profile-attendance-streak.test.ts`

**Interfaces:**

- Consumes: date keys, `isWeekendDateKey`, heat-map day shape `{ date, totalSeconds, off }`, calendar month day `{ date, inMonth, status }`, work schedule `{ weekStartsOn, weekendDurationDays }`, anchor date string
- Produces:
  - `type StreakSegmentState = "present" | "missed" | "off" | "future"`
  - `type AttendanceStreakModel = { currentStreak: number; bestInMonth: number; monthPresentDays: number; monthWorkingDays: number; segments: StreakSegmentState[] }` (segments = last 7 working days ≤ anchor, oldest→newest)
  - `computeAttendanceStreak(input): AttendanceStreakModel`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/features/member-profile/member-profile-attendance-streak.test.ts
import { describe, expect, test } from "bun:test";
import { computeAttendanceStreak } from "./member-profile-attendance-streak";

const schedule = { weekStartsOn: 1, weekendDurationDays: 2 };

describe("computeAttendanceStreak", () => {
  test("counts current streak across weekends", () => {
    const result = computeAttendanceStreak({
      anchorDate: "2026-08-24", // Mon
      schedule,
      heatDays: [
        { date: "2026-08-22", totalSeconds: 3600, off: null }, // Fri
        { date: "2026-08-21", totalSeconds: 3600, off: null }, // Thu
        { date: "2026-08-20", totalSeconds: 0, off: null }, // Wed missed
      ],
      calendarDays: [],
    });
    expect(result.currentStreak).toBe(2);
  });

  test("off day breaks streak", () => {
    const result = computeAttendanceStreak({
      anchorDate: "2026-08-24",
      schedule,
      heatDays: [
        { date: "2026-08-22", totalSeconds: 3600, off: null },
        { date: "2026-08-21", totalSeconds: 0, off: { leaveId: "1", type: "pto", reason: null, rangeStart: "2026-08-21", rangeEnd: "2026-08-21" } },
        { date: "2026-08-20", totalSeconds: 3600, off: null },
      ],
      calendarDays: [],
    });
    expect(result.currentStreak).toBe(1);
  });

  test("incomplete today does not break active streak", () => {
    const result = computeAttendanceStreak({
      anchorDate: "2026-08-24",
      schedule,
      heatDays: [
        { date: "2026-08-24", totalSeconds: 0, off: null },
        { date: "2026-08-22", totalSeconds: 3600, off: null },
      ],
      calendarDays: [],
    });
    expect(result.currentStreak).toBe(1);
  });

  test("best in month from calendar statuses", () => {
    const result = computeAttendanceStreak({
      anchorDate: "2026-08-24",
      schedule,
      heatDays: [],
      calendarDays: [
        { date: "2026-08-04", inMonth: true, status: "present" },
        { date: "2026-08-05", inMonth: true, status: "present" },
        { date: "2026-08-06", inMonth: true, status: "present" },
        { date: "2026-08-07", inMonth: true, status: "empty" },
        { date: "2026-08-08", inMonth: true, status: "weekend" },
        { date: "2026-08-11", inMonth: true, status: "present" },
      ],
    });
    expect(result.bestInMonth).toBe(3);
    expect(result.monthPresentDays).toBe(4);
  });

  test("segment chain returns seven working days", () => {
    const result = computeAttendanceStreak({
      anchorDate: "2026-08-24",
      schedule,
      heatDays: [
        { date: "2026-08-22", totalSeconds: 3600, off: null },
        { date: "2026-08-21", totalSeconds: 0, off: null },
      ],
      calendarDays: [],
    });
    expect(result.segments).toHaveLength(7);
    expect(result.segments.at(-1)).toBe("present");
    expect(result.segments.at(-2)).toBe("missed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/features/member-profile/member-profile-attendance-streak.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/features/member-profile/member-profile-attendance-streak.ts
import { isWeekendDateKey } from "@/features/time-tracking/local-week-bounds";
import { addDaysToDateKey } from "@/features/time-tracking/local-week-bounds";

export type StreakSegmentState = "present" | "missed" | "off" | "future";

export type AttendanceStreakModel = {
  currentStreak: number;
  bestInMonth: number;
  monthPresentDays: number;
  monthWorkingDays: number;
  segments: StreakSegmentState[];
};

type HeatDay = {
  date: string;
  totalSeconds: number;
  off: { leaveId: string; type: string; reason: string | null; rangeStart: string; rangeEnd: string } | null;
};

type CalendarDay = {
  date: string;
  inMonth: boolean;
  status: "present" | "leave" | "holiday" | "weekend" | "empty";
};

export function computeAttendanceStreak(input: {
  anchorDate: string;
  schedule: { weekStartsOn: number; weekendDurationDays: number };
  heatDays: HeatDay[];
  calendarDays: CalendarDay[];
}): AttendanceStreakModel {
  const heatByDate = new Map(input.heatDays.map((d) => [d.date, d]));
  const calendarByDate = new Map(input.calendarDays.map((d) => [d.date, d]));

  const streakAnchor = resolveStreakAnchor(input.anchorDate, input.schedule, heatByDate);

  let currentStreak = 0;
  let cursor = streakAnchor;
  for (;;) {
    if (isWeekendDateKey(cursor, input.schedule.weekStartsOn, input.schedule.weekendDurationDays)) {
      cursor = addDaysToDateKey(cursor, -1);
      continue;
    }
    const heat = heatByDate.get(cursor);
    const cal = calendarByDate.get(cursor);
    const off = heat?.off ?? (cal?.status === "leave" || cal?.status === "holiday");
    if (off) break;
    const seconds = heat?.totalSeconds ?? (cal?.status === "present" ? 1 : 0);
    if (seconds > 0) {
      currentStreak += 1;
      cursor = addDaysToDateKey(cursor, -1);
      continue;
    }
    break;
  }

  const inMonthWorking = input.calendarDays.filter(
    (d) => d.inMonth && d.status !== "weekend" && d.status !== "holiday",
  );
  const monthPresentDays = inMonthWorking.filter((d) => d.status === "present").length;
  const monthWorkingDays = inMonthWorking.length;
  const bestInMonth = longestPresentRun(inMonthWorking.map((d) => d.status === "present"));

  const segments: StreakSegmentState[] = [];
  let segCursor = streakAnchor;
  while (segments.length < 7) {
    if (isWeekendDateKey(segCursor, input.schedule.weekStartsOn, input.schedule.weekendDurationDays)) {
      segCursor = addDaysToDateKey(segCursor, -1);
      continue;
    }
    if (segCursor > input.anchorDate) {
      segments.unshift("future");
    } else {
      const heat = heatByDate.get(segCursor);
      const cal = calendarByDate.get(segCursor);
      const off = heat?.off ?? cal?.status === "leave" || cal?.status === "holiday";
      const seconds = heat?.totalSeconds ?? (cal?.status === "present" ? 1 : 0);
      segments.unshift(off ? "off" : seconds > 0 ? "present" : "missed");
    }
    segCursor = addDaysToDateKey(segCursor, -1);
  }

  return { currentStreak, bestInMonth, monthPresentDays, monthWorkingDays, segments };
}

function resolveStreakAnchor(
  anchorDate: string,
  schedule: { weekStartsOn: number; weekendDurationDays: number },
  heatByDate: Map<string, HeatDay>,
): string {
  if (isWeekendDateKey(anchorDate, schedule.weekStartsOn, schedule.weekendDurationDays)) {
    return addDaysToDateKey(anchorDate, -1);
  }
  const todayHeat = heatByDate.get(anchorDate);
  if ((todayHeat?.totalSeconds ?? 0) <= 0 && !todayHeat?.off) {
    return addDaysToDateKey(anchorDate, -1);
  }
  return anchorDate;
}

function longestPresentRun(flags: boolean[]): number {
  let best = 0;
  let run = 0;
  for (const present of flags) {
    if (present) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/member-profile/member-profile-attendance-streak.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/member-profile/member-profile-attendance-streak.ts \
  apps/web/src/features/member-profile/member-profile-attendance-streak.test.ts
git commit -m "feat: add attendance streak computation for member profile"
```

---

### Task 2: Streak chain glyph

**Files:**

- Modify: `apps/web/src/features/member-profile/member-profile-instrument-plate.tsx`

**Interfaces:**

- Consumes: `StreakSegmentState[]` from streak model
- Produces: `StreakChainGlyph({ segments, className })` SVG; `StatPlateGlyph` routes `present` to it (not `PaceBarGlyph`)

- [ ] **Step 1: Add `StreakChainGlyph`**

Seven rounded rects in a row, linked by 1px bridges. States:
- `present`: `fill-current` full opacity
- `missed`: `fill-current opacity-20` + 1px ring
- `off`: `fill-current opacity-10` + center dash
- `future`: `fill-current opacity-5`

- [ ] **Step 2: Update `statPlateShortLabel`**

```typescript
case "present":
  return "Streak";
```

- [ ] **Step 3: Update `StatPlateGlyph` switch**

```typescript
case "present":
  return <StreakChainGlyph segments={segments ?? []} className={className} />;
```

Extend props: optional `segments?: StreakSegmentState[]` on `StatPlateGlyph`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/member-profile/member-profile-instrument-plate.tsx
git commit -m "feat: streak chain glyph for present instrument plate"
```

---

### Task 3: Hook + gauge detail copy

**Files:**

- Modify: `apps/web/src/features/member-profile/hooks/use-agency-member-profile.ts`
- Modify: `apps/web/src/features/member-profile/member-profile-gauge-detail.ts`
- Modify: `apps/web/src/features/member-profile/member-profile-gauge-detail.test.ts`

**Interfaces:**

- Hook present gauge becomes:
  - `valueLabel: String(streak.currentStreak)`
  - `secondary: calendar label` (unchanged, for aria)
  - `ratio: Math.min(1, currentStreak / 7)` (glyph fallback)
  - `streakSegments`, `bestInMonth`, `monthPresentDays` on gauge or passed to detail builder
- Detail builder present case:
  - `title`: `Attendance streak`
  - `explain`: `Consecutive working days with logged time. Best run in ${calendarLabel}: ${bestInMonth} days.`
  - rows: `[{ label: "This month", meta: "${monthPresentDays} days" }, { label: "Best this month", meta: "${bestInMonth} days" }, ...present day list]`
  - `emptyLabel`: `No streak yet. Log time on a working day to start one.`
  - `primaryAction`: latest present day focus (unchanged behavior)

- [ ] **Step 1: Update failing gauge detail test**

Replace `valueLabel: "1/31"` with streak context fields in `baseContext` / present test.

- [ ] **Step 2: Implement hook streak wiring**

In profile `useMemo`, call `computeAttendanceStreak` with `heatMap.days`, `calendarMonth.days`, `weekStartsOn`, `weekendDurationDays` from `tenurePolicy ?? DEFAULT_WORK_SCHEDULE`, anchor = today date key clamped to profile window.

- [ ] **Step 3: Implement detail builder changes**

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/member-profile/member-profile-gauge-detail.test.ts apps/web/src/features/member-profile/member-profile-attendance-streak.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/member-profile/hooks/use-agency-member-profile.ts \
  apps/web/src/features/member-profile/member-profile-gauge-detail.ts \
  apps/web/src/features/member-profile/member-profile-gauge-detail.test.ts
git commit -m "feat: wire attendance streak into profile gauge and morph detail"
```

---

### Task 4: View binding + verify

**Files:**

- Modify: `apps/web/src/features/member-profile/agency-member-profile-view.tsx` (if needed)

- [ ] **Step 1: Pass `streakSegments` into `StatPlateGlyph` for present plate**

```typescript
glyph={
  <StatPlateGlyph
    plateKey={gauge.key}
    ratio={gauge.ratio}
    segments={gauge.key === "present" ? gauge.streakSegments : undefined}
    className="h-full w-full"
  />
}
```

- [ ] **Step 2: Update aria-label**

`Attendance streak: ${valueLabel} days. Best this month: ${bestInMonth}. ${secondary}. Open details.`

- [ ] **Step 3: Run full checks**

```bash
bun run check
bun run check-types
bun run check:conventions
node /home/omar/.claude/skills/impeccable/scripts/detect.mjs --json apps/web/src/features/member-profile/member-profile-instrument-plate.tsx apps/web/src/features/member-profile/agency-member-profile-view.tsx
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/member-profile/agency-member-profile-view.tsx
git commit -m "feat: present plate shows attendance streak in member profile"
```
