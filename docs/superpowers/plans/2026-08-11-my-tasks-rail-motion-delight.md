# My Tasks Rail Motion & Delight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Operate-grade motion and quiet dopamine feedback to the Agency Tracker My Tasks rail so complete, play-to-track, create, filter, and collapse feel certain and rewarding without carnival noise.

**Architecture:** Mirror Tracker chooser / Money motion modules: a rail-local `agency-my-tasks-rail-motion.ts` owns easings, durations, and variants keyed to CSS `--motion-*` tokens. Views stay presentational; the hook exposes only the flags the view needs (`justCompletedTaskId`, `justCreatedTaskId`, `openCount`). Reuse existing `agency-task-row-complete` CSS and `motion/react` (already installed). No new dependencies.

**Tech Stack:** React 19, `motion/react`, CSS keyframes in `apps/web/src/index.css`, golden-file layers under `apps/web/src/features/task-management/`, Bun test for pure helpers.

## Global Constraints

- Mode = **Operate** — motion serves feedback, state, continuity; no page-load choreography, no cursor trailers, no bounce/elastic by reflex.
- Brand = **quiet instrument** — monochrome certainty + ≤10% Operator Violet; celebration intensity proportional to consequence and frequency.
- Delight thesis: _Clearing a task and starting the clock feel certain and slightly rewarding — never carnival._
- Focal moment: **Play from rail → row tracking accent + related log highlight pulse in sync** (surface brief memorable moment).
- Always respect `prefers-reduced-motion` / `MotionConfig reducedMotion="user"`.
- Golden-file: views props-only; no oRPC/store imports in `*-view.tsx`; containers stay bind-only.
- Width stays locked (`min=width=max=basis`); animate collapse via transform/opacity or discrete swap — never animate `width`/`margin` for the docked rail.
- Bun only: `bun test <file>`, `bun run check`, `bun run check-types`, `bun run check:conventions`, `bun run check:golden` when adding inventory rows.
- Copy stays product voice: direct, no exclamation marks, no "magical"/"delightful" marketing words in UI.

## Motion thesis (locked)

| Layer      | Job                                                                        | Material                                                                                                        | Budget                            |
| ---------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Focal      | Play → tracking                                                            | Violet accent bar + soft pulse; log `agencyTimeEntryRowRelatedClass` already exists — add one short pulse class | ≤400ms, once per play             |
| Feedback   | Complete / create / count                                                  | Check pop + `agency-task-row-complete`; create slide-in; open-count tabular spring                              | 120–320ms                         |
| Continuity | Filter / collapse / list                                                   | `AnimatePresence` + capped stagger (≤8 items, 40ms step); collapse opacity+scaleX from origin-right             | ≤320ms (`--motion-duration-rail`) |
| Rejected   | Cursor follower, confetti, sound, scroll parallax, entrance on every mount | —                                                                                                               | —                                 |

## Growth design audit (inputs to this plan)

**Net Perceived Value:** Motivation = finish tasks + start tracking; Friction = silent complete, invisible play link to log, static empty state.

| C.L.E.A.R. | Score     | Finding                                              |
| ---------- | --------- | ---------------------------------------------------- |
| C Copy     | 3/5       | Keyboard hint OK; empty/create lack outcome language |
| L Layout   | 4/5       | Hierarchy solid after polish; width locked           |
| E Emphasis | 3/5       | Tracking accent exists but under-signaled on play    |
| A A11y     | 4/5       | Focus/keyboard present; motion must reduce           |
| R Reward   | 2/5       | Almost no completion/play reward today               |
| **Total**  | **16/25** | Target ≥20 after this plan                           |

**Triggers to ship:** Zeigarnik (open-count badge + Done filter), IKEA (composer create flash), Loss aversion (quiet — do not guilt; only reinforce cleared open count).

## File map

