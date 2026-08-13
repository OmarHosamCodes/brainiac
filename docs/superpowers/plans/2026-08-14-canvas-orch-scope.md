# Canvas Orch Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sniper or `@` selection of a Canvas node becomes a Plan that drafts a real `workspaceBlock` / `workspaceNode` patch, and “this node is project X / task Y” becomes a HITL `agencyRef` stitch — never a silent board write.

**Architecture:** Add a compact `node.update` canvas action (title / visibility / `agencyRef`) so Orch does not have to `node.replace` the whole document. Reuse `propose_canvas_action`, `draft_canvas_plan`, `ui_present` (`workspaceBlock` / `workspaceNode`), and Confirm → Approve. Scoped `scopeNodes` already flow through `buildOrchTurnSendContext`; tighten instructions when a node chip is present.

**Tech Stack:** Bun, `@orch/workspace` schemas, `@orch/agent` canvas actions/tools, workspace-agent scope chips.

## Global Constraints

- Bun only. Golden layers. Views props-only.
- Browser: `@orch/agent/types`, never `@orch/agent` barrel.
- Canvas writes never apply in the model path. Plan = `draft_canvas_plan`. Agent = `propose_canvas_action` then `ui_present` then Approve.
- `agencyRef` is valid only on team-visible nodes; `agencyRef.teamId` must match `node.teamId`. Fail closed without `teamId`.
- If the workspace is scoped, patch the scoped `nodeId`. Do not `node.create` unless the user asks for a new node.
- After Approve, keep the existing open-on-board path (`boardHref` / `/node/:id`).
- No Prompt library. No Voice/MCP/quota/runner demos. No `/api/chat`.
- Tests: co-located `bun:test`. No component render tests.
- `bun run check`, `check-types`, `check:conventions`, `check:golden` before finish.

## File map

| File | Responsibility |
| ---- | -------------- |
| `packages/agent/src/canvas-actions.ts` | `node.update` Zod, label, board target, bind/stamp switches |
| `packages/agent/src/canvas-actions.test.ts` | Parse + apply tests |
| `packages/agent/src/tools.ts` | `applyCanvasAction` case `node.update` |
| `packages/agent/src/index.ts` | Scoped Plan/Agent instructions; agencyRef stitch |
| `packages/workspace/src/index.ts` | Optional helper `patchWorkspaceNodeAgencyRef` if apply needs it — prefer inline in `applyCanvasAction` |
| `apps/web/src/features/workspace-agent/workspace-agent-scope-plan.ts` | Seed Plan prompt when a node chip is added |
| `apps/web/src/features/workspace-agent/workspace-agent-scope-plan.test.ts` | Seed copy tests |
| `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts` | Optional Plan seed after sniper add (do not coerce Ask) |

---

### Task 1: `node.update` schema and labels

**Files:**
- Modify: `packages/agent/src/canvas-actions.ts`
- Modify: `packages/agent/src/canvas-actions.test.ts`

**Interfaces:**
- Consumes: existing `canvasActionSchema` discriminated union; `agencyRef` object already on `node.create`
- Produces: `node.update` with `nodeId` plus optional `title`, `visibility`, `teamId`, `agencyRef`

```typescript
z.object({
  type: z.literal("node.update"),
  nodeId: idSchema,
  title: z.string().trim().min(1).max(120).optional(),
  visibility: z.enum(["private", "team"]).optional(),
  teamId: idSchema.nullable().optional(),
  agencyRef: z
    .object({
      teamId: idSchema,
      projectId: idSchema.optional(),
      taskId: idSchema.optional(),
    })
    .nullable()
    .optional(),
}),
```

At least one of `title`, `visibility`, `teamId`, `agencyRef` must be present. Enforce with `.superRefine` on that object **or** a union-level refine on `canvasActionSchema` for this variant only:

```typescript
.superRefine((value, ctx) => {
  if (
    value.title === undefined &&
    value.visibility === undefined &&
    value.teamId === undefined &&
    value.agencyRef === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "node.update requires a field to change.",
    });
  }
})
```

`canvasActionLabel`:

```typescript
case "node.update":
  return value.agencyRef
    ? "Update node Agency link"
    : "Update node";
```

Use `action.agencyRef !== undefined` for the Agency-link label (including explicit `null` to clear).

`canvasActionBoardTarget`: same as `node.replace` (`{ nodeId }`).

`bindCanvasPlanStepAction`: `node.update` returns the action unchanged (or remaps `nodeId` if `lastCreated` exists and the planned id was a placeholder — **do not** remap if `action.nodeId` already exists on the board). Simplest: `case "node.update": return action;`

