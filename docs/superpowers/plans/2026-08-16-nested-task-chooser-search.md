# Nested Task Chooser Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the unified Agency task chooser parse a single query as nested client / project / task tokens (AND on the same ancestry path) and auto-expand only matching branches.

**Architecture:** Keep the Clockify tree (client → project → task). Replace whole-string `.includes(query)` with tokenized path matching in a pure helper. `buildAgencyTaskChooserSections` hides non-matching branches and flags which clients/projects should auto-expand. The chooser hook stops force-expanding every node whenever the search box is non-empty. Server `projectTasks.list` search uses the same token AND across task title, project name, and client name so paged catalogs still find nested hits.

**Tech Stack:** Bun test, existing `AgencyTaskChooser` / `agency-chooser-shell`, Drizzle `sql` in `packages/api` task list, shadcn Popover combobox (no new UI kit).

## Global Constraints

- Operate mode: Clockify-adjacent Tracker chooser; refinement of incumbent tree, not a command-palette redesign.
- Prefer existing task over create; no new clear-X / switch-task buttons.
- Visitor mode is Operate: scanability and keyboard over decorative motion.
- Golden-file: matching lives in pure helpers + hook; views stay presentational.
- Apply to every `AgencyTaskChooser` (Tracker, entry rows, My Tasks rail, reports task cell, `pickProject` mode).
- Do not add Clockify `@project` scoping in this plan (YAGNI; tokens on the path cover mixed queries).
- No new dependencies (no Fuse.js / fuzzy library). Prefix/substring AND only.
- Arabic + English: tokenize on Unicode whitespace; match case-insensitive; do not reverse token order.
- Bun only: `bun test`, `bun run check`, `bun run check-types`, `bun run check:conventions`.

## Shape brief (confirmed)

| Item | Decision |
| ---- | -------- |
| Job | Type one box: find a task (or project when `pickProject`) across client, project, and task names |
| Audience | Agency member mid-track or editing an entry; keyboard-first, impatient |
| Mode | Operate |
| Match model | Industry default: whitespace tokens, AND, each token may hit any level of the **same** client→project→task path. Whole-string phrase is a relevance boost when it still matches as a substring of one field, not a separate query language. |
| Expand | **Hits only:** hide non-matching siblings. Expand a client if it or a descendant matches. Expand a project only if a **task** on that project matches. Client-name-only or project-name-only hits stay collapsed at the next level. |
| Surfaces | All `AgencyTaskChooser` instances |
| Untouched | Favorites ranking, create-task / create-project dialogs, trigger formats, description suggestions, My Tasks rail grouping (except it already uses this chooser) |
| Anti-goals | Linear global Search, fuzzy typo engine, `@` syntax, auto-selecting an ambiguous first row on type |

### Interaction thesis

Search the denormalized path, **display** the Clockify tree. Query `"Acme Website Design"` keeps Acme, keeps Website, shows Design; sibling clients stay gone; other Acme projects stay collapsed unless they also satisfy the AND.

### Why the current code fails

1. `buildAgencyTaskChooserSections` uses one `filterQuery` substring. `"Acme Design"` misses unless that exact span exists in concatenated text.
2. A project-name hit returns **all** tasks under the project.
3. `use-agency-task-chooser.ts` does `Boolean(searchTerm.trim()) \|\| isProjectExpanded(id)` (and the same for clients), so any search expands the entire remaining tree.
4. API `list` search is `lower(title) LIKE %whole query%` and never joins project/client, so nested queries miss server pages.

---

## File map