| File                                                                                      | Responsibility                                                 |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion.ts`      | Easings, durations, variants, stagger helpers                  |
| `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion.test.ts` | Stagger cap + reduced-motion helper tests                      |
| `apps/web/src/index.css`                                                                  | Keyframes: tracking pulse, check pop, count tick, create flash |
| `apps/web/src/features/shared/agency-ui.ts`                                               | Class hooks for pulse / flash (string tokens only)             |
| `apps/web/src/features/task-management/hooks/use-agency-my-tasks-rail.ts`                 | Ephemeral delight flags; clear after timeout                   |
| `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-view.tsx`       | Collapse/expand, pills, composer, empty, count motion          |
| `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-row-view.tsx`   | Complete / select / tracking pulse presentation                |
| `apps/web/src/features/task-management/containers/agency-my-tasks-rail-container.tsx`     | List `AnimatePresence` + stagger wrappers                      |
| `apps/web/src/features/time-tracking/agency-mini-timer-view.tsx`                          | Compact play tap scale (shared feedback)                       |
| `docs/golden-file-source-inventory.md`                                                    | Inventory for new motion module + test                         |

---

### Task 1: Rail motion module + tests

**Files:**

- Create: `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion.ts`
- Create: `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion.test.ts`
- Modify: `docs/golden-file-source-inventory.md` (via `bun run check:golden` after files exist)

**Interfaces:**

- Consumes: none (twin of `agency-task-chooser-motion.ts`)
- Produces:
  - `RAIL_EASE: [0.25, 1, 0.5, 1]`
  - `RAIL_MS = { fast: 0.12, base: 0.18, panel: 0.22, rail: 0.32 }`
  - `RAIL_STAGGER_CAP = 8`, `RAIL_STAGGER_STEP = 0.04`
  - `railStaggerIndex(index: number): number`
  - `railListItemVariants`, `railListContainerVariants`, `railEmptyVariants`, `railCollapsePanelVariants`
  - `railTapScale = { scale: 0.98 }`
  - `railFastTransition`, `railBaseTransition`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion.test.ts
import { describe, expect, test } from "bun:test";
import { railStaggerIndex, RAIL_STAGGER_CAP } from "./agency-my-tasks-rail-motion";

describe("railStaggerIndex", () => {
  test("caps stagger so long lists do not delay forever", () => {
    expect(railStaggerIndex(0)).toBe(0);
    expect(railStaggerIndex(3)).toBe(3);
    expect(railStaggerIndex(99)).toBe(RAIL_STAGGER_CAP - 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion.test.ts`
Expected: FAIL with module not found / `railStaggerIndex` undefined

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion.ts
import type { Transition, Variants } from "motion/react";

/** Matches `--motion-ease-out` in index.css. Twin of Tracker chooser tokens. */
export const RAIL_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

/** Seconds — align with `--motion-duration-fast|base|panel|rail`. */
export const RAIL_MS = {
  fast: 0.12,
  base: 0.18,
  panel: 0.22,
  rail: 0.32,
} as const;

export const RAIL_STAGGER_CAP = 8;
export const RAIL_STAGGER_STEP = 0.04;

export const railTapScale = { scale: 0.98 } as const;

export const railFastTransition: Transition = {
  type: "tween",
  duration: RAIL_MS.fast,
  ease: RAIL_EASE,
};

export const railBaseTransition: Transition = {
  type: "tween",
  duration: RAIL_MS.base,
  ease: RAIL_EASE,
};

export const railListContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0, delayChildren: 0 } },
};

export const railListItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...railBaseTransition,
      delay: railStaggerIndex(index) * RAIL_STAGGER_STEP,
    },
  }),
  exit: {
    opacity: 0,
    y: -2,
    transition: { type: "tween", duration: RAIL_MS.fast * 0.75, ease: RAIL_EASE },
  },
};

export const railEmptyVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: railBaseTransition },
  exit: {
    opacity: 0,
    transition: { type: "tween", duration: RAIL_MS.fast * 0.75, ease: RAIL_EASE },
  },
};