Update every exhaustive `switch` on `CanvasAction` in this file (`bindCanvasPlanStepAction`, `stampCanvasCreateIds` can ignore it, `readLastCreatedCanvasTarget` ignore, `canvasActionLabel`, `canvasActionBoardTarget`).

- [ ] **Step 1: Write failing tests**

```typescript
test("parses node.update with agencyRef", () => {
  const action = canvasActionSchema.parse({
    type: "node.update",
    nodeId: "node-1",
    agencyRef: { teamId: "team-1", projectId: "proj-1" },
  });
  expect(canvasActionLabel(action)).toBe("Update node Agency link");
});

test("rejects empty node.update", () => {
  expect(() =>
    canvasActionSchema.parse({
      type: "node.update",
      nodeId: "node-1",
    }),
  ).toThrow();
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test packages/agent/src/canvas-actions.test.ts`
Expected: FAIL unknown type / not implemented

- [ ] **Step 3: Add the variant and switch cases**

Insert `node.update` in `canvasActionSchema` immediately after `node.replace`.

Fix TypeScript `never` errors in this file before moving on.

- [ ] **Step 4: Run tests**

Run: `bun test packages/agent/src/canvas-actions.test.ts`
Expected: schema tests PASS. Then immediately implement Task 2 in the same sitting so `applyCanvasAction`'s exhaustive switch compiles.

- [ ] **Step 5: Commit** (same commit as Task 2)

```bash
git add packages/agent/src/canvas-actions.ts packages/agent/src/canvas-actions.test.ts
git commit -m "$(cat <<'EOF'
feat: add canvas node.update action schema

Orch can patch agencyRef without replacing the whole node document.
EOF
)"
```

---

### Task 2: Apply `node.update`

**Files:**
- Modify: `packages/agent/src/tools.ts` (`applyCanvasAction` switch)
- Modify: `packages/agent/src/canvas-actions.test.ts` (apply tests)
- Grep `switch (action.type)` / `CanvasAction` in `packages/agent` and `packages/api/src/routers/agent/agency-proposals.ts` for canvas execute — add the case wherever `never` breaks

**Interfaces:**
- Consumes: `workspaceNodeSchema` validation after patch
- Produces: mutated node in `nextNodes`; `before`/`after` snapshots

Locked apply rules:

1. `requireNode(draft, action.nodeId)`
2. If `title` set, assign trimmed title
3. If `visibility` / `teamId` set, assign them
4. If `agencyRef` is `null`, set `node.agencyRef = null`
5. If `agencyRef` is an object, set it
6. `node.updatedAt = timestamp`
7. Re-parse with `workspaceNodeSchema.parse(node)` so private+agencyRef fails closed
8. If parse fails, throw — proposal execute already surfaces failure status

- [ ] **Step 1: Write failing apply test**

In `canvas-actions.test.ts` (already imports `applyCanvasAction` and `createWorkspaceNode`):

```typescript
test("updates agencyRef on a team-shared node", async () => {
  const created = await applyCanvasAction([], {
    type: "node.create",
    title: "Launch",
    visibility: "team",
    teamId: "team-1",
  });
  const nodeId = created.nextNodes[0]?.id;
  expect(nodeId).toBeTruthy();
  const updated = await applyCanvasAction(created.nextNodes, {
    type: "node.update",
    nodeId,
    agencyRef: { teamId: "team-1", projectId: "proj-1", taskId: "task-1" },
  });
  expect(updated.nextNodes[0]?.agencyRef).toEqual({
    teamId: "team-1",
    projectId: "proj-1",
    taskId: "task-1",
  });
});

test("rejects agencyRef on a private node", async () => {
  const created = await applyCanvasAction([], {
    type: "node.create",
    title: "Private",
  });
  const nodeId = created.nextNodes[0]?.id ?? "";
  await expect(
    applyCanvasAction(created.nextNodes, {
      type: "node.update",
      nodeId,
      agencyRef: { teamId: "team-1", projectId: "proj-1" },
    }),
  ).rejects.toThrow();
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test packages/agent/src/canvas-actions.test.ts`
Expected: FAIL unimplemented `node.update` (or exhaustive never at compile — implement the case)

- [ ] **Step 3: Implement apply case**

In `packages/agent/src/tools.ts` inside `applyCanvasAction`:

```typescript
case "node.update": {
  const node = requireNode(draft, action.nodeId);
  if (action.title !== undefined) node.title = action.title;
  if (action.visibility !== undefined) node.visibility = action.visibility;
  if (action.teamId !== undefined) node.teamId = action.teamId;
  if (action.agencyRef !== undefined) node.agencyRef = action.agencyRef;
  node.updatedAt = timestamp;
  workspaceNodeSchema.parse(node);
  return { nodeId: node.id };
}
```