| File | Responsibility |
| ---- | -------------- |
| `apps/web/src/features/time-tracking/agency-task-chooser-search.ts` | Tokenize, path AND match, expand flags |
| `apps/web/src/features/time-tracking/agency-task-chooser-search.test.ts` | Matcher tests |
| `apps/web/src/features/time-tracking/agency-task-chooser-groups.ts` | Filter + attach expand flags |
| `apps/web/src/features/time-tracking/agency-task-chooser-groups.test.ts` | Section tests for nested queries |
| `apps/web/src/features/time-tracking/hooks/use-agency-task-chooser.ts` | Use flags instead of expand-all-on-search; keyboard includeProjects |
| `apps/web/src/features/time-tracking/agency-task-chooser-keyboard.ts` | Include collapsed project rows while searching |
| `apps/web/src/features/time-tracking/agency-task-chooser-keyboard.test.ts` | Keyboard list with mixed expand |
| `apps/web/src/features/time-tracking/choosers/agency-task-chooser-view.tsx` | Empty copy only if needed |
| `packages/api/src/routers/agency-ops/tasks/task-list-search.ts` | Shared token SQL predicate |
| `packages/api/src/routers/agency-ops/tasks/task-list-search.test.ts` | Tokenize + predicate shape tests |
| `packages/api/src/routers/agency-ops/tasks/service.ts` | Use token AND + project/client join |
| `docs/golden-file-source-inventory.md` | `bun run check:golden` if new in-scope files |

---

### Task 1: Path matcher (tokenize + AND)

**Files:**

- Create: `apps/web/src/features/time-tracking/agency-task-chooser-search.ts`
- Create: `apps/web/src/features/time-tracking/agency-task-chooser-search.test.ts`

**Interfaces:**

- Consumes: client / project / task strings
- Produces:
  - `tokenizeChooserQuery(query: string): string[]`
  - `chooserPathMatches(path: { clientName: string; projectName: string; taskTitle?: string }, tokens: string[]): boolean`
  - `chooserSearchExpand(pathHits: { client: boolean; project: boolean; task: boolean }): { expandClient: boolean; expandProject: boolean }`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, test } from "bun:test";
import {
  chooserPathMatches,
  chooserSearchExpand,
  tokenizeChooserQuery,
} from "./agency-task-chooser-search";

describe("tokenizeChooserQuery", () => {
  test("splits on unicode whitespace and lowercases", () => {
    expect(tokenizeChooserQuery("  Acme   Website ")).toEqual(["acme", "website"]);
  });

  test("returns empty for blank query", () => {
    expect(tokenizeChooserQuery("   ")).toEqual([]);
  });
});

describe("chooserPathMatches", () => {
  const acmeDesign = {
    clientName: "Acme",
    projectName: "Website",
    taskTitle: "Design",
  };

  test("empty tokens match every path", () => {
    expect(chooserPathMatches(acmeDesign, [])).toBe(true);
  });

  test("AND tokens across client project and task", () => {
    expect(chooserPathMatches(acmeDesign, ["acme", "website", "design"])).toBe(true);
    expect(chooserPathMatches(acmeDesign, ["acme", "design"])).toBe(true);
    expect(chooserPathMatches(acmeDesign, ["design"])).toBe(true);
    expect(chooserPathMatches(acmeDesign, ["acme", "mobile"])).toBe(false);
  });

  test("does not steal tokens from another client", () => {
    expect(
      chooserPathMatches(
        { clientName: "Beta", projectName: "Website", taskTitle: "Design" },
        ["acme", "design"],
      ),
    ).toBe(false);
  });

  test("project-only path without task title still matches client+project", () => {
    expect(
      chooserPathMatches({ clientName: "Acme", projectName: "Website" }, ["acme", "website"]),
    ).toBe(true);
    expect(
      chooserPathMatches({ clientName: "Acme", projectName: "Website" }, ["acme", "design"]),
    ).toBe(false);
  });
});

