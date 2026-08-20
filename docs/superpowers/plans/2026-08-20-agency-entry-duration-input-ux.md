# Agency Entry Duration Input UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the entries-log duration field (`data-time-field="duration"`) match the confirmed time-changer contract and Clockify muscle memory — focus-safe typing, select-all on focus, deferred commit, and quiet editable affordance — without redesigning the time rail.

**Architecture:** Mirror the tracker elapsed pattern (`elapsedEditing` + `elapsedDraft` in `use-agency-time-tracker.ts`): add `durationInputDraft` in `use-agency-time-entry-row.ts`, commit on blur/Enter via `applyDurationToDraft`, keep arrow nudge updating linked end-time preview. Add a shared duration input class in `agency-ui.ts` aligned with existing clock inputs. Spec: [`docs/superpowers/specs/2026-07-28-agency-time-changer-ux-design.md`](../specs/2026-07-28-agency-time-changer-ux-design.md) (interaction contract rows: Focus, Type, Enter, Escape, ↑/↓, Blur, Invalid).

**Tech Stack:** React 19 + Vite (`apps/web`), Bun test, existing `parseDurationInput` / `applyDurationToDraft` / `time-field-keyboard` helpers, shadcn `Input`.

## Global Constraints

- UX/interaction only — no rail geometry changes (`agencyTimeEntryRailDurationClass` width stays `133px`).
- Clockify-parity interaction; no modals or custom pickers.
- Durations stay second-precise (`hh:mm:ss`) end-to-end.
- Golden layers: orchestration in `use-agency-time-entry-row.ts`; view binds props only.
- Multi-entry rows stay read-only for duration — out of scope.
- Views must not import oRPC, TanStack Query, or stores.
- Bun only: `bun test <file>`, `bun run check`, `bun run check-types`, `bun run check:conventions`.
- Reuse existing `editingDuration`, `timeEditorOpen`, `shouldSyncTimeDraftFromEntry` — no parallel focus-lock flags.
- Subtle hover/focus border on the duration cell is allowed (same treatment as start/end clock inputs); not a rail restyle.

## Problem (current vs spec)

| Contract | Start/end clocks | Duration (today) | Target |
| -------- | ---------------- | ---------------- | ------ |
| Focus select-all | ✅ `e.currentTarget.select()` | ❌ missing | ✅ |
| Type = local draft until commit | ✅ separate `startTimeInput` / `endTimeInput` labels | ❌ `onChange` calls `applyDurationToDraft` (reformats + moves end time live) | ✅ `durationInputDraft` |
| Hover/focus editable affordance | ✅ `agencyTimeEntryClockTimeInputClass` | ❌ flat transparent input | ✅ shared duration class |
| Arrow nudge updates linked fields | ✅ updates draft + end/start | ⚠️ nudges committed draft | ✅ nudge draft + preview end |
| Invalid → revert + error | ✅ commit paths | ⚠️ partial (no explicit invalid duration message) | ✅ `Invalid duration.` |

Root cause: duration reuses `editDraft.durationInput` as both display and edit buffer, unlike tracker elapsed (`elapsedEditing ? elapsedDraft : elapsedLabel`).

## File map

| File | Responsibility |
| ---- | -------------- |
| Create: `apps/web/src/features/time-tracking/duration-input-commit.ts` | Pure commit/normalize helper (Bun-tested) |
| Create: `apps/web/src/features/time-tracking/duration-input-commit.test.ts` | Tests for commit + invalid revert |
| Modify: `apps/web/src/features/shared/agency-ui.ts` | `agencyTimeEntryDurationInputClass` (clock-parity affordance, duration width) |
| Modify: `apps/web/src/features/time-tracking/hooks/use-agency-time-entry-row.ts` | `durationInputDraft`, focus/commit/blur/nudge/Escape |
| Modify: `apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx` | Bind draft display, select-all focus, new class, `inputMode` |
| Modify: `docs/golden-file-source-inventory.md` | Via `bun run check:golden` after new files |

---

### Task 1: Pure duration commit helper

**Files:**

- Create: `apps/web/src/features/time-tracking/duration-input-commit.ts`
- Create: `apps/web/src/features/time-tracking/duration-input-commit.test.ts`