/** Collapse/expand: opacity + scaleX from the right edge — do not animate width. */
export const railCollapsePanelVariants: Variants = {
  collapsed: {
    opacity: 0,
    scaleX: 0.92,
    transition: { type: "tween", duration: RAIL_MS.fast, ease: RAIL_EASE },
  },
  expanded: {
    opacity: 1,
    scaleX: 1,
    transition: { type: "tween", duration: RAIL_MS.rail, ease: RAIL_EASE },
  },
};

export function railStaggerIndex(index: number): number {
  return Math.min(index, RAIL_STAGGER_CAP - 1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion.ts \
  apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion.test.ts
bun run check:golden
git add docs/golden-file-source-inventory.md
git commit -m "$(cat <<'EOF'
feat: add My Tasks rail motion tokens

EOF
)"
```

---

### Task 2: CSS dopamine keyframes + agency-ui class hooks

**Files:**

- Modify: `apps/web/src/index.css` (after `.agency-task-row-complete` block ~1007)
- Modify: `apps/web/src/features/shared/agency-ui.ts` (near `agencyMyTasksRailRowTrackingClass`)

**Interfaces:**

- Consumes: existing `--primary`, `--motion-*`, `.agency-task-row-complete`
- Produces: classes
  - `agency-my-tasks-tracking-pulse`
  - `agency-my-tasks-check-pop`
  - `agency-my-tasks-count-tick`
  - `agency-my-tasks-create-flash`
  - `agencyMyTasksRailRowTrackingPulseClass` etc. in `agency-ui.ts`

- [ ] **Step 1: Add keyframes + utility classes in `index.css`**

```css
@keyframes agency-my-tasks-tracking-pulse {
  0% {
    box-shadow: inset 0 0 0 0 color-mix(in oklab, var(--primary) 0%, transparent);
  }
  40% {
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--primary) 28%, transparent);
    background: color-mix(in oklab, var(--primary) 8%, transparent);
  }
  100% {
    box-shadow: inset 0 0 0 0 transparent;
    background: color-mix(in oklab, var(--primary) 5%, transparent);
  }
}