describe("chooserSearchExpand", () => {
  test("expands client on any hit; expands project only on task hit", () => {
    expect(chooserSearchExpand({ client: true, project: false, task: false })).toEqual({
      expandClient: true,
      expandProject: false,
    });
    expect(chooserSearchExpand({ client: false, project: true, task: false })).toEqual({
      expandClient: true,
      expandProject: false,
    });
    expect(chooserSearchExpand({ client: false, project: false, task: true })).toEqual({
      expandClient: true,
      expandProject: true,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/features/time-tracking/agency-task-chooser-search.test.ts`

Expected: FAIL (module missing)

- [ ] **Step 3: Write minimal implementation**

```typescript
export function tokenizeChooserQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
}

function fieldHits(value: string, token: string): boolean {
  return value.toLowerCase().includes(token);
}

export function chooserPathMatches(
  path: { clientName: string; projectName: string; taskTitle?: string },
  tokens: string[],
): boolean {
  if (tokens.length === 0) return true;
  const haystacks = [path.clientName, path.projectName, path.taskTitle ?? ""];
  return tokens.every((token) => haystacks.some((field) => fieldHits(field, token)));
}

export function chooserSearchExpand(pathHits: {
  client: boolean;
  project: boolean;
  task: boolean;
}): { expandClient: boolean; expandProject: boolean } {
  const anyHit = pathHits.client || pathHits.project || pathHits.task;
  return {
    expandClient: anyHit,
    expandProject: pathHits.task,
  };
}

export function chooserFieldHits(value: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const lower = value.toLowerCase();
  return tokens.some((token) => lower.includes(token));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/features/time-tracking/agency-task-chooser-search.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/time-tracking/agency-task-chooser-search.ts \
  apps/web/src/features/time-tracking/agency-task-chooser-search.test.ts
git commit -m "$(cat <<'EOF'
feat: add nested token matcher for agency task chooser search

EOF
)"
```

---

### Task 2: Filter sections with nested AND and expand flags

**Files:**

- Modify: `apps/web/src/features/time-tracking/agency-task-chooser-groups.ts`
- Modify: `apps/web/src/features/time-tracking/agency-task-chooser-groups.test.ts`

**Interfaces:**

- Consumes: `tokenizeChooserQuery`, `chooserPathMatches` from Task 1
- Produces: `ChooserProjectGroup` gains `searchExpandProject: boolean`; `ChooserClientGroup` gains `searchExpandClient: boolean`. Empty search: both flags false (manual expand state owns idle tree).

- [ ] **Step 1: Write the failing tests** (append to `agency-task-chooser-groups.test.ts`)

```typescript
describe("nested search", () => {
  test("AND query keeps only the matching client-project-task path", () => {
    const sections = buildAgencyTaskChooserSections({
      projects,
      tasks,
      favoriteProjectIds: [],
      favoriteTaskIds: [],
      searchTerm: "Acme Design",
    });
    const acme = sections.clientGroups.find((group) => group.clientName === "Acme");
    expect(acme?.searchExpandClient).toBe(true);
    expect(acme?.projects.map((entry) => entry.project.id)).toEqual(["p1"]);
    expect(acme?.projects[0]?.searchExpandProject).toBe(true);
    expect(acme?.projects[0]?.tasks.map((task) => task.id)).toEqual(["t1"]);
  });

  test("client-only query keeps all client projects collapsed with all tasks hidden from filter list", () => {
    const sections = buildAgencyTaskChooserSections({
      projects,
      tasks,
      favoriteProjectIds: [],
      favoriteTaskIds: [],
      searchTerm: "Acme",
    });
    const acme = sections.clientGroups.find((group) => group.clientName === "Acme");
    expect(acme?.searchExpandClient).toBe(true);
    expect(acme?.projects.map((entry) => entry.project.id).sort()).toEqual(["p1", "p3"]);
    expect(acme?.projects.every((entry) => entry.searchExpandProject === false)).toBe(true);
    expect(acme?.projects.every((entry) => entry.tasks.length === 0)).toBe(true);
  });

  test("project-only query keeps that project and does not auto-expand tasks", () => {
    const sections = buildAgencyTaskChooserSections({
      projects,
      tasks,
      favoriteProjectIds: [],
      favoriteTaskIds: [],
      searchTerm: "Website",
    });
    const acme = sections.clientGroups.find((group) => group.clientName === "Acme");
    expect(acme?.projects.map((entry) => entry.project.id)).toEqual(["p1"]);
    expect(acme?.projects[0]?.searchExpandProject).toBe(false);
    expect(acme?.projects[0]?.tasks).toEqual([]);
  });
});
```

For client-only / project-only: tasks are omitted from the filtered list so the row is a collapsed project (user expands to browse). Idle (no search) still shows all tasks in the group payload as today.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/features/time-tracking/agency-task-chooser-groups.test.ts`

Expected: FAIL (flags missing / old substring filter)

- [ ] **Step 3: Write minimal implementation**

Replace `filterQuery` / `projectSearchableText.includes` in `agency-task-chooser-groups.ts` with:

```typescript
import {
  chooserPathMatches,
  tokenizeChooserQuery,
} from "@/features/time-tracking/agency-task-chooser-search";

export type ChooserProjectGroup = {
  project: ChooserProject;
  tasks: ChooserTask[];
  isFavorite: boolean;
  searchExpandProject: boolean;
};

export type ChooserClientGroup = {
  clientName: string;
  projects: ChooserProjectGroup[];
  searchExpandClient: boolean;
};
```

Inside `buildAgencyTaskChooserSections`:

```typescript
  const tokens = tokenizeChooserQuery(input.searchTerm);
  const searching = tokens.length > 0;

  function tasksForProject(project: ChooserProject, projectTasks: ChooserTask[]) {
    if (!searching) return { tasks: projectTasks, searchExpandProject: false };
    const matchingTasks = projectTasks.filter((task) =>
      chooserPathMatches(
        { clientName: project.clientName, projectName: project.name, taskTitle: task.title },
        tokens,
      ),
    );
    const projectPathMatches = chooserPathMatches(
      { clientName: project.clientName, projectName: project.name },
      tokens,
    );
    if (!projectPathMatches && matchingTasks.length === 0) {
      return null;
    }
    return {
      tasks: matchingTasks,
      searchExpandProject: matchingTasks.length > 0,
    };
  }
```

When mapping favorites and client groups, skip `null`, set `searchExpandClient: searching && group.projects.length > 0`. Keep existing favorite-first ordering.

Idle path: `searchExpandProject: false`, `searchExpandClient: false`, `tasks: allTasks`.

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/time-tracking/agency-task-chooser-groups.test.ts`

Expected: PASS (update older tests that construct groups if they assert full task lists on `"Empty"` — empty project still matches project-only name).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/time-tracking/agency-task-chooser-groups.ts \
  apps/web/src/features/time-tracking/agency-task-chooser-groups.test.ts
git commit -m "$(cat <<'EOF'
feat: filter task chooser tree with nested client-project-task tokens

EOF
)"
```

---

### Task 3: Stop expand-all-on-search; keyboard can still reach collapsed projects

**Files:**

- Modify: `apps/web/src/features/time-tracking/hooks/use-agency-task-chooser.ts`
- Modify: `apps/web/src/features/time-tracking/agency-task-chooser-keyboard.ts`
- Modify: `apps/web/src/features/time-tracking/agency-task-chooser-keyboard.test.ts`

**Interfaces:**

- Consumes: `searchExpandClient` / `searchExpandProject` from Task 2
- Produces: `isClientExpandedForList` / `isProjectExpandedForList` use flags OR manual toggle; `includeProjects` true whenever a visible project is collapsed so Enter can expand it during search

- [ ] **Step 1: Write failing keyboard test**

If `agency-task-chooser-keyboard.test.ts` already covers `includeProjects: false`, add:

```typescript
test("search with collapsed projects still lists project rows when includeProjects is true", () => {
  const items = buildTaskChooserKeyboardItems({
    favorites: [],
    clientGroups: [
      {
        clientName: "Acme",
        searchExpandClient: true,
        projects: [
          {
            project: { id: "p1", name: "Website", clientName: "Acme" },
            tasks: [{ id: "t1", projectId: "p1", title: "Design", status: "open" }],
            isFavorite: false,
            searchExpandProject: false,
          },
        ],
      },
    ],
    isProjectExpanded: () => false,
    isClientExpanded: () => true,
    includeProjects: true,
  });
  expect(items.map((item) => item.kind)).toEqual(["project"]);
});
```

- [ ] **Step 2: Run test**

Run: `bun test apps/web/src/features/time-tracking/agency-task-chooser-keyboard.test.ts`

Expected: FAIL until types include the new flags (fix fixtures in existing tests with `searchExpandProject: false`, `searchExpandClient: false`).

- [ ] **Step 3: Hook expand + keyboard includeProjects**

In `use-agency-task-chooser.ts` replace:

```typescript
  const isProjectExpandedForList = (projectId: string) =>
    Boolean(searchTerm.trim()) || isProjectExpanded(projectId);
  const isClientExpandedForList = (clientName: string) =>
    Boolean(searchTerm.trim()) || isClientExpanded(clientName);
```

with lookups on the current `sections`:

```typescript
  const searchExpandProjectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of sections.favorites) {
      if (entry.searchExpandProject) ids.add(entry.project.id);
    }
    for (const group of sections.clientGroups) {
      for (const entry of group.projects) {
        if (entry.searchExpandProject) ids.add(entry.project.id);
      }
    }
    return ids;
  }, [sections]);

  const searchExpandClientNames = useMemo(() => {
    const names = new Set<string>();
    for (const group of sections.clientGroups) {
      if (group.searchExpandClient) names.add(group.clientName);
    }
    return names;
  }, [sections]);

  const isProjectExpandedForList = (projectId: string) =>
    searchExpandProjectIds.has(projectId) || isProjectExpanded(projectId);
  const isClientExpandedForList = (clientName: string) =>
    searchExpandClientNames.has(clientName) || isClientExpanded(clientName);

  const includeProjects =
    pickProject ||
    !searchTerm.trim() ||
    sections.favorites.some((entry) => !isProjectExpandedForList(entry.project.id)) ||
    sections.clientGroups.some((group) =>
      group.projects.some((entry) => !isProjectExpandedForList(entry.project.id)),
    );
```

Pass `includeProjects` into `buildTaskChooserKeyboardItems`. Keep Enter-on-project as toggle (existing). When a search expands a project because of a task hit, first keyboard target should remain the best task via existing `indexOfTaskChooserItem` / `bestMatchTaskId`.

Do **not** change idle client default (clients start expanded). Search-only flags overlay that.

- [ ] **Step 4: Run tests**

Run:

```bash
bun test apps/web/src/features/time-tracking/agency-task-chooser-keyboard.test.ts \
  apps/web/src/features/time-tracking/agency-task-chooser-groups.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/time-tracking/hooks/use-agency-task-chooser.ts \
  apps/web/src/features/time-tracking/agency-task-chooser-keyboard.ts \
  apps/web/src/features/time-tracking/agency-task-chooser-keyboard.test.ts
git commit -m "$(cat <<'EOF'
fix: auto-expand only matching task-chooser branches while searching

EOF
)"
```

---

### Task 4: Server list search matches nested tokens on task, project, and client

**Files:**

- Create: `packages/api/src/routers/agency-ops/tasks/task-list-search.ts`
- Create: `packages/api/src/routers/agency-ops/tasks/task-list-search.test.ts`
- Modify: `packages/api/src/routers/agency-ops/tasks/service.ts` (`list` / `listProjectTasks` search branch ~365)

**Interfaces:**

- Consumes: `input.search: string | undefined` (router schema unchanged)
- Produces: `tokenizeTaskListSearch(query: string): string[]` (same split as web); SQL fragment: every token matches `title OR project.name OR client.name` via existing joins if present, else add joins.

Inspect current `list` select: if it already joins `agencyOpsProject` / client, add AND of per-token `or(ilike(title), ilike(project.name), ilike(client.name))`. If it selects tasks only, join:

```typescript
.from(agencyOpsProjectTask)
.innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectTask.projectId))
.leftJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
```

Use the **same** `whereClause` for count and rows. Cap tokens at 8 to bound SQL.

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, test } from "bun:test";
import { tokenizeTaskListSearch } from "./task-list-search";

describe("tokenizeTaskListSearch", () => {
  test("mirrors chooser whitespace tokens", () => {
    expect(tokenizeTaskListSearch("Acme  Design")).toEqual(["acme", "design"]);
  });

  test("caps at 8 tokens", () => {
    expect(tokenizeTaskListSearch("a b c d e f g h i j")).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test packages/api/src/routers/agency-ops/tasks/task-list-search.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement helper + wire service**

```typescript
export function tokenizeTaskListSearch(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 8);
}
```

In `service.ts` replace the single `LIKE %searchTerm%` with a function `taskSearchSql(tokens: string[])` that returns `and(...tokens.map(token => or(ilike(title), ilike(project.name), ilike(client.name))))`. Empty tokens: no extra filter.

If Bruno coverage exists for `projectTasks.list?search=`, add a case `"Acme Design"` returning the Design task. If no Bruno file is cheap to extend, unit tokenize + a focused service test is enough (golden testing: one check that fails if AND/join regresses). Prefer a small SQL-builder test that snapshots the token count rather than hitting Postgres if the suite is unit-only.

- [ ] **Step 4: Run tests**

Run: `bun test packages/api/src/routers/agency-ops/tasks/task-list-search.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routers/agency-ops/tasks/task-list-search.ts \
  packages/api/src/routers/agency-ops/tasks/task-list-search.test.ts \
  packages/api/src/routers/agency-ops/tasks/service.ts
git commit -m "$(cat <<'EOF'
feat: match nested chooser queries on task, project, and client in list search

EOF
)"
```

---

### Task 5: Empty copy, golden inventory, verify

**Files:**

- Modify: `apps/web/src/features/time-tracking/choosers/agency-task-chooser-view.tsx` (empty label only)
- Maybe: `docs/golden-file-source-inventory.md` via `bun run check:golden`

**Interfaces:**

- Consumes: existing `emptyLabel`
- Produces: `"No matches"` stays; do not add “searched clients, projects, and tasks” (too noisy for Operate). Optional `searchPlaceholder` default in the hook: `"Search client, project, or task"` replacing `"Search projects or clients"` — one string, all chooser instances.

- [ ] **Step 1: Change search placeholder default in `use-agency-task-chooser.ts`**

```typescript
    searchPlaceholder = "Search client, project, or task",
```

Call sites that pass a custom placeholder keep theirs.

- [ ] **Step 2: Typecheck and conventions**

Run:

```bash
bun run check
bun run check-types
bun run check:conventions
bun run check:golden
```

Expected: PASS. If golden inventory complains about new files, add them per the script output (do not hand-edit unrelated inventory).

- [ ] **Step 3: Manual check (implementer)**

Open Tracker chooser:

1. Idle: clients expanded, projects collapsed (unchanged).
2. Type `Acme`: only Acme, projects collapsed.
3. Type `Acme Website`: only Website under Acme, tasks collapsed.
4. Type `Acme Website Design` or `Acme Design`: Website expanded, Design visible, Build hidden.
5. Type `Design`: every client/project that has that task title, those projects expanded.
6. Keyboard: Arrow through collapsed project then Enter expands; with a task hit, Enter on the task commits.
7. My Tasks rail + a time-entry row chooser: same filter (shared component).
8. `prefers-reduced-motion`: existing collapse variants still honor it.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/time-tracking/hooks/use-agency-task-chooser.ts \
  apps/web/src/features/time-tracking/choosers/agency-task-chooser-view.tsx \
  docs/golden-file-source-inventory.md
git commit -m "$(cat <<'EOF'
feat: clarify task chooser search placeholder for nested queries

EOF
)"
```

---

## Self-review

1. **Spec coverage:** Nested AND path, expand-hits-only, all chooser surfaces, server paging, keyboard, RTL tokenize, no `@` syntax, no fuzzy lib, prefer-existing-task unchanged.
2. **Placeholders:** None; SQL join must be confirmed against the live `list` query in Task 4 (if joins already exist, do not double-join).
3. **Types:** `searchExpandProject` / `searchExpandClient` named consistently from Task 2 onward.

## Out of scope (follow-ups)

- Clockify `task @project` parser
- Fuzzy / typo tolerance
- Highlighting token spans inside rows (optional polish; existing `highlightSearch` can stay as today)
