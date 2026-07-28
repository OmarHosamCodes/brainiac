# Agency Time-Changer UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Agency Tracker and entries-log time editors focus-safe and keyboard-complete (Enter / Escape / Tab / arrow nudge) without fighting live timer or cache sync.

**Architecture:** Keep pure clock/duration nudge + keyboard intent helpers in `time-entry-draft.ts` (domain-logic, Bun-tested). Wire focus-lock and key handling in `use-agency-time-entry-row.ts` and `use-agency-time-tracker.ts`. Views only bind focus/blur/keydown props — no new hooks in `*-view.tsx`. Spec: [`docs/superpowers/specs/2026-07-28-agency-time-changer-ux-design.md`](../specs/2026-07-28-agency-time-changer-ux-design.md).

**Tech Stack:** React 19 + Vite (`apps/web`), Bun test, existing `parseClockTimeLabel` / `apply*ToDraft` helpers, shadcn `Input`.

## Global Constraints

- UX only — no visual restyle of the time rail.
- Clockify-parity interaction; do not invent modals or custom pickers.
- Durations stay second-precise (`hh:mm:ss`); clock labels stay Clockify-style without seconds.
- Views remain golden-view (no hooks); orchestration stays in feature hooks.
- Idle manual tracker keeps native `type="time"` — out of scope.
- Multi-entry rows stay read-only for start/end/duration — out of scope.
- Bun only: `bun test <file>`, `bun run check`, `bun run check-types`, `bun run check:conventions`, `bun run check:golden` when adding inventory rows.
- Prefer reuse of existing `timeEditorOpen` / `editingDuration` / `elapsedEditing` / `startTimeEditorOpen` flags over new abstractions.

## File map

| File                                                                                 | Responsibility                                                          |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Create: `apps/web/src/features/time-tracking/time-field-keyboard.ts`                 | Pure nudge + keyboard intent helpers                                    |
| Create: `apps/web/src/features/time-tracking/time-field-keyboard.test.ts`            | Bun tests for nudge / key intents                                       |
| Modify: `apps/web/src/features/time-tracking/hooks/use-agency-time-entry-row.ts`     | Focus lock on start/end; scoped Escape; arrow nudge; commit on Tab path |
| Modify: `apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx` | Wire focus/blur for clocks; `aria-invalid` / alert on error             |
| Modify: `apps/web/src/features/time-tracking/hooks/use-agency-time-tracker.ts`       | Arrow nudge on elapsed + start-time; keep focus lock while editing      |
| Modify: `docs/golden-file-source-inventory.md`                                       | Inventory rows for new keyboard helper + test                           |

---

### Task 1: Pure nudge + keyboard helpers

**Files:**

- Create: `apps/web/src/features/time-tracking/time-field-keyboard.ts`
- Create: `apps/web/src/features/time-tracking/time-field-keyboard.test.ts`
- Modify: `docs/golden-file-source-inventory.md` (via `bun run check:golden` after files exist)

**Interfaces:**

- Consumes: `parseClockTimeLabel`, `formatClockTimeLabel`, `parseDurationInput`, `formatDurationInput` from `./time-entry-draft`
- Produces:
  - `nudgeClockTimeLabel(label: string, deltaMinutes: number, preferMeridiem?: "AM" \| "PM" \| null): string | null`
  - `nudgeDurationInput(durationInput: string, deltaSeconds: number): string | null`
  - `nudgeDraftClockTime(timeHhMmSs: string, deltaMinutes: number): string | null` — operates on draft `HH:MM:SS`
  - `clockNudgeMinutes(event: { key: string; shiftKey: boolean }): number | null` — `ArrowUp` → `+1` / `+5`, `ArrowDown` → `-1` / `-5`, else `null`
  - `durationNudgeSeconds(event: { key: string; shiftKey: boolean }): number | null` — `ArrowUp` → `+1` / `+60`, `ArrowDown` → `-1` / `-60`, else `null`

- [x] **Step 1: Write the failing tests**

