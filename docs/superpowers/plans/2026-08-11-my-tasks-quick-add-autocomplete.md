# My Tasks Rail Quick-Add Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add autocomplete suggestions to the My Tasks rail "Add task" input so members can pick an existing open/in-progress task by name (prefer existing over create) with Tracker-parity keyboard and explicit-pick behavior.

**Architecture:** Reuse existing pure helpers (`agency-task-suggestion-query.ts`, `agency-task-title-filter.ts`) and the description-datalist interaction pattern. Hook loads suggestion tasks when the title field is focused (and optionally while typing), ranks locally, and exposes a ViewModel. A presentational quick-add field (props-only) renders the listbox. Picking a suggestion sets title + project and selects/scrolls that task; submitting still goes through `createProjectTask`, which already reuses same-title tasks in-cache.

**Tech Stack:** React 19, TanStack Query via `useAgencyProjectTasksQuery`, existing motion/theme tokens, Bun test for pure ranking helpers.

## Global Constraints

- Prefer existing task over creating a new one (AGENTS.md / product pref).
- Explicit pick only — typing never auto-assigns or mutates project/task; mirror Tracker description suggestions.
- Suggestion dropdown must align exactly to the title input (same left edge and width).
- Golden-file: view props-only; orchestration in `use-agency-my-tasks-rail`; no oRPC in views.
- No new API endpoint — use `agencyOps.projectTasks.list` with existing filters (`statuses`, optional `projectId`, `pageSize`).
- No dedicated clear-X / switch icon on the title field; change via typing or picking another suggestion.
- Bun only: `bun test`, `bun run check`, `bun run check-types`, `bun run check:conventions`, `bun run check:golden` when adding files.
- Operate mode: quiet instrument; reuse `agencyTimeTrackerSuggestionPanelClass` / option classes (or thin rail aliases of those tokens).

## Shape brief (confirmed direction)

| Item                  | Decision                                                                                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Job                   | While quick-adding, find and prefer an existing task by title                                                                                                                                                                      |
| Audience              | Agency member on Tracker My Tasks rail                                                                                                                                                                                             |
| Mode                  | Operate                                                                                                                                                                                                                            |
| Pick                  | Sets `titleDraft` + `projectId` to the chosen task; selects that task in the list (`onSelectTask` + scroll)                                                                                                                        |
| Submit                | Unchanged path → `createProjectTask` (already reuses exact title in project when present)                                                                                                                                          |
| Scope of suggestions  | Open + in_progress; when a project is selected in the composer, prefer that project’s tasks but still show other-project matches ranked lower (or scoped-only — **scoped to selected project when set**, cross-project when empty) |
| Create row in listbox | Optional trailing “Create «query»” only when no exact title match — YAGNI first ship: **no create row**; form submit creates                                                                                                       |
| Untouched             | Mini-timer, filter pills, row morph motion, task chooser internals                                                                                                                                                                 |

---

## File map

| File                                                                                           | Responsibility                                                    |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `apps/web/src/features/task-management/agency-task-suggestion-query.ts`                        | Already exists — filters + `selectTaskSuggestions`                |
| `apps/web/src/features/task-management/agency-task-title-filter.ts`                            | Already exists — ranking / exact match                            |
| `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-quick-add-field-view.tsx` | Presentational input + listbox (new)                              |
| `apps/web/src/features/task-management/hooks/use-agency-my-tasks-rail.ts`                      | Wire suggestion query, focus flag, pick handler, ViewModel fields |
| `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-view.tsx`            | Swap raw `Input` for quick-add field; bind ViewModel              |
| `apps/web/src/features/shared/agency-ui.ts`                                                    | Optional thin aliases for rail suggestion panel/option if needed  |
| `docs/golden-file-source-inventory.md`                                                         | Via `check:golden` for the new view file                          |

---

### Task 1: Harden suggestion selection helpers (cap + project affinity)

**Files:**

- Modify: `apps/web/src/features/task-management/agency-task-suggestion-query.ts`
- Modify: `apps/web/src/features/task-management/agency-task-suggestion-query.test.ts`

**Interfaces:**