@keyframes agency-my-tasks-check-pop {
  0% {
    transform: scale(0.7);
  }
  55% {
    transform: scale(1.12);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes agency-my-tasks-count-tick {
  0% {
    transform: translateY(0.35em);
    opacity: 0.4;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes agency-my-tasks-create-flash {
  0% {
    background: color-mix(in oklab, var(--success) 16%, transparent);
  }
  100% {
    background: transparent;
  }
}

.agency-my-tasks-tracking-pulse {
  animation: agency-my-tasks-tracking-pulse 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.agency-my-tasks-check-pop {
  animation: agency-my-tasks-check-pop 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.agency-my-tasks-count-tick {
  animation: agency-my-tasks-count-tick 180ms var(--motion-ease-out) both;
}

.agency-my-tasks-create-flash {
  animation: agency-my-tasks-create-flash 480ms var(--motion-ease-out) both;
}

@media (prefers-reduced-motion: reduce) {
  .agency-my-tasks-tracking-pulse,
  .agency-my-tasks-check-pop,
  .agency-my-tasks-count-tick,
  .agency-my-tasks-create-flash,
  .agency-task-row-complete {
    animation: none !important;
  }
}
```

- [ ] **Step 2: Export class strings from `agency-ui.ts`**

```typescript
export const agencyMyTasksRailRowTrackingPulseClass = "agency-my-tasks-tracking-pulse";
export const agencyMyTasksCheckPopClass = "agency-my-tasks-check-pop";
export const agencyMyTasksCountTickClass = "agency-my-tasks-count-tick";
export const agencyMyTasksCreateFlashClass = "agency-my-tasks-create-flash";
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/index.css apps/web/src/features/shared/agency-ui.ts
git commit -m "$(cat <<'EOF'
feat: add My Tasks rail delight keyframes

EOF
)"
```

---

### Task 3: Hook ephemeral delight flags

**Files:**

- Modify: `apps/web/src/features/task-management/hooks/use-agency-my-tasks-rail.ts`

**Interfaces:**

- Consumes: existing `onCompleteTask`, `onCreateTask`, `onPlaySelected`, `openCount`
- Produces on ViewModel:
  - `justCompletedTaskId: string | null`
  - `justCreatedTaskId: string | null`
  - `justPlayedTaskId: string | null`
  - `countTickKey: number` (increment when `openCount` changes so the badge remounts for tick animation)

- [ ] **Step 1: Add state + clear timers**

```typescript
const [justCompletedTaskId, setJustCompletedTaskId] = useState<string | null>(null);
const [justCreatedTaskId, setJustCreatedTaskId] = useState<string | null>(null);
const [justPlayedTaskId, setJustPlayedTaskId] = useState<string | null>(null);
const [countTickKey, setCountTickKey] = useState(0);
const prevOpenCountRef = useRef(openCount);

useEffect(() => {
  if (prevOpenCountRef.current === openCount) return;
  prevOpenCountRef.current = openCount;
  setCountTickKey((key) => key + 1);
}, [openCount]);

function flashId(setter: (id: string | null) => void, id: string, ms: number) {
  setter(id);
  window.setTimeout(() => setter(null), ms);
}
```

- [ ] **Step 2: Wire into actions**

In `onCompleteTask` after success path starts: `flashId(setJustCompletedTaskId, taskId, 650)`.

In `onCreateTask` after `createProjectTask` resolves, if the store returns the new task id use it; otherwise skip create-flash on row and only clear draft (do not invent ids). Prefer reading returned task from `createProjectTask` if the store already returns it — if not, only bump `countTickKey` via openCount change.

In `onPlaySelected` after `startTimer`: `flashId(setJustPlayedTaskId, taskId, 450)`.

- [ ] **Step 3: Return new fields on the ViewModel**

```typescript
return {
  // ...existing
  justCompletedTaskId,
  justCreatedTaskId,
  justPlayedTaskId,
  countTickKey,
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/task-management/hooks/use-agency-my-tasks-rail.ts
git commit -m "$(cat <<'EOF'
feat: expose My Tasks rail delight flags

EOF
)"
```

---

### Task 4: Row delight — complete pop, tracking pulse, create flash

**Files:**

- Modify: `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-row-view.tsx`
- Modify: `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-row.tsx`

**Interfaces:**

- Consumes: `justCompletedTaskId`, `justPlayedTaskId`, `justCreatedTaskId` via row props
- Produces: presentational class toggles only

- [ ] **Step 1: Extend row view props**

```typescript
type AgencyMyTasksRailRowViewProps = {
  // ...existing
  playPulse: boolean;
  completeFlash: boolean;
  createFlash: boolean;
};
```

- [ ] **Step 2: Apply classes**

```tsx
className={cn(
  agencyMyTasksRailRowClass,
  "group/row",
  isDone && agencyMyTasksRailRowDoneClass,
  isSelected && agencyMyTasksRailRowSelectedClass,
  isTracking && agencyMyTasksRailRowTrackingClass,
  playPulse && agencyMyTasksRailRowTrackingPulseClass,
  completeFlash && "agency-task-row-complete",
  createFlash && agencyMyTasksCreateFlashClass,
  pending && "opacity-60",
)}
```

On the checkbox inner mark when `isDone && completeFlash`:

```tsx
<span className={cn(agencyTaskRowCheckboxClass, isDone && agencyTaskRowCheckboxCheckedClass, completeFlash && agencyMyTasksCheckPopClass)}>
```

- [ ] **Step 3: Bind in `agency-my-tasks-rail-row.tsx`**

```tsx
playPulse={view.justPlayedTaskId === task.id}
completeFlash={view.justCompletedTaskId === task.id}
createFlash={view.justCreatedTaskId === task.id}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-row-view.tsx \
  apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-row.tsx
git commit -m "$(cat <<'EOF'
feat: pulse and pop My Tasks rail rows on play and complete

EOF
)"
```

---

### Task 5: List stagger + filter AnimatePresence

**Files:**

- Modify: `apps/web/src/features/task-management/containers/agency-my-tasks-rail-container.tsx`

**Interfaces:**

- Consumes: `railListItemVariants`, `railListContainerVariants` from motion module; `view.clientGroups`
- Produces: staggered list mount/exit when pills change

- [ ] **Step 1: Wrap list with MotionConfig + AnimatePresence**

```tsx
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  railListContainerVariants,
  railListItemVariants,
  railStaggerIndex,
} from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion";
import { agencyMyTasksClientGroupHeaderClass } from "@/features/shared/agency-ui";

const renderList = (): ReactNode => {
  let rowIndex = 0;
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="flex flex-col gap-3"
        variants={railListContainerVariants}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {view.clientGroups.map((group) => (
            <motion.section
              key={group.clientId}
              aria-label={group.clientName}
              className="px-0.5"
              layout
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <h3 className={agencyMyTasksClientGroupHeaderClass}>{group.clientName}</h3>
              <ul className="flex flex-col gap-0.5">
                {group.tasks.map((task) => {
                  const stagger = railStaggerIndex(rowIndex++);
                  const project = view.projects.find((item) => item.id === task.projectId);
                  const assignedByLabel =
                    view.memberNameById.get(task.createdByUserId) ?? "Unknown";
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      variants={railListItemVariants}
                      custom={stagger}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                    >
                      <AgencyMyTasksRailRow
                        task={task}
                        view={view}
                        projectName={project?.name ?? "Project"}
                        assignedByLabel={assignedByLabel}
                      />
                    </motion.div>
                  );
                })}
              </ul>
            </motion.section>
          ))}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  );
};
```

Note: `AgencyMyTasksRailRow` renders `<li>` — wrapping with `motion.div` breaks list semantics. Prefer making the row view root a `motion.li` instead:

- Change `agency-my-tasks-rail-row-view.tsx` root from `li` to `motion.li` with the same variants props passed in, **or** keep `li` and put `AnimatePresence` only around sections without per-row `motion.div`.

**Preferred (a11y):** pass motion props into row view and use `motion.li` as root.

- [ ] **Step 2: Convert row root to `motion.li` and move variants there** (adjust Task 4 if needed so container does not wrap with `motion.div`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/task-management/containers/agency-my-tasks-rail-container.tsx \
  apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-row-view.tsx
git commit -m "$(cat <<'EOF'
feat: stagger My Tasks rail list on filter changes

EOF
)"
```

---

### Task 6: Shell delight — pills, count tick, empty state, collapse, play tap

**Files:**

- Modify: `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-view.tsx`
- Modify: `apps/web/src/features/time-tracking/agency-mini-timer-view.tsx` (compact only)

**Interfaces:**

- Consumes: `countTickKey`, `agencyMyTasksCountTickClass`, `railTapScale`, `railEmptyVariants`, `railCollapsePanelVariants`
- Produces: shell micro-interactions

- [ ] **Step 1: Filter pills — pressed scale via `motion.button`**

```tsx
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { railFastTransition, railTapScale, railEmptyVariants } from "./agency-my-tasks-rail-motion";

function FilterPill(...) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(agencyMyTasksFilterPillClass, active && agencyMyTasksFilterPillActiveClass)}
      whileTap={railTapScale}
      transition={railFastTransition}
      layout
    >
      {label}
    </motion.button>
  );
}
```

- [ ] **Step 2: Open-count tick on collapsed badge + FAB**

```tsx
<span key={view.countTickKey} className={cn("tabular-nums", agencyMyTasksCountTickClass)}>
  {view.openCount > 99 ? "99+" : view.openCount}
</span>
```

- [ ] **Step 3: Empty state — outcome copy + enter variants**

Copy (product voice, no exclamation):

- Title: `Nothing in this filter`
- Body: `Add a task above, or turn on Open / Done / Delegated`

Wrap empty panel in `motion.div` with `railEmptyVariants`.

- [ ] **Step 4: Expanded panel enter**

Wrap `RailPanel` root content (or aside children) with:

```tsx
<motion.div
  className="h-full w-full min-w-0 origin-right"
  variants={railCollapsePanelVariants}
  initial="collapsed"
  animate="expanded"
>
  <RailPanel ... />
</motion.div>
```

Keep aside width classes locked — only scaleX/opacity on the inner panel.

- [ ] **Step 5: Compact mini-timer `whileTap={railTapScale}`** (or local `{ scale: 0.96 }` to avoid rail import into time-tracking — prefer duplicating the 0.98 constant inline or exporting `railTapScale` from a shared motion constants file only if needed; **YAGNI: inline `{ scale: 0.98 }` in mini-timer**).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-view.tsx \
  apps/web/src/features/time-tracking/agency-mini-timer-view.tsx
git commit -m "$(cat <<'EOF'
feat: delight My Tasks rail shell interactions

EOF
)"
```

---

### Task 7: Related log pulse sync (focal moment)

**Files:**

- Modify: `apps/web/src/features/shared/agency-ui.ts` (`agencyTimeEntryRowRelatedClass`)
- Modify: `apps/web/src/index.css` (reuse `agency-my-tasks-tracking-pulse` or twin `agency-time-entry-related-pulse`)
- Modify: the entry row view that already applies `agencyTimeEntryRowRelatedClass` when `relatedTaskId` matches

**Interfaces:**

- Consumes: `relatedTaskId` already threaded through time-entry day group
- Produces: one-shot pulse when `relatedTaskId` newly becomes set / changes

- [ ] **Step 1: Confirm wiring** — find where `relatedTaskId={runningTaskId}` is passed into the log. If missing from rail play path, pass `runningTaskId` from work-surface / entries log hook (read-only; timer query already exists).

- [ ] **Step 2: When `relatedTaskId` changes to a non-null id, add pulse class for 420ms on matching rows** (local `useEffect` in day-group or row view with `key={relatedTaskId}` remount, or state `pulseRelated` cleared on timeout). Prefer remount via `key={`${entry.id}-${relatedTaskId}-${pulseEpoch}`}` only if cheap; otherwise class toggle.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/shared/agency-ui.ts apps/web/src/index.css \
  apps/web/src/features/time-tracking/entries/agency-time-entry-day-group-view.tsx \
  apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx
git commit -m "$(cat <<'EOF'
feat: pulse related time log rows when rail play starts

EOF
)"
```