```typescript
// apps/web/src/features/time-tracking/time-field-keyboard.test.ts
import { describe, expect, test } from "bun:test";
import {
  clockNudgeMinutes,
  durationNudgeSeconds,
  nudgeClockTimeLabel,
  nudgeDraftClockTime,
  nudgeDurationInput,
} from "./time-field-keyboard";

describe("time-field-keyboard", () => {
  test("clockNudgeMinutes maps arrows and shift", () => {
    expect(clockNudgeMinutes({ key: "ArrowUp", shiftKey: false })).toBe(1);
    expect(clockNudgeMinutes({ key: "ArrowUp", shiftKey: true })).toBe(5);
    expect(clockNudgeMinutes({ key: "ArrowDown", shiftKey: false })).toBe(-1);
    expect(clockNudgeMinutes({ key: "ArrowDown", shiftKey: true })).toBe(-5);
    expect(clockNudgeMinutes({ key: "Enter", shiftKey: false })).toBeNull();
  });

  test("durationNudgeSeconds maps arrows and shift", () => {
    expect(durationNudgeSeconds({ key: "ArrowUp", shiftKey: false })).toBe(1);
    expect(durationNudgeSeconds({ key: "ArrowUp", shiftKey: true })).toBe(60);
    expect(durationNudgeSeconds({ key: "ArrowDown", shiftKey: false })).toBe(-1);
    expect(durationNudgeSeconds({ key: "Enter", shiftKey: false })).toBeNull();
  });

  test("nudgeDraftClockTime wraps within the day", () => {
    expect(nudgeDraftClockTime("05:17:00", 1)).toBe("05:18:00");
    expect(nudgeDraftClockTime("00:00:00", -1)).toBe("23:59:00");
    expect(nudgeDraftClockTime("23:59:00", 1)).toBe("00:00:00");
  });

  test("nudgeClockTimeLabel preserves Clockify label shape", () => {
    expect(nudgeClockTimeLabel("5:17AM", 1)).toBe("5:18AM");
    expect(nudgeClockTimeLabel("11:59PM", 1)).toBe("12:00AM");
  });

  test("nudgeDurationInput stays second-precise and clamps at zero", () => {
    expect(nudgeDurationInput("00:14:08", 1)).toBe("00:14:09");
    expect(nudgeDurationInput("00:00:00", -1)).toBe("00:00:00");
    expect(nudgeDurationInput("00:01:00", -60)).toBe("00:00:00");
    expect(nudgeDurationInput("bogus", 1)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
bun test apps/web/src/features/time-tracking/time-field-keyboard.test.ts
```

Expected: FAIL — module not found / exports missing.

- [ ] **Step 3: Implement helpers**

```typescript
// apps/web/src/features/time-tracking/time-field-keyboard.ts
import {
  formatClockTimeLabel,
  formatDurationInput,
  meridiemFromDraftTime,
  parseClockTimeLabel,
  parseDurationInput,
} from "./time-entry-draft";

const DRAFT_CLOCK_RE = /^(\d{2}):(\d{2}):(\d{2})$/;

export function clockNudgeMinutes(event: { key: string; shiftKey: boolean }): number | null {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return null;
  const step = event.shiftKey ? 5 : 1;
  return event.key === "ArrowUp" ? step : -step;
}

export function durationNudgeSeconds(event: { key: string; shiftKey: boolean }): number | null {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return null;
  const step = event.shiftKey ? 60 : 1;
  return event.key === "ArrowUp" ? step : -step;
}

export function nudgeDraftClockTime(timeHhMmSs: string, deltaMinutes: number): string | null {
  const match = DRAFT_CLOCK_RE.exec(timeHhMmSs.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  // Wrap minutes within 24h; keep seconds (clock labels ignore them on display).
  const total = (((hours * 60 + minutes + deltaMinutes) % 1440) + 1440) % 1440;
  const nextH = Math.floor(total / 60);
  const nextM = total % 60;
  return `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function nudgeClockTimeLabel(
  label: string,
  deltaMinutes: number,
  preferMeridiem?: "AM" | "PM" | null,
): string | null {
  const parsed =
    parseClockTimeLabel(label, { preferMeridiem }) ??
    parseClockTimeLabel(label, {
      preferMeridiem: preferMeridiem ?? meridiemFromDraftTime(label),
    });
  if (!parsed) return null;
  const nudged = nudgeDraftClockTime(parsed, deltaMinutes);
  if (!nudged) return null;
  return formatClockTimeLabel(nudged);
}