- Consumes: `filterTasksByTitleSearch`, `AgencyProjectTask`
- Produces:
  - `TASK_SUGGESTION_LIMIT = 8`
  - `selectTaskSuggestions(tasks, titleDraft, options?: { affinityProjectId?: string }): AgencyProjectTask[]` — ranked, capped

- [ ] **Step 1: Write failing tests**

```typescript
// append to agency-task-suggestion-query.test.ts
import { selectTaskSuggestions, TASK_SUGGESTION_LIMIT } from "./agency-task-suggestion-query";

describe("selectTaskSuggestions ranking", () => {
  test("caps results at TASK_SUGGESTION_LIMIT", () => {
    const tasks = Array.from({ length: 20 }, (_, i) =>
      makeTask({ id: `t${i}`, projectId: "p1", title: `Design ${i}` }),
    );
    expect(selectTaskSuggestions(tasks, "Design")).toHaveLength(TASK_SUGGESTION_LIMIT);
  });

  test("prefers affinity project matches when scores tie", () => {
    const tasks = [
      makeTask({
        id: "other",
        projectId: "p2",
        title: "Brief",
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
      makeTask({
        id: "aff",
        projectId: "p1",
        title: "Brief",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ];
    expect(
      selectTaskSuggestions(tasks, "Brief", { affinityProjectId: "p1" }).map((t) => t.id),
    ).toEqual(["aff", "other"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/features/task-management/agency-task-suggestion-query.test.ts`
Expected: FAIL — `TASK_SUGGESTION_LIMIT` / options arg missing

- [ ] **Step 3: Implement**

```typescript
export const TASK_SUGGESTION_LIMIT = 8;

export function selectTaskSuggestions(
  tasks: AgencyProjectTask[],
  titleDraft: string,
  options?: { affinityProjectId?: string },
): AgencyProjectTask[] {
  const ranked = filterTasksByTitleSearch(tasks, titleDraft);
  const affinity = options?.affinityProjectId;
  if (!affinity) return ranked.slice(0, TASK_SUGGESTION_LIMIT);

  return [...ranked]
    .sort((a, b) => {
      const aHit = a.projectId === affinity ? 0 : 1;
      const bHit = b.projectId === affinity ? 0 : 1;
      return aHit - bHit;
    })
    .slice(0, TASK_SUGGESTION_LIMIT);
}
```

Note: keep primary score order from `filterTasksByTitleSearch`; only break ties / soft-prefer affinity by stable partition: affinity first among equal scores. Prefer: map with score from a shared scorer, or partition after filter:

```typescript
const ranked = filterTasksByTitleSearch(tasks, titleDraft);
if (!affinity) return ranked.slice(0, TASK_SUGGESTION_LIMIT);
const preferred = ranked.filter((t) => t.projectId === affinity);
const rest = ranked.filter((t) => t.projectId !== affinity);
return [...preferred, ...rest].slice(0, TASK_SUGGESTION_LIMIT);
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/task-management/agency-task-suggestion-query.ts \
  apps/web/src/features/task-management/agency-task-suggestion-query.test.ts
git commit -m "$(cat <<'EOF'
feat: cap and affinity-rank My Tasks title suggestions

EOF
)"
```

---

### Task 2: Presentational quick-add field view

**Files:**

- Create: `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-quick-add-field-view.tsx`
- Modify: `docs/golden-file-source-inventory.md` via `bun run check:golden`

**Interfaces:**

- Consumes: `Input`, suggestion panel/option classes from `agency-ui`
- Produces: `AgencyMyTasksQuickAddFieldView` props:

```typescript
export type MyTasksSuggestionItem = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  clientName: string;
};

type AgencyMyTasksQuickAddFieldViewProps = {
  value: string;
  suggestions: MyTasksSuggestionItem[];
  disabled?: boolean;
  suggestionsOpen: boolean;
  activeIndex: number;
  onValueChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onActiveIndexChange: (index: number) => void;
  onPickSuggestion: (item: MyTasksSuggestionItem) => void;
  onSuppressSuggestions: () => void;
};
```

- [ ] **Step 1: Implement view** (mirror `agency-description-datalist-field.tsx` keyboard + panel alignment)

Behavior:

- `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`
- ArrowUp/Down move `activeIndex` (call `onActiveIndexChange`)
- Enter with open suggestions + active item → `onPickSuggestion` (preventDefault — do not submit form)
- Escape → `onSuppressSuggestions`
- Panel: `absolute top-full left-0 z-50 mt-1 w-full` using `agencyTimeTrackerSuggestionPanelClass` (width = input width)
- Option row: title (truncate) + muted meta `client · project`
- Empty: when `suggestionsOpen && value.trim() && suggestions.length === 0`, show muted “No matching tasks” (optional one line)
- Golden-view: no hooks beyond local refs for a11y ids; no stores

```tsx
// Sketch — full file in implementation
export function AgencyMyTasksQuickAddFieldView(props: AgencyMyTasksQuickAddFieldViewProps) {
  const listboxId = useId();
  // Input id="my-tasks-title" preserved
  // Panel only when suggestionsOpen && (suggestions.length > 0 || value.trim())
}
```

- [ ] **Step 2: `bun run check:golden` and conventions on the new file**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-quick-add-field-view.tsx \
  docs/golden-file-source-inventory.md
git commit -m "$(cat <<'EOF'
feat: add My Tasks quick-add suggestion field view

EOF
)"
```

---

### Task 3: Hook — suggestion query + pick/select ViewModel

**Files:**

- Modify: `apps/web/src/features/task-management/hooks/use-agency-my-tasks-rail.ts`

**Interfaces:**

- Consumes: `useAgencyProjectTasksQuery`, `buildTaskSuggestionQueryFilters`, `selectTaskSuggestions`, projects for names
- Produces on ViewModel:

```typescript
titleSuggestions: MyTasksSuggestionItem[];
titleSuggestionsOpen: boolean;
titleSuggestionActiveIndex: number;
setTitleSuggestionActiveIndex: (index: number) => void;
onTitleFocus: () => void;
onTitleBlur: () => void;
onSuppressTitleSuggestions: () => void;
onPickTitleSuggestion: (item: MyTasksSuggestionItem) => void;
// existing: titleDraft, setTitleDraft, onCreateTask, ...
```

- [ ] **Step 1: Add focus + suppress state**

```typescript
const [titleFieldFocused, setTitleFieldFocused] = useState(false);
const [titleSuggestionsSuppressed, setTitleSuggestionsSuppressed] = useState(false);
const [titleSuggestionActiveIndex, setTitleSuggestionActiveIndex] = useState(0);
```

- [ ] **Step 2: Suggestion query**

```typescript
const suggestionsActive = titleFieldFocused && !titleSuggestionsSuppressed;
const suggestionFilters = buildTaskSuggestionQueryFilters({
  suggestionsActive,
  selectedProjectId: projectId,
});
const suggestionTasksQuery = useAgencyProjectTasksQuery(
  teamId,
  suggestionFilters.enabled
    ? { ...suggestionFilters.filters, enabled: true }
    : { enabled: false, statuses: ["open", "in_progress"] },
);
```

Inspect `useAgencyProjectTasksQuery` signature — pass `enabled` correctly (may be top-level filter field).

When `projectId` is set, filters include `projectId` (scoped). When empty, cross-project active tasks.

- [ ] **Step 3: Rank + map display items**

```typescript
const titleSuggestions = useMemo(() => {
  const ranked = selectTaskSuggestions(suggestionTasksQuery.data?.items ?? [], titleDraft, {
    affinityProjectId: projectId || undefined,
  });
  return ranked.map((task) => {
    const project = projects.find((p) => p.id === task.projectId);
    return {
      id: task.id,
      title: task.title,
      projectId: task.projectId,
      projectName: project?.name ?? "Project",
      clientName: project?.clientName ?? "Client",
    };
  });
}, [suggestionTasksQuery.data?.items, titleDraft, projectId, projects]);

const titleSuggestionsOpen =
  titleFieldFocused && !titleSuggestionsSuppressed && titleDraft.trim().length > 0;
```

Reset `titleSuggestionActiveIndex` to 0 when `titleDraft` or suggestions length changes (`useEffect`).

- [ ] **Step 4: Pick handler**

```typescript
function onPickTitleSuggestion(item: MyTasksSuggestionItem) {
  setTitleDraft(item.title);
  setProjectId(item.projectId);
  setTitleSuggestionsSuppressed(true);
  setTitleFieldFocused(false);
  onSelectTask(item.id);
  // scroll handled by existing selectedTaskId effect
}