---

### Task 8: Verify + polish gate

- [ ] **Step 1: Checks**

```bash
bun test apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion.test.ts
bun run check
bun run check-types
bun run check:conventions
bun run check:golden
node /home/omar/.claude/skills/impeccable/scripts/detect.mjs --json \
  apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-view.tsx \
  apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-row-view.tsx \
  apps/web/src/features/task-management/containers/agency-my-tasks-rail-container.tsx
```

Expected: all pass; detector `[]`.

- [ ] **Step 2: Manual browser smoke (logged in Tracker)**

1. Desktop `lg` + `xl`: rail width stable while animating.
2. Complete a task → check pop + row flash; open count ticks down.
3. Play → row pulse + matching log rows pulse once.
4. Toggle Open/Done/Delegated → list crossfade, no layout jump.
5. Collapse/expand → inner scale/opacity only; width snaps to locked token.
6. Mobile Sheet: empty state + create still feel snappy; FAB count ticks.
7. OS reduced-motion: all flourishes off; actions still work.

- [ ] **Step 3: Final micro-commit if detector/check fixed anything**

```bash
git commit -m "$(cat <<'EOF'
fix: harden My Tasks rail motion a11y and conventions

EOF
)"
```

---

## Self-review

1. **Spec coverage:** Animate (feedback/continuity/focal) + Delight (complete/play/create/empty/count) + growth P1 rewards + related-log memorable moment — all tasked. Cursor trailer / confetti explicitly rejected.
2. **Placeholders:** None — code blocks are concrete; Task 7 names the log files to touch after confirming `relatedTaskId` wiring.
3. **Types:** ViewModel fields `justCompletedTaskId | justCreatedTaskId | justPlayedTaskId | countTickKey` are defined in Task 3 and consumed in Tasks 4–6 consistently.