If `node` is a frozen/plain object copy from `createWorkspaceNode`, mutate the draft entry the same way other cases do (`requireNode` already returns the draft object).

Also update `snapshotCanvasTarget` if it switches on type — `node.update` snapshots the node like `node.replace`.

- [ ] **Step 4: Run tests**

Run: `bun test packages/agent/src/canvas-actions.test.ts`
Run: `bun test packages/agent/src/tools.test.ts` if it exists and covers apply
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools.ts packages/agent/src/canvas-actions.ts packages/agent/src/canvas-actions.test.ts
git commit -m "$(cat <<'EOF'
feat: apply canvas node.update including agencyRef

Team-shared nodes can stitch project/task links; private nodes still fail closed.
EOF
)"
```

---

### Task 3: Instructions for scoped node Plan and agencyRef stitch

**Files:**
- Modify: `packages/agent/src/index.ts` (`buildCanvasPlanInstructions`, `buildCanvasAgentModeInstructions`, merged Agency+Canvas instructions)
- Create: `packages/agent/src/canvas-scope-instructions.test.ts` if instructions are extracted; otherwise assert via a tiny exported helper

**Interfaces:**
- Consumes: `workspace.scopeRefs` / `scopeNodes`
- Produces: `buildCanvasScopedPatchNote(workspace)` string

- [ ] **Step 1: Write failing helper test**

```typescript
import { describe, expect, test } from "bun:test";

import { buildCanvasScopedPatchNote } from "./canvas-scope-instructions";

describe("buildCanvasScopedPatchNote", () => {
  test("tells the model to patch the scoped node", () => {
    const note = buildCanvasScopedPatchNote({
      scopeNodes: [{ id: "node-1", title: "Launch" }],
    });
    expect(note).toContain("node-1");
    expect(note).toContain("Launch");
    expect(note).toContain("node.update");
    expect(note.toLowerCase()).not.toContain("create_node");
  });

  test("is empty when nothing is scoped", () => {
    expect(buildCanvasScopedPatchNote({ scopeNodes: [] })).toBe("");
  });
});
```

Do not assert `not.toContain("create_node")` if the note never mentions it — instead:

```typescript
expect(note).toContain("Do not propose node.create");
```

- [ ] **Step 2: Run to fail**

Run: `bun test packages/agent/src/canvas-scope-instructions.test.ts`

- [ ] **Step 3: Implement helper and splice into instructions**

`packages/agent/src/canvas-scope-instructions.ts`:

```typescript
export function buildCanvasScopedPatchNote(input: {
  scopeNodes: Array<{ id: string; title: string }>;
}) {
  const node = input.scopeNodes[0];
  if (!node) return "";
  return [
    `Scoped node: ${node.id} (“${node.title}”).`,
    "Draft or propose patches against this nodeId (block.patch / node.update).",
    "Do not propose node.create unless the user explicitly asks for a new node.",
    "After propose_canvas_action, ui_present kind workspaceBlock or workspaceNode, then ask for Approve.",
    "To link Agency: node.update agencyRef { teamId, projectId?, taskId? } on a team-visible node. Never invent ids.",
  ].join(" ");
}
```

Append to `buildCanvasPlanInstructions` and `buildCanvasAgentModeInstructions`:

```typescript
buildCanvasScopedPatchNote({
  scopeNodes: (workspace.scopeNodes ?? []).map((node) => ({ id: node.id, title: node.title })),
}),
```

Skip empty string.

Also add to merged dual-surface instructions (search `Writes stay on the proposal bus` in `packages/agent/src/index.ts`).

- [ ] **Step 4: Run tests**

Run: `bun test packages/agent/src/canvas-scope-instructions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/canvas-scope-instructions.ts packages/agent/src/canvas-scope-instructions.test.ts packages/agent/src/index.ts
git commit -m "$(cat <<'EOF'
feat: steer scoped Canvas turns toward node.update patches

Sniper-selected nodes get a real previewed plan instead of a new node.
EOF
)"
```

---

### Task 4: Sniper / `@` node chip → Plan seed (do not coerce Ask)

**Files:**
- Create: `apps/web/src/features/workspace-agent/workspace-agent-scope-plan.ts`
- Create: `apps/web/src/features/workspace-agent/workspace-agent-scope-plan.test.ts`
- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts` (`addMentionedNode` and sniper `addScopeChip` path)