function onTitleFocus() {
  setTitleFieldFocused(true);
  setTitleSuggestionsSuppressed(false);
}

function onTitleBlur() {
  setTitleFieldFocused(false);
}

function onSuppressTitleSuggestions() {
  setTitleSuggestionsSuppressed(true);
}
```

Unsuppress when `setTitleDraft` changes from typing — in `setTitleDraft` wrapper or effect on `titleDraft`:

```typescript
function onTitleDraftChange(next: string) {
  setTitleDraft(next);
  setTitleSuggestionsSuppressed(false);
}
```

Expose `onTitleDraftChange` instead of raw `setTitleDraft` to the view for the field (keep `setTitleDraft` if used elsewhere).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/task-management/hooks/use-agency-my-tasks-rail.ts
git commit -m "$(cat <<'EOF'
feat: wire My Tasks rail title suggestion query and pick

EOF
)"
```

---

### Task 4: Bind quick-add field in rail view

**Files:**

- Modify: `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-view.tsx`

**Interfaces:**

- Consumes: ViewModel fields from Task 3 + `AgencyMyTasksQuickAddFieldView`

- [ ] **Step 1: Replace the title `Input` in the form**

```tsx
<AgencyMyTasksQuickAddFieldView
  value={view.titleDraft}
  suggestions={view.titleSuggestions}
  disabled={view.isCreatingTask}
  suggestionsOpen={view.titleSuggestionsOpen}
  activeIndex={view.titleSuggestionActiveIndex}
  onValueChange={view.onTitleDraftChange}
  onFocus={view.onTitleFocus}
  onBlur={view.onTitleBlur}
  onActiveIndexChange={view.setTitleSuggestionActiveIndex}
  onPickSuggestion={view.onPickTitleSuggestion}
  onSuppressSuggestions={view.onSuppressTitleSuggestions}
/>
```

Form `onSubmit` unchanged. Ensure Enter-to-pick does not submit (handled in field view).

- [ ] **Step 2: `overflow-visible` on the form or composer section** so the absolute panel is not clipped by `agencyTaskRailClass` `overflow-hidden`.

If the rail card clips the panel, portal the listbox with fixed positioning synced to input rect (same approach as description datalist’s `panelStyle`). Prefer: make the form `overflow-visible` and only keep list scroll `overflow-y-auto` — do not remove overflow from the whole rail if that breaks collapse; use fixed panel coords from `getBoundingClientRect` if needed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-view.tsx \
  apps/web/src/features/shared/agency-ui.ts
git commit -m "$(cat <<'EOF'
feat: show existing-task suggestions in My Tasks quick add

EOF
)"
```

---

### Task 5: Verify

- [ ] **Step 1: Checks**

```bash
bun test apps/web/src/features/task-management/agency-task-suggestion-query.test.ts \
  apps/web/src/features/task-management/agency-task-title-filter.test.ts
bun run check
bun run check-types
bun run check:conventions
bun run check:golden
```

- [ ] **Step 2: Manual smoke (Tracker, logged in)**

1. Focus Add task → type partial title → dropdown aligned to input width.
2. Arrow keys move highlight; Enter picks → title + project update; row selected/scrolled; dropdown closes.
3. Typing after pick reopens suggestions.
4. Escape suppresses; blur closes.
5. Submit new unique title still creates; submit exact existing title reuses (existing store toast).
6. Reduced motion / keyboard-only path works; no create on mere highlight without Enter/click.

- [ ] **Step 3: Fix commit if needed**

```bash
git commit -m "$(cat <<'EOF'
fix: harden My Tasks quick-add suggestions

EOF
)"
```

---

## Self-review

1. **Spec coverage:** Autocomplete on `#my-tasks-title`, prefer existing, explicit pick, align panel, golden layers, reuse helpers — all tasked. Create-row in listbox deferred (YAGNI).
2. **Placeholders:** None — concrete files, props, and code.
3. **Types:** `MyTasksSuggestionItem` defined in Task 2 and consumed in Tasks 3–4 consistently.
4. **Existing stack:** Relies on `createProjectTask` title reuse already in `agency-ops` store — no duplicate create API.
