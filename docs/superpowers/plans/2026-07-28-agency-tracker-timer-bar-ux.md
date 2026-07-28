# Agency Tracker Timer Bar UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]` / `- [x]`) syntax for tracking. **Most steps below are already done in the uncommitted working tree** — do not re-implement; only execute unchecked remaining polish if still open.

**Goal:** Clockify-parity timer-bar interaction for Agency Tracker: start/stop never silently drop, stop blockers are visible, pending state is announced, and suggestion picks flush description sync so mid-track drafts stick.

**Architecture:** Keep golden-file layers. Domain helpers (`timer-mutation-queue`, `timer-validation`) own correctness; the Zustand store serializes start/stop; the tracker hook builds ViewModel (blocker copy, pending, disabled); the view is presentational (ring, inline alert, `aria-*`). Design contract: OD project `agency-tracker-timer-bar-ux` → `timer-bar-interaction-contract.html`.

**Tech Stack:** React 19 + Vite (`apps/web`), Zustand feature store, Bun test, shadcn `Button` / warning tokens.

## Global Constraints

- Scope = **timer bar only** (start / stop / discard, mid-track description, pending, errors). No entry log, bulk, day groups, or chooser redesign.
- Clockify-parity: do not invent modals or new flows; Discard stays destructive menu item only.
- Timer state stays server-persisted; optimistic UI must not flicker away from cache truth for critical CRUD.
- Suggestion apply is explicit pick only — typing never mutates task.
- Description durations remain second-precise elsewhere; this slice does not change duration math.
- Bun only: `bun test <file>`, `bun run check`, `bun run check-types`, `bun run check:conventions`, `bun run check:golden` when adding inventory rows.
- Actor / API layers untouched for this slice.

## Status snapshot (2026-07-28)

| Item                     | Status   | Remaining                                                        |
| ------------------------ | -------- | ---------------------------------------------------------------- |
| 1. Start/stop queue      | **Done** | Pending held via `timerQueueDepth` across chain handoff          |
| 2. Visible stop blockers | **Done** | Warning ring + soft warning alert surface                        |
| 3. Pending a11y          | **Done** | `aria-busy`, `…`, discard disabled, polite `Saving…` live region |
| 4. Suggestion-pick flush | **Done** | None material                                                    |

**Ship readiness:** All four items + craft polish are done in the working tree.

---

## File map

| File                                                                        | Responsibility                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/web/src/features/time-tracking/timer-mutation-queue.ts`               | Promise chain: enqueue start/stop; failures still advance                       |
| `apps/web/src/features/time-tracking/timer-mutation-queue.test.ts`          | Order + rejection-continues tests                                               |
| `apps/web/src/features/time-tracking/stores/agency-time-tracking.ts`        | Wire `startTimer` / `stopTimer` through queue (bar + mini-timer share store)    |
| `apps/web/src/features/time-tracking/timer-validation.ts`                   | Stop blocker messages; prefer `selectedTask` for mid-run unlock                 |
| `apps/web/src/features/time-tracking/timer-validation.test.ts`              | Resolved draft task unlocks stop                                                |
| `apps/web/src/features/time-tracking/hooks/use-agency-time-tracker.ts`      | Pass draft task ids/catalog into `canStopAgencyTimer`; flush on blur/stop       |
| `apps/web/src/features/time-tracking/agency-time-tracker-view.tsx`          | Warning ring, inline blocker, `aria-busy` / `aria-describedby`, pending disable |
| `apps/web/src/features/time-tracking/agency-description-datalist-field.tsx` | Call `onBlur` after suggestion pick (mousedown skips native blur)               |
| `docs/golden-file-source-inventory.md`                                      | Inventory rows for queue + test                                                 |

Out of scope files (do not expand in this plan): entry row/log views, reports, waste, task chooser internals.

---

### Task 1: Start/stop queue (no silent drops)

**Problem:** A single-flight boolean dropped overlapping start/stop clicks (`if (timerMutationInFlight) return`). Double-clicks from the bar or mini-timer vanished with no feedback.

**Intended behavior (Clockify-parity / OD §2):** Queue overlapping start/stop. Later ops wait; none dropped. Show pending (`…`) while a mutation runs. Discard uses the same stop path (queued). Failures toast + allow retry after pending clears.

**Files:**

- Create: `apps/web/src/features/time-tracking/timer-mutation-queue.ts`
- Create: `apps/web/src/features/time-tracking/timer-mutation-queue.test.ts`
- Modify: `apps/web/src/features/time-tracking/stores/agency-time-tracking.ts` (replace single-flight gate)
- Modify: `docs/golden-file-source-inventory.md` (via `check:golden`)

**Interfaces:**

- Consumes: existing `runStartTimer` / `runStopTimer`
- Produces: `createTimerMutationQueue(): { enqueue(run: () => Promise<void>): Promise<void> }`

- [x] **Step 1: Add queue unit tests**

```typescript
// apps/web/src/features/time-tracking/timer-mutation-queue.test.ts
import { describe, expect, test } from "bun:test";
import { createTimerMutationQueue } from "./timer-mutation-queue";