**Interfaces:**

- Consumes: `parseDurationInput`, `formatDurationInput`, `applyDurationToDraft`, `TimeEntryDraft` from `./time-entry-draft`
- Produces:
  - `commitDurationToDraft(draft: TimeEntryDraft, rawInput: string): { draft: TimeEntryDraft } | { error: "Invalid duration."; revertInput: string }`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/features/time-tracking/duration-input-commit.test.ts
import { describe, expect, test } from "bun:test";
import { commitDurationToDraft } from "./duration-input-commit";
import type { TimeEntryDraft } from "./agency-time-entry";

const baseDraft: TimeEntryDraft = {
  projectId: "p1",
  taskId: "t1",
  tagIds: [],
  isBillable: true,
  date: "2026-08-20",
  startTime: "09:00:00",
  endTime: "09:03:30",
  durationInput: "00:03:30",
  description: "",
};

describe("commitDurationToDraft", () => {
  test("normalizes shorthand and updates end time from fixed start", () => {
    const result = commitDurationToDraft(baseDraft, "1:30");
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.draft.durationInput).toBe("01:30:00");
    expect(result.draft.endTime).toBe("10:30:00");
  });

  test("preserves second precision", () => {
    const result = commitDurationToDraft(baseDraft, "00:03:31");
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.draft.durationInput).toBe("00:03:31");
  });

  test("rejects empty/invalid with revert token", () => {
    const result = commitDurationToDraft(baseDraft, "abc");
    expect(result).toEqual({
      error: "Invalid duration.",
      revertInput: "00:03:30",
    });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
bun test apps/web/src/features/time-tracking/duration-input-commit.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement helper**

```typescript
// apps/web/src/features/time-tracking/duration-input-commit.ts
import type { TimeEntryDraft } from "./agency-time-entry";
import { applyDurationToDraft, formatDurationInput, parseDurationInput } from "./time-entry-draft";

export type DurationCommitResult =
  | { draft: TimeEntryDraft }
  | { error: "Invalid duration."; revertInput: string };

export function commitDurationToDraft(
  draft: TimeEntryDraft,
  rawInput: string,
): DurationCommitResult {
  const trimmed = rawInput.trim();
  if (!trimmed || parseDurationInput(trimmed) === null) {
    return { error: "Invalid duration.", revertInput: draft.durationInput };
  }
  const nextDraft = applyDurationToDraft(draft, trimmed);
  // applyDurationToDraft keeps raw string when parse fails; guard anyway.
  if (parseDurationInput(nextDraft.durationInput) === null) {
    return { error: "Invalid duration.", revertInput: draft.durationInput };
  }
  return { draft: nextDraft };
}

/** Format a committed duration for display when not editing. */
export function formatCommittedDurationInput(seconds: number): string {
  return formatDurationInput(seconds);
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
bun test apps/web/src/features/time-tracking/duration-input-commit.test.ts
```

- [ ] **Step 5: Inventory + commit**

```bash
bun run check:golden
git add apps/web/src/features/time-tracking/duration-input-commit.ts \
  apps/web/src/features/time-tracking/duration-input-commit.test.ts \
  docs/golden-file-source-inventory.md
git commit -m "$(cat <<'EOF'
feat: add duration commit helper for entry rows

EOF
)"
```

---

### Task 2: Duration input styling affordance

**Files:**

- Modify: `apps/web/src/features/shared/agency-ui.ts`

**Interfaces:**

- Produces: `agencyTimeEntryDurationInputClass` — clock-parity hover/focus border, mono tabular, fits `133px` rail cell

- [ ] **Step 1: Add shared class next to clock input class**

```typescript
/** Clockify-style duration — bold metric, quiet border on hover/focus (entry log rail). */
export const agencyTimeEntryDurationInputClass = cn(
  // Override shared Input defaults (rounded-4xl, bg-input/30, focus ring).
  "h-8 w-full min-w-0 appearance-none rounded-none border border-transparent bg-transparent px-0 py-0",
  "text-center font-mono text-sm font-semibold tabular-nums text-highlighted shadow-none outline-none",
  "transition-colors hover:border-border",
  "focus-visible:border-primary focus-visible:bg-transparent focus-visible:ring-0",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive",
);
```

- [ ] **Step 2: Run checks**

```bash
bun run check
bun run check-types --filter=web
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/shared/agency-ui.ts
git commit -m "$(cat <<'EOF'
feat: add entry duration input affordance class

EOF
)"
```

---

### Task 3: Hook — deferred duration draft + commit path

**Files:**

- Modify: `apps/web/src/features/time-tracking/hooks/use-agency-time-entry-row.ts`

**Interfaces:**

- Consumes: `commitDurationToDraft` from `../duration-input-commit`
- Produces on view model:
  - `durationInputDraft: string`
  - `onDurationFocus: () => void` (replaces bare `onEditingDurationChange(true)` from view)
  - Updated `onDurationChange`, `onDurationBlur`, `onInlineKeyDown`

- [ ] **Step 1: Add draft state + empty sentinel**

```typescript
const emptyDurationDraft = "";

const [durationInputDraft, setDurationInputDraft] = useState(emptyDurationDraft);
```

- [ ] **Step 2: Reset draft whenever committed draft syncs from entry**

In the existing `useEffect` that calls `entryToDraft(primaryEntry)` when `shouldSyncTimeDraftFromEntry` is true, also:

```typescript
setDurationInputDraft(emptyDurationDraft);
```

In `resetEditDraft`, same reset.

- [ ] **Step 3: Implement commitDurationInput (mirror commitStartTimeInput)**

```typescript
const commitDurationInput = useCallback(
  async (raw = durationInputDraft) => {
    if (isMulti) return;
    const result = commitDurationToDraft(editDraft, raw);
    if ("error" in result) {
      setDurationInputDraft(result.revertInput);
      setEditError(result.error);
      return;
    }
    const nextDraft = result.draft;
    setDurationInputDraft(emptyDurationDraft);
    setEndTimeInput(formatClockTimeLabel(nextDraft.endTime));
    updateInlineDraft(nextDraft);
    await saveInlineDraft(nextDraft);
  },
  [durationInputDraft, editDraft, isMulti, saveInlineDraft, updateInlineDraft],
);
```

- [ ] **Step 4: Wire focus / change / blur**

```typescript
const onDurationFocus = useCallback(() => {
  setDurationInputDraft(editDraft.durationInput);
  setEditingDuration(true);
  setTimeEditorOpen(true);
  setEditError(null);
}, [editDraft.durationInput]);

const onDurationChange = useCallback((value: string) => {
  setDurationInputDraft(value);
  if (editError) setEditError(null);
}, [editError]);

const onDurationBlur = useCallback(
  async (event: FocusEvent<HTMLInputElement>) => {
    const stayingInTime = isTimeFieldTarget(event.relatedTarget);
    setEditingDuration(false);
    try {
      if (durationInputDraft !== emptyDurationDraft) {
        await commitDurationInput(durationInputDraft);
      }
    } finally {
      if (!stayingInTime) setTimeEditorOpen(false);
    }
  },
  [commitDurationInput, durationInputDraft],
);
```

Remove the old `onDurationChange` that called `applyDurationToDraft` on every keystroke.

- [ ] **Step 5: Update arrow nudge + Escape in onInlineKeyDown**

Duration nudge branch:

```typescript
const durationDelta = durationNudgeSeconds(event);
if (durationDelta !== null && field === "duration") {
  event.preventDefault();
  const current =
    durationInputDraft !== emptyDurationDraft
      ? durationInputDraft
      : editDraft.durationInput;
  const nextDuration = nudgeDurationInput(current, durationDelta);
  if (!nextDuration) return;
  setDurationInputDraft(nextDuration);
  const preview = applyDurationToDraft(editDraft, nextDuration);
  setEndTimeInput(formatClockTimeLabel(preview.endTime));
  updateInlineDraft(preview);
  return;
}
```

Escape branch: after `resetEditDraft()`, add `setDurationInputDraft(emptyDurationDraft)`.

Enter on duration: call `commitDurationInput` then blur (keep existing double-save guard — blur alone commits).

- [ ] **Step 6: Export new view-model fields**

Add to `AgencyTimeEntryRowViewModel`:

```typescript
durationInputDraft: string;
onDurationFocus: () => void;
```

Remove `onEditingDurationChange` from the public view model (hook-internal only) unless other callers need it — view will call `onDurationFocus` instead.

- [ ] **Step 7: Run tests**

```bash
bun test apps/web/src/features/time-tracking/duration-input-commit.test.ts \
  apps/web/src/features/time-tracking/time-field-keyboard.test.ts \
  apps/web/src/features/time-tracking/time-entry-draft.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/time-tracking/hooks/use-agency-time-entry-row.ts
git commit -m "$(cat <<'EOF'
fix: defer entry duration edits until commit

EOF
)"
```

---

### Task 4: View — bind draft display + focus select-all

**Files:**

- Modify: `apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx`

**Interfaces:**

- Consumes: `durationInputDraft`, `onDurationFocus`, updated handlers from view model
- Consumes: `agencyTimeEntryDurationInputClass` from `@/features/shared/agency-ui`

- [ ] **Step 1: Update duration Input binding**

Replace the duration block with:

```tsx
<Input
  type="text"
  inputMode="decimal"
  data-time-field="duration"
  value={editingDuration ? durationInputDraft : editDraft.durationInput}
  onChange={(e) => onDurationChange(e.target.value)}
  onFocus={(e) => {
    onDurationFocus();
    requestAnimationFrame(() => e.currentTarget.select());
  }}
  onBlur={onDurationBlur}
  onKeyDown={onInlineKeyDown}
  disabled={editSaving || rowUpdating}
  className={agencyTimeEntryDurationInputClass}
  aria-label="Duration"
  aria-invalid={clockInvalid.duration}
  title="Duration — ↑↓ seconds, Shift+↑↓ minutes, Enter to save, Esc to cancel"
/>
```

Import `agencyTimeEntryDurationInputClass`; destructure `durationInputDraft`, `onDurationFocus` from `view`; remove `onEditingDurationChange` usage.

- [ ] **Step 2: Run conventions**

```bash
bun run check
bun run check-types --filter=web
bun run check:conventions
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx
git commit -m "$(cat <<'EOF'
feat: Clockify-parity duration input in entry rows

EOF
)"
```

---

### Task 5: Browser verify + ship gate

**Files:** none unless bugs found.

- [ ] **Step 1: Browser checklist (Agency Tracker → entries log)**

1. Click duration on a single entry — full value selects; typing `1:30` does **not** reformat until blur/Enter.
2. Blur/Enter commits → end time shifts, duration shows `01:30:00`, day total updates.
3. ↑/↓ nudges seconds; Shift+↑/↓ nudges minutes; end-time preview updates while focused.
4. Escape restores last committed duration + end time; description field unaffected.
5. Invalid input (`abc`) → `Invalid duration.` alert, field reverts to last good, `aria-invalid` on duration.
6. Hover shows quiet border (matches start/end clocks); focus border is primary, not a heavy ring.
7. While editing duration, live cache/timer refresh does not stomp the in-progress string.
8. Multi-entry grouped row duration stays read-only span (unchanged).

- [ ] **Step 2: Final gate**

```bash
bun test apps/web/src/features/time-tracking/duration-input-commit.test.ts \
  apps/web/src/features/time-tracking/time-field-keyboard.test.ts \
  apps/web/src/features/time-tracking/time-entry-draft.test.ts \
  apps/web/src/features/time-tracking/agency-time-entry.test.ts
bun run check
bun run check-types --filter=web
bun run check:conventions
bun run check:golden
```

- [ ] **Step 3: Commit any fixes from Step 1** (only if needed)

---

## Self-review

1. **Spec coverage:** Focus select-all → Task 4; Type local draft → Task 3; Enter/Escape/Blur commit → Task 3; ↑/↓ linked preview → Task 3; Invalid revert → Tasks 1 & 3; focus lock → existing `editingDuration` + `timeEditorOpen` (unchanged); multi read-only → Global Constraints.
2. **Placeholder scan:** No TBD/TODO steps; code blocks are complete.
3. **Type consistency:** `commitDurationToDraft`, `durationInputDraft`, `onDurationFocus`, `agencyTimeEntryDurationInputClass` names match across tasks.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-20-agency-entry-duration-input-ux.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — execute tasks in this session using executing-plans checkpoints

**Which approach?**