export function nudgeDurationInput(durationInput: string, deltaSeconds: number): string | null {
  const seconds = parseDurationInput(durationInput);
  if (seconds === null) return null;
  return formatDurationInput(Math.max(0, seconds + deltaSeconds));
}
```

Fix `nudgeClockTimeLabel` so a single parse path is enough:

```typescript
export function nudgeClockTimeLabel(
  label: string,
  deltaMinutes: number,
  preferMeridiem?: "AM" | "PM" | null,
): string | null {
  const parsed = parseClockTimeLabel(label, { preferMeridiem });
  if (!parsed) return null;
  const nudged = nudgeDraftClockTime(parsed, deltaMinutes);
  if (!nudged) return null;
  return formatClockTimeLabel(nudged);
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
bun test apps/web/src/features/time-tracking/time-field-keyboard.test.ts
```

- [ ] **Step 5: Inventory + commit**

```bash
bun run check:golden
git add apps/web/src/features/time-tracking/time-field-keyboard.ts \
  apps/web/src/features/time-tracking/time-field-keyboard.test.ts \
  docs/golden-file-source-inventory.md
git commit -m "$(cat <<'EOF'
feat: add time-field nudge and keyboard helpers

EOF
)"
```

---

### Task 2: Entry-row focus lock (stop cache stomping)

**Problem:** `useEffect` syncs from `primaryEntry` whenever `!(editingDuration || timeEditorOpen)`. Start/end inputs never set `timeEditorOpen`, so live cache updates overwrite typing.

**Files:**

- Modify: `apps/web/src/features/time-tracking/hooks/use-agency-time-entry-row.ts`
- Modify: `apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx`

**Interfaces:**

- Consumes: existing `onTimeEditorOpenChange` / `timeEditorOpen`
- Produces: start/end focus sets `timeEditorOpen=true`; blur after commit sets `false` when neither clock is the active session

- [ ] **Step 1: Write a pure regression note as a hook-level comment is insufficient — add a focused sync-guard unit test via extracted helper**

Extract a one-liner used by the effect so it is testable without React:

```typescript
// in time-field-keyboard.ts (or keep inline in hook file if you prefer co-location)
export function shouldSyncTimeDraftFromEntry(options: {
  editingDuration: boolean;
  timeEditorOpen: boolean;
}): boolean {
  return !(options.editingDuration || options.timeEditorOpen);
}
```

Add to `time-field-keyboard.test.ts`:

```typescript
test("shouldSyncTimeDraftFromEntry locks while clock or duration editing", () => {
  expect(shouldSyncTimeDraftFromEntry({ editingDuration: false, timeEditorOpen: false })).toBe(
    true,
  );
  expect(shouldSyncTimeDraftFromEntry({ editingDuration: false, timeEditorOpen: true })).toBe(
    false,
  );
  expect(shouldSyncTimeDraftFromEntry({ editingDuration: true, timeEditorOpen: false })).toBe(
    false,
  );
});
```

- [ ] **Step 2: Run test — expect FAIL then implement helper + wire effect**

In `use-agency-time-entry-row.ts`:

```typescript
useEffect(() => {
  if (
    !shouldSyncTimeDraftFromEntry({
      editingDuration,
      timeEditorOpen,
    })
  ) {
    return;
  }
  const nextDraft = entryToDraft(primaryEntry);
  setEditDraft(nextDraft);
  setStartTimeInput(formatClockTimeLabel(nextDraft.startTime));
  setEndTimeInput(formatClockTimeLabel(nextDraft.endTime));
  setEditError(null);
}, [primaryEntry, editingDuration, timeEditorOpen]);
```

- [ ] **Step 3: Wire view focus/blur for clocks**

In `agency-time-entry-row-view.tsx`, on start and end inputs:

```tsx
onFocus={(e) => {
  onTimeEditorOpenChange(true);
  e.currentTarget.select();
}}
onBlur={() => {
  // existing commit blur first
  onStartTimeBlur(); // or onEndTimeBlur
  onTimeEditorOpenChange(false);
}}
```

Duration already sets `onEditingDurationChange(true|false)` — leave that path.

**Caution:** Blur order — call commit, then clear the lock. If commit is async, clear lock only after commit finishes, or clear in the blur handler after `void commit…()` is kicked off **and** keep lock true until commit resolves so a mid-save cache update cannot stomp. Preferred:

```typescript
// hook
const onStartTimeBlur = useCallback(async () => {
  try {
    await commitStartTimeInput();
  } finally {
    setTimeEditorOpen(false);
  }
}, [commitStartTimeInput]);
```

View: `onBlur={() => void onStartTimeBlur()}` and do **not** also call `onTimeEditorOpenChange(false)` from the view (hook owns it). Same for end.

On focus: `onFocus={(e) => { onTimeEditorOpenChange(true); e.currentTarget.select(); }}`.

- [ ] **Step 4: Manual sanity** — with a running/live updating row (or forced `primaryEntry` identity change), focus start, type slowly; value must not snap back.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/time-tracking/hooks/use-agency-time-entry-row.ts \
  apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx \
  apps/web/src/features/time-tracking/time-field-keyboard.ts \
  apps/web/src/features/time-tracking/time-field-keyboard.test.ts
git commit -m "$(cat <<'EOF'
fix: lock entry time drafts while start/end are focused

EOF
)"
```