describe("createTimerMutationQueue", () => {
  test("runs overlapping mutations in order instead of dropping", async () => {
    const queue = createTimerMutationQueue();
    const order: number[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.enqueue(async () => {
      await firstGate;
      order.push(1);
    });
    const second = queue.enqueue(async () => {
      order.push(2);
    });

    expect(order).toEqual([]);
    releaseFirst?.();
    await Promise.all([first, second]);
    expect(order).toEqual([1, 2]);
  });

  test("continues the queue after a rejected mutation", async () => {
    const queue = createTimerMutationQueue();
    const order: string[] = [];

    const failed = queue.enqueue(async () => {
      order.push("fail");
      throw new Error("boom");
    });
    const next = queue.enqueue(async () => {
      order.push("next");
    });

    await expect(failed).rejects.toThrow("boom");
    await next;
    expect(order).toEqual(["fail", "next"]);
  });
});
```

- [x] **Step 2: Implement queue**

```typescript
// apps/web/src/features/time-tracking/timer-mutation-queue.ts
/**
 * Serializes async timer start/stop so overlapping clicks enqueue instead of
 * dropping. Previous rejection still advances the chain so later ops run.
 */
export function createTimerMutationQueue() {
  let chain: Promise<void> = Promise.resolve();

  function enqueue(run: () => Promise<void>): Promise<void> {
    const next = chain.then(run, run);
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  return { enqueue };
}
```

- [x] **Step 3: Wire store start/stop through the queue**

Replace the single-flight gate in `createAgencyTimeTrackingActions`:

```typescript
import { createTimerMutationQueue } from "@/features/time-tracking/timer-mutation-queue";

const timerMutationQueue = createTimerMutationQueue();

function startTimer(payload: StartTimerPayload) {
  return timerMutationQueue.enqueue(() => runStartTimer(payload));
}

function stopTimer(payload: StopTimerPayload) {
  return timerMutationQueue.enqueue(() => runStopTimer(payload));
}
```

Pending UI continues to use `selectIsTimerMutationPending` (`timerStartCount` / `timerStopCount` / `timerAdjustCount`) incremented inside `runStartTimer` / `runStopTimer`.

- [x] **Step 4: Verify**

```bash
bun test apps/web/src/features/time-tracking/timer-mutation-queue.test.ts
```

Expected: PASS (2 tests).

Manual: rapid double Start / Stop from bar and mini-timer — second action runs after first; no silent no-op.

- [x] **Step 5: Pending across queue handoff**

`timerQueueDepth` increments on enqueue and decrements when the queued run settles, so `selectIsTimerMutationPending` stays true across chained start/stop with no enable flash.

- [x] **Step 6: Inventory**

Queue + test rows present in `docs/golden-file-source-inventory.md`.

---

### Task 2: Visible stop blockers

**Problem:** Stop disabled for empty description / unbound timer without task was easy to miss when the only cue was `title` tooltip.

**Intended behavior (OD §2–3):** Disable Stop when blocked; warning ring on Stop; **inline** message (not title-only): “Add a description before stopping the timer.” / “Choose a task before stopping the timer.” Typing description or choosing a mid-run task clears the hint and enables Stop. Prefer already-resolved draft `selectedTask` so chooser picks unlock Stop before server bind catches up.

**Files:**

- Modify: `apps/web/src/features/time-tracking/timer-validation.ts`
- Modify: `apps/web/src/features/time-tracking/timer-validation.test.ts`
- Modify: `apps/web/src/features/time-tracking/hooks/use-agency-time-tracker.ts`
- Modify: `apps/web/src/features/time-tracking/agency-time-tracker-view.tsx`

**Interfaces:**

- Consumes: `getAgencyTimerStopBlockedMessage`, `getAgencyTimerStopButtonPresentation`, hook ViewModel fields
- Produces: `stopButtonHint`, `stopButtonWarningRing`, `stopButtonDisabled`, `aria-describedby` → `#agency-timer-stop-blocker`

- [x] **Step 1: Prefer resolved draft task in blocker logic**

```typescript
// getAgencyTimerStopBlockedMessage — prefer selectedTask so mid-run chooser picks unlock Stop
const task =
  input.selectedTask ??
  resolveAgencyTimerTaskRef({
    activeTimer: input.activeTimer,
    selectedTaskId: input.selectedTaskId,
    selectedTaskTitle: input.selectedTaskTitle,
    catalogTasks: input.catalogTasks,
  });
```

- [x] **Step 2: Test unbound timer + selectedTask**

```typescript
it("accepts a resolved draft task for an unbound timer", () => {
  expect(
    getAgencyTimerStopBlockedMessage({
      activeTimer: { taskId: null, taskTitle: null, description: "", projectId: "" },
      description: "Work",
      selectedTask: task,
    }),
  ).toBeNull();
});
```

- [x] **Step 3: Hook passes draft ids into `canStopAgencyTimer`**

```typescript
const canStopTimer = canStopAgencyTimer({
  activeTimer,
  description: timerDescription,
  selectedTask: resolvedTimerTask,
  selectedTaskId,
  selectedTaskTitle,
  catalogTasks: tasks,
});
```

ViewModel already exposes `stopButtonHint = stopBlockedMessage`, `stopButtonWarningRing: Boolean(stopBlockedMessage)`.

- [x] **Step 4: View — ring + inline alert + describedby**

```tsx
<div className="relative flex flex-col items-stretch">
  <Button
    className={cn(
      agencyTimeTrackerStopActionClass,
      "rounded-md",
      view.stopButtonWarningRing && "ring-2 ring-warning/70 ring-offset-1 ring-offset-background",
    )}
    disabled={view.stopButtonDisabled}
    aria-label={view.stopButtonLabel}
    aria-describedby={view.stopButtonHint ? "agency-timer-stop-blocker" : undefined}
    title={view.stopButtonHint ?? undefined}
    onClick={view.onStopTimer}
  >
    {view.stopButtonLabel}
  </Button>
  {view.stopButtonHint ? (
    <p id="agency-timer-stop-blocker" className="… text-xs text-warning" role="alert">
      {view.stopButtonHint}
    </p>
  ) : null}
</div>
```

- [x] **Step 5: Verify**

```bash
bun test apps/web/src/features/time-tracking/timer-validation.test.ts
```

Manual: run timer with empty description → Stop disabled, ring + alert copy; type description → clears; unbound + pick task → Stop enables.

**Remaining:** none material.

---

### Task 3: Pending a11y

**Problem:** While start/stop ran, controls needed clear busy state for AT and sighted users (not only a disabled button).

**Intended behavior (OD §1 pending bar):** Pending shows `…` on Start/Stop; disables description / Start / Stop / discard menu; announce busy. OD mock also shows a polite `Saving…` label — product may use button-level busy instead.

**Files:**

- Modify: `apps/web/src/features/time-tracking/agency-time-tracker-view.tsx`
- Hook already exposes `isTimerMutationPending` via `selectIsTimerMutationPending`

- [x] **Step 1: `aria-busy` on Start and Stop; `…` label while pending**

```tsx
// Stop
aria-busy={view.isTimerMutationPending || undefined}
// Start
aria-busy={view.isTimerMutationPending || undefined}
{view.isTimerMutationPending ? "…" : "Start"}
```

`getAgencyTimerStopButtonPresentation({ isPending })` already returns `{ label: "…", disabled: true }`.

- [x] **Step 2: Disable discard affordances while pending**

Timer options trigger + Discard button: `disabled={view.isTimerMutationPending}`.

Description field already disables when `view.isTimerMutationPending`.

- [x] **Step 3: Polite `Saving…` live region**

```tsx
{
  view.isTimerMutationPending ? (
    <span className="sr-only" aria-live="polite">
      Saving…
    </span>
  ) : null;
}
```

- [x] **Step 4: Verify**

Manual: start/stop while pending — buttons show `…`, controls disabled, screen reader announces busy (or `Saving…` if Step 3 added).

---

### Task 4: Suggestion-pick flush (mid-track description sync)

**Problem:** Suggestion list uses `mousedown` `preventDefault` so the input never blurs. Parent `onBlur` (which flushes `flushActiveTimerDescription` while dirty/focused) was skipped after a pick → draft could look stuck / fail to sync until a later blur.

**Intended behavior:** Explicit suggestion pick applies description (+ task/project via `onSelectOption`) and **flushes** the same path as blur so mid-track sync does not stick. Typing alone never mutates task.

**Files:**

- Modify: `apps/web/src/features/time-tracking/agency-description-datalist-field.tsx`
- Existing: `handleDescriptionBlur` in `use-agency-time-tracker.ts` already flushes then clears focused

- [x] **Step 1: Call `onBlur` after pick**

```typescript
function selectOption(option: DescriptionDatalistOption) {
  if (onSelectOption) {
    onSelectOption(option);
  } else {
    onValueChange(option.description);
  }
  setFocused(false);
  // mousedown preventDefault skips input blur; still flush parent focus/dirty.
  onBlur?.();
}
```

- [x] **Step 2: Verify**

Manual: running timer → pick a suggestion → description persists to server (no stale overwrite from cache); task only changes when pick includes task binding via `onSelectOption`.

**Remaining:** none material.

---

## Verification (full slice)

```bash
bun test apps/web/src/features/time-tracking/timer-mutation-queue.test.ts
bun test apps/web/src/features/time-tracking/timer-validation.test.ts
bun run check
bun run check-types
bun run check:conventions
bun run check:golden
```

Browser (Agency → Tracker):

1. Double-click Start / Stop / mini-timer — both actions apply in order.
2. Empty description while running — Stop ring + inline alert; fill description — Stop works.
3. Unbound timer — choose task mid-run — Stop unlocks without refresh.
4. Pending — `…`, disabled controls, busy announcement.
5. Pick description suggestion mid-track — value syncs; task unchanged unless pick supplies one.

## Self-review

1. **Spec coverage:** OD §2 actions Start/Stop/Discard/suggestion/overlapping map to Tasks 1–4; mid-track debounce/dirty skip already existed and is only completed by Task 4 flush.
2. **Placeholders:** none — remaining work is optional polish with concrete snippets.
3. **Type consistency:** `createTimerMutationQueue().enqueue`, `stopButtonHint` / `stopButtonWarningRing` / `isTimerMutationPending` match shipped ViewModel.

## Execution handoff

Plan + craft polish are complete in the uncommitted working tree. Recommended next action: commit.