**Interfaces:**
- Consumes: added `AgentScopeRef` with `kind: "node"`
- Produces: optional composer seed when current preset is **Plan** (leave Ask and Agent alone)

Locked: **Do not coerce Canvas Plan to Ask. Do not coerce Ask to Plan.** If the user is already in Plan, inserting a node chip may fill an empty draft with a helper sentence. If they are in Ask or Agent, only the chip is added.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, test } from "bun:test";

import { nodeChipPlanSeed } from "./workspace-agent-scope-plan";

describe("nodeChipPlanSeed", () => {
  test("seeds only Plan with an empty draft", () => {
    expect(
      nodeChipPlanSeed({
        toolPreset: "plan",
        draft: "",
        chip: { kind: "node", id: "node-1", label: "Launch" },
      }),
    ).toContain("Launch");
    expect(
      nodeChipPlanSeed({
        toolPreset: "ask",
        draft: "",
        chip: { kind: "node", id: "node-1", label: "Launch" },
      }),
    ).toBeNull();
    expect(
      nodeChipPlanSeed({
        toolPreset: "plan",
        draft: "already typing",
        chip: { kind: "node", id: "node-1", label: "Launch" },
      }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-scope-plan.test.ts`

- [ ] **Step 3: Implement**

```typescript
import type { AgentScopeRef, DashboardAgentToolPreset } from "@orch/agent/types";

export function nodeChipPlanSeed(input: {
  toolPreset: DashboardAgentToolPreset;
  draft: string;
  chip: AgentScopeRef;
}): string | null {
  if (input.toolPreset !== "plan") return null;
  if (input.chip.kind !== "node") return null;
  if (input.draft.trim().length > 0) return null;
  return `Draft a plan to patch “${input.chip.label}” (${input.chip.id}). Use draft_canvas_plan plus ui_present workspaceBlock or workspaceNode. Do not create a new node.`;
}
```

In `addMentionedNode` and after sniper `addScopeChip` (the store call is inside `use-agent-scope-mode-listener.ts` — do **not** put seed logic in that listener if it would import the tool preset). Preferred: wrap `addScopeChip` in the workspace-agent hook:

```typescript
const addScopeChipAndMaybeSeed = (chip: AgentScopeRef) => {
  addScopeChip(chip);
  const seed = nodeChipPlanSeed({ toolPreset: selectedToolPreset, draft, chip });
  if (seed) setDraft(seed);
};
```

Pass `addScopeChipAndMaybeSeed` into the scope listener **or** subscribe in `use-workspace-agent` to `scopeChips` length increases. ponytail: wrapping in the hook is enough if sniper uses a callback. Today `useAgentScopeModeListener` calls the store directly. Smallest fix: change the listener to accept `onPickChip: (chip: AgentScopeRef) => void` from the hook, defaulting to store `addScopeChip`. The hook supplies `addScopeChipAndMaybeSeed`.

Do not auto-switch tool preset.

- [ ] **Step 4: Run tests + types**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-scope-plan.test.ts`
Then: `bun run check-types`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/workspace-agent-scope-plan.ts apps/web/src/features/workspace-agent/workspace-agent-scope-plan.test.ts apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts apps/web/src/features/workspace-agent/hooks/use-agent-scope-mode-listener.ts
git commit -m "$(cat <<'EOF'
feat: seed a Canvas Plan when a node is scoped

Sniper and @ add a chip; Plan with an empty composer gets a patch prompt, Ask stays Ask.
EOF
)"
```

---

### Task 5: Verify the slice

- [ ] **Step 1: Tests**

```bash
bun test packages/agent/src/canvas-actions.test.ts
bun test packages/agent/src/canvas-scope-instructions.test.ts
bun test apps/web/src/features/workspace-agent/workspace-agent-scope-plan.test.ts
```

Expected: PASS

- [ ] **Step 2: Repo checks**

```bash
bun run check
bun run check-types
bun run check:conventions
bun run check:golden
```

- [ ] **Step 3: Manual smoke**

1. Canvas Plan, sniper a node, empty composer fills with patch prompt; Confirm → proposals; Approve; Open on board.
2. Ask + sniper: chip only, mode stays Ask.
3. Agent: “this node is project X” → `list_agency_projects` (after Agency unlock via chip or `/agency`) → `propose_canvas_action` `node.update` agencyRef → `ui_present` workspaceNode → Approve. Private node fails closed.

---

## Out of scope

- Prompt library
- Composer queue/drafts (`2026-08-14-orch-composer-reliability.md`) — `@` node insert is specified there; this plan still works with sniper-only if that plan is later
- Agency gap-fill / Money / waste (`2026-08-14-agency-orch-ops.md`)