---

### Task 3: Entry-row keyboard — Escape scope, Enter, arrow nudge

**Files:**

- Modify: `apps/web/src/features/time-tracking/hooks/use-agency-time-entry-row.ts`

**Interfaces:**

- Consumes: `clockNudgeMinutes`, `durationNudgeSeconds`, `nudgeClockTimeLabel`, `nudgeDurationInput`, `applyStartTimeToDraft`, `applyEndTimeToDraft`, `applyDurationToDraft`
- Produces: updated `onInlineKeyDown` behavior per design contract

- [ ] **Step 1: Replace `onInlineKeyDown` with field-aware behavior**

Required behavior:

1. **Arrow nudge** when `data-time-field` is `start` or `end`, or when the event target is the duration input (no `data-time-field` / treat as duration when `editingDuration` or input `aria-label="Duration"` — prefer adding `data-time-field="duration"` on the duration input in the view).
2. On nudge: `preventDefault`, update local draft + linked fields, **do not** persist yet (Clockify nudges then blur/Enter save) — **or** persist immediately if current blur-commit model already persists on every change of duration. Match existing duration path: duration `onChange` only updates draft; persist on blur. So nudge should update draft (+ clock labels) and leave persist to blur/Enter.
3. **Enter:** keep commit for start/end/duration; blur.
4. **Escape:** if `data-time-field` is start/end/duration: `resetEditDraft()`, clear `editingDuration` / `timeEditorOpen`, blur — **do not** call `cancelDescriptionEdit()`. Description Escape stays on `onDescriptionKeyDown` only.

Add `data-time-field="duration"` on the duration `Input` in the view.

Sketch:

```typescript
const onInlineKeyDown = useCallback(
  (event: KeyboardEvent<HTMLInputElement>) => {
    const field = event.currentTarget.dataset.timeField; // "start" | "end" | "duration" | undefined

    const clockDelta = clockNudgeMinutes(event);
    if (clockDelta !== null && (field === "start" || field === "end")) {
      event.preventDefault();
      const prefer =
        field === "start"
          ? meridiemFromDraftTime(editDraft.startTime)
          : meridiemFromDraftTime(editDraft.endTime);
      const currentLabel = field === "start" ? startTimeInput : endTimeInput;
      const nextLabel = nudgeClockTimeLabel(currentLabel, clockDelta, prefer);
      if (!nextLabel) return;
      const parsed = parseClockTimeLabel(nextLabel, { preferMeridiem: prefer });
      if (!parsed) return;
      const nextDraft =
        field === "start"
          ? applyStartTimeToDraft(editDraft, parsed)
          : applyEndTimeToDraft(editDraft, parsed);
      setStartTimeInput(formatClockTimeLabel(nextDraft.startTime));
      setEndTimeInput(formatClockTimeLabel(nextDraft.endTime));
      updateInlineDraft(nextDraft);
      return;
    }

    const durationDelta = durationNudgeSeconds(event);
    if (durationDelta !== null && field === "duration") {
      event.preventDefault();
      const nextDuration = nudgeDurationInput(editDraft.durationInput, durationDelta);
      if (!nextDuration) return;
      updateInlineDraft(applyDurationToDraft(editDraft, nextDuration));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      setEditingDuration(false);
      if (field === "start") {
        void commitStartTimeInput().then(() => event.currentTarget.blur());
        return;
      }
      if (field === "end") {
        void commitEndTimeInput().then(() => event.currentTarget.blur());
        return;
      }
      void saveInlineDraft().then(() => {
        setTimeEditorOpen(false);
        event.currentTarget.blur();
      });
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      resetEditDraft();
      setEditingDuration(false);
      setTimeEditorOpen(false);
      event.currentTarget.blur();
      // deliberately do not cancelDescriptionEdit()
    }
  },
  [
    /* deps */
  ],
);
```

- [ ] **Step 2: Align error a11y on the row**

In `agency-time-entry-row-view.tsx`, change error from plain `<p className="… text-error">` to:

```tsx
{
  editError ? (
    <p className="absolute top-full left-2.5 z-10 text-xs text-destructive" role="alert">
      {editError}
    </p>
  ) : null;
}
```

Add `aria-invalid={Boolean(editError)}` on start/end/duration inputs when that field caused the error if easy; otherwise `aria-invalid={Boolean(editError)}` on all three while `editError` is set is acceptable for this slice.

- [ ] **Step 3: Run existing draft + new keyboard tests**

```bash
bun test apps/web/src/features/time-tracking/time-entry-draft.test.ts \
  apps/web/src/features/time-tracking/time-field-keyboard.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/time-tracking/hooks/use-agency-time-entry-row.ts \
  apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx
git commit -m "$(cat <<'EOF'
feat: Clockify-parity keyboard for entry time fields

EOF
)"
```

---

### Task 4: Tracker elapsed + start-time keyboard parity

**Files:**

- Modify: `apps/web/src/features/time-tracking/hooks/use-agency-time-tracker.ts`

**Interfaces:**

- Consumes: same nudge helpers; existing `persistElapsedDraft`, `persistStartTimeDraft`, `syncStartDraftFromTimer`
- Produces: arrow nudge on elapsed draft and start-time draft; Escape/Enter unchanged except nudge added

- [ ] **Step 1: Extend `onElapsedKeyDown`**

```typescript
function onElapsedKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  const delta = durationNudgeSeconds(event);
  if (delta !== null) {
    event.preventDefault();
    const next = nudgeDurationInput(elapsedDraft || elapsedLabel || "00:00:00", delta);
    if (next) {
      setElapsedDraft(next);
      if (elapsedError) setElapsedError(null);
    }
    return;
  }
  // existing Enter / Escape branches unchanged
  ...
}
```

- [ ] **Step 2: Extend `onStartTimeKeyDown`**

```typescript
function onStartTimeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  const delta = clockNudgeMinutes(event);
  if (delta !== null) {
    event.preventDefault();
    const prefer = activeTimer
      ? meridiemFromDraftTime(startedAtToDateTimeDraft(activeTimer.startedAt).startTime)
      : null;
    const next = nudgeClockTimeLabel(startTimeDraft, delta, prefer);
    if (next) {
      setStartTimeDraft(next);
      if (startTimeError) setStartTimeError(null);
    }
    return;
  }
  // existing Enter / Escape
  ...
}
```

- [ ] **Step 3: Focus-lock audit for tracker**

Confirm:

- Elapsed display uses `elapsedDraft` only while `elapsedEditing` (already true via view binding).
- `syncStartDraftFromTimer` is **not** called from a `useEffect` on `activeTimer.startedAt` while the popover is open — only on open / Escape / elapsed focus. If any effect syncs drafts from `activeTimer` while `startTimeEditorOpen || elapsedEditing`, gate it the same way as entry rows.

- [ ] **Step 4: Run checks**

```bash
bun test apps/web/src/features/time-tracking/time-field-keyboard.test.ts
bun run check
bun run check-types --filter=web
bun run check:conventions
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/time-tracking/hooks/use-agency-time-tracker.ts
git commit -m "$(cat <<'EOF'
feat: arrow-nudge elapsed and start time on tracker

EOF
)"
```

---

### Task 5: Browser verify + ship gate

**Files:** none required unless bugs found.

- [ ] **Step 1: Browser checklist (Agency Tracker)**

1. Start a timer. Open start-time popover. Type slowly while elapsed ticks — draft must not reset.
2. ↑/↓ on start time nudges minutes; Shift jumps 5; Enter saves; Escape reverts and closes.
3. Focus elapsed; ↑/↓ nudges seconds; Shift = 1 minute; Enter saves; Escape cancels.
4. In entries log: focus start, type while another update would refresh the list — no stomp.
5. Entry ↑/↓ on start/end/duration; Enter commits; Escape reverts time only (description edit elsewhere unaffected).
6. Invalid input shows `role="alert"` error and restores last good on failed commit.
7. `prefers-reduced-motion`: no new decorative motion (this slice should not add motion).

- [ ] **Step 2: Final gate**

```bash
bun test apps/web/src/features/time-tracking/time-field-keyboard.test.ts \
  apps/web/src/features/time-tracking/time-entry-draft.test.ts
bun run check
bun run check-types --filter=web
bun run check:conventions
bun run check:golden
```

- [ ] **Step 3: Commit any leftover a11y/copy fixes** (only if Step 1 found issues)

---

## Self-review

1. **Spec coverage:** Focus lock → Task 2; keyboard/nudge → Tasks 1, 3, 4; tracker + entry parity → Tasks 3–4; errors/a11y → Task 3; out-of-scope bulk/manual native → Global Constraints.
2. **Placeholders:** None — helpers and hook sketches are concrete.
3. **Type consistency:** `clockNudgeMinutes` / `durationNudgeSeconds` / `nudgeClockTimeLabel` / `nudgeDurationInput` / `shouldSyncTimeDraftFromEntry` names match across tasks.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-28-agency-time-changer-ux.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — execute tasks in this session with executing-plans checkpoints

Which approach?
