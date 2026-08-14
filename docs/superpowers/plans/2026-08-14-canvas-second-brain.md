---
name: Canvas Second Brain
overview: Make Canvas a second brain — a team-scoped knowledge graph with live Agency projections (projects, tasks, members, clients, time) plus private notes. Spatial board stays a view; Orch operates through Approve/Reject. Agency remains source of truth for those records.
todos:
  - id: knowledge-schemas
    content: Add knowledge Zod types + node↔object projectors with round-trip tests
    status: pending
  - id: drizzle-tables
    content: Add workspace_object/relation/placement/revision tables and db:push
    status: pending
  - id: dual-write
    content: Dual-write saveWorkspaceNodes into the knowledge graph
    status: pending
  - id: query-api
    content: Add knowledge.query/get + idempotent backfill operation
    status: pending
  - id: agency-projections
    content: Live Agency projections + about-links; agencyRef becomes derived
    status: pending
  - id: orch-tools
    content: Add query/get/draft/propose knowledge tools on the canvas proposal bus
    status: pending
  - id: capture-loop
    content: Prove capture → Approve → revision → canvas card for note/decision
    status: pending
  - id: verify
    content: Run check/check-types/conventions/golden and regression on existing canvas saves
    status: pending
isProject: false
---

# Canvas Second Brain Knowledge Kernel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Canvas becomes a team second brain — typed objects and relations over the Agency team (projects, tasks, members, clients, time) plus private notes — operated by Orch through Approve/Reject, not a bag of nodes and blocks.

**Architecture:** `workspace_object` is the canvas-native graph (private or team-scoped). Agency records are **live projections** (not copied rows) addressable in the same query/relation model. `agencyRef` on nodes becomes a **derived** convenience from `about` relations. The React Flow board and `/node/:id` remain projections. Writes to Agency still use `propose_agency_action`; knowledge actions may **link**, never mutate Agency tables.

**Tech Stack:** Bun, Drizzle/Postgres, `@orch/workspace` Zod, `@orch/agent` tools + proposal bus, React Flow canvas, golden-file layers.

This is **Plan 1 of 3**. Do not rebuild the 40 block editors or invent a new spatial product in this plan.

- **Plan 2 (follow-on):** Object-first UX — backlinks rail (including Agency entities), query/table view, pin Agency entities onto the board, capture inbox, `/object/:id` if the synthesized node page is not enough.
- **Plan 3 (follow-on):** Promote more block types (assumption, OKR, source) to first-class objects + read-only decision/analytics lenses on the same board.

Research backing: executive summary from Parallel deep research (pro-fast). Full metadata: [ai-first-second-brain-canvas.json](ai-first-second-brain-canvas.json). Ask if you want the report walked through.

## Global Constraints

- Bun only. Golden layers. Views props-only. No layer skips.
- Browser: `@orch/agent/types` or `@orch/agent/model-routing`, never `@orch/agent` barrel.
- Canvas/knowledge writes never apply in the model path. Plan = `draft_canvas_plan` / `draft_knowledge_plan`. Agent = `propose_*` then `ui_present` then Approve.
- Keep React Flow, `/canvas`, `/node/:id`, block registry, marketplace. Team-visible documents still require matching `teamId`. `agencyRef` is **derived** from `about` relations for existing node UI / deep links (`workspace-agency-links.ts`); relations are source of truth.
- Dual-write until the object graph is proven; do not drop `dashboard_workspace.nodes` in this plan.
- Capture stays low-friction (note first). Typing/relations are **proposed**, not form-gated.
- Prefixed IDs via `createWorkspaceId(...)`. Tests: co-located `bun:test`. No component render tests.
- `bun run check`, `check-types`, `check:conventions`, `check:golden` before finish.
- After implementation, copy this plan to `docs/superpowers/plans/2026-08-14-canvas-second-brain.md`. Move the research JSON out of the repo root (do not commit it as a product file).
- Do **not** golden-split `apps/web/src/features/workspace/` in this plan (it is still pages + hooks + Zustand, unlike `workspace-agent`). New API/agent code follows golden layers; leave block editors and canvas page as they are.
- Do **not** revive `directMutations` / `patch_block` live tools. Do **not** rename `list_dashboard_nodes` / `search_dashboard` in this plan.
- Live `/canvas` is infinite React Flow (`LazyInfiniteCanvas`). AGENTS.md still mentions MagicBento — that is stale. Do not rebuild a bento grid.
- Canvas finance/strategy blocks stay local document widgets. Money (bills/invoices) stays Agency-only — not in the knowledge graph this plan.
- Agency remains SoT for `agency_ops_project`, `agency_ops_project_task`, `workspace_team_member` / user, `agency_ops_client`, `agency_ops_time_entry`. Knowledge **never** inserts/updates/deletes those rows. Time is **read-only links**.
- Team-scoped objects and every Agency projection require `requireTeamMembership(actorUserId, teamId, "viewer"|"editor")` in the service. Fail closed without `teamId`.
- `query_knowledge` / relations that target Agency must use the **active team** (`teamId` on the turn). Never invent Agency ids — resolve via existing list/get services.

## Why the current canvas cannot be a second brain

Today the entire board is one JSONB array:

```85:95:packages/db/src/schema/workspace.ts
export const dashboardWorkspace = pgTable("dashboard_workspace", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  nodes: jsonb("nodes").$type<WorkspaceNodeRecord[]>().notNull(),
  // ...
});
```

`[workspaceNodeSchema](packages/workspace/src/schemas.ts)` mixes identity, layout (`x/y/width/height`), untyped `connections: { targetNodeId }[]`, and a nested tab/block AST. `[saveWorkspaceNodes](packages/api/src/routers/workspace/service.ts)` replaces the whole snapshot. Orch can only `list_dashboard_nodes` / `search_dashboard` (scan that blob) and `propose_canvas_action` (node/tab/block CRUD). Hard cap: `WORKSPACE_NODE_LIMIT = 200`.

Industry pattern (Tana/Anytype/Heptabase/Cursor): **typed objects + relations + history are canonical; canvas is a view; agent edits are diffs behind HITL.**

```mermaid
flowchart LR
  capture[Capture note or chat]
  orch[Orch propose_knowledge_action]
  bus[Proposal bus Approve]
  graph[workspace_object plus relation]
  agency[Agency tables live]
  views[Projections]
  canvas[React Flow board]
  page[Node page blocks]
  query[query_knowledge]
  capture --> orch --> bus --> graph
  graph -->|"about is supports"| agency
  agency -->|"read-through"| query
  graph --> views
  views --> canvas
  views --> page
  graph --> query
```

## What we keep vs change

**Keep:** infinite canvas, node cards, `/node/:id` block editors, Ask/Plan/Agent, `ui_present` `workspaceBlock`/`workspaceNode`, `agencyRef`, marketplace, existing `canvasActionSchema` for document AST edits.

**Change:** source of truth, team-scoped graph, live Agency projections in the same query model, typed relations (including `about` a project/task/member/client/timeEntry), revisions, first-class `note` / `decision` / `person` / `source` besides `document`. `agencyRef` derived from relations.

**Do not in this plan:** rewrite block editors, golden-split the workspace feature, new MagicBento chrome, liquid glass, DESIGN.md regen, analytics dashboard, dropping the JSON snapshot, extracting SWOT/OKR cells into rows, copying Agency rows into `workspace_object`, mutating Agency from knowledge actions, pinning Agency entities as their own canvas cards, Money/bills in the graph.

## Codebase constraints (from architecture pass)

These are easy to get wrong:

- **Owner blob, not a team board.** Team-visible nodes live in the **owner’s** `dashboard_workspace` row. `getWorkspaceSnapshot` unions the actor’s nodes with teammates’ `visibility === "team"` nodes. Dual-write must upsert objects as `ownerUserId = node.ownerUserId`. An editor saving a shared node updates the **owner’s** objects, same as today’s blob write-back. Never delete objects missing from the actor’s owned snapshot — those may be teammates’ cards on the merged board.
- **React Flow edges ≠ knowledge relations.** `connections[]` is legal only on `nodeType: "orchestrator"` (orchestrator → standard). Same-type nodes cannot connect on the board. Orch has **no connection tools** today. Knowledge `related` / `about` / `supports` are a general graph. Projector rule: migrate orchestrator `connections` → `related`; on the way back, put `connections[]` **only** on orchestrator `document` objects. `about` / `supports` / `mentions` do **not** become board edges in this plan (backlinks are Plan 2).
- **Approve still goes blob → client store.** `executeCanvasAction` is `applyCanvasAction` (in-memory) then `saveWorkspaceNodes`. Knowledge execute must persist graph rows, append a revision, **then project into that same blob** so `applyBoundWorkspaceSnapshot` refreshes Zustand. The client debounce-saves the full `nodes` array (~250ms); a knowledge card that exists only in SQL would be invisible until the next snapshot and could be dropped on the next human drag-save.
- **Default node is still a Notes document.** Title-only `node.create` stays a `document` object (one Overview tab + notes block). First-class `note` / `decision` are created only via `propose_knowledge_action`, not by every new board card.
- **No separate team-board product.** Spatial layout stays user-scoped (`workspace_placement.ownerUserId`). Shared **content** is team-scoped objects + Agency projections. Teammates see the same decisions/notes; they do not share one forced layout in this plan.
- **Tombstones.** If a linked project/task is deleted, keep the relation; `get_knowledge_object` returns `{ missing: true }` (same spirit as today’s agencyRef tombstone test).

## File map

- Create: `[packages/workspace/src/knowledge.ts](packages/workspace/src/knowledge.ts)` — Zod types, projectors (`objectToWorkspaceNode`, `workspaceNodeToObject`), query helpers
- Create: `[packages/workspace/src/knowledge.test.ts](packages/workspace/src/knowledge.test.ts)`
- Create: `[packages/db/src/schema/workspace-knowledge.ts](packages/db/src/schema/workspace-knowledge.ts)` — four tables
- Modify: `[packages/db/src/schema/index.ts](packages/db/src/schema/index.ts)` — export
- Create: `[packages/api/src/routers/workspace/knowledge-service.ts](packages/api/src/routers/workspace/knowledge-service.ts)` — query, dual-write, backfill, apply
- Create: `[packages/api/src/routers/workspace/knowledge-service.test.ts](packages/api/src/routers/workspace/knowledge-service.test.ts)`
- Modify: `[packages/api/src/routers/workspace/service.ts](packages/api/src/routers/workspace/service.ts)` — after successful `saveWorkspaceNodes`, dual-write objects/placements/relations
- Modify: `[packages/api/src/routers/workspace/router.ts](packages/api/src/routers/workspace/router.ts)` + `[schemas.ts](packages/api/src/routers/workspace/schemas.ts)` — `knowledge.query` / `knowledge.get` read endpoints
- Create: `[packages/agent/src/knowledge-actions.ts](packages/agent/src/knowledge-actions.ts)` + tests
- Modify: `[packages/agent/src/tool-catalog.ts](packages/agent/src/tool-catalog.ts)`, `[packages/agent/src/tools.ts](packages/agent/src/tools.ts)`, `[packages/agent/src/index.ts](packages/agent/src/index.ts)`
- Modify: `[packages/api/src/routers/agent/agency-proposals.ts](packages/api/src/routers/agent/agency-proposals.ts)` — execute knowledge actions on Approve
- Create: `[packages/api/src/routers/workspace/knowledge-agency.ts](packages/api/src/routers/workspace/knowledge-agency.ts)` — map Agency records → `KnowledgeObjectView` via existing agency-ops services (no duplicated SQL)
- Modify: `[apps/web/src/features/workspace/workspace-agency-links.ts](apps/web/src/features/workspace/workspace-agency-links.ts)` — resolve hrefs from derived agencyRef **or** `about` relations; keep existing URL helpers
- Modify canvas card only if needed: `[apps/web/src/features/workspace/workspace-node-card.tsx](apps/web/src/features/workspace/workspace-node-card.tsx)` — type badge for non-document objects (optional, small)

---

### Task 1: Knowledge schemas and projectors

**Files:** Create `packages/workspace/src/knowledge.ts` + test. Export from `[packages/workspace/src/index.ts](packages/workspace/src/index.ts)`.

**Produces:** types later tasks import.

Object types (MVP, closed union):

```typescript
export const knowledgeObjectTypeSchema = z.enum([
  "document",
  "note",
  "decision",
  "person",
  "source",
  "agency.project",
  "agency.task",
  "agency.member",
  "agency.client",
  "agency.timeEntry",
]);

export const knowledgeRelationTypeSchema = z.enum([
  "related",
  "about", // canvas object about an Agency entity or another object
  "supports",
  "blocks",
  "mentions",
  "is", // person → agency.member identity stitch
]);

export const knowledgeTargetSchema = z.object({
  objectType: knowledgeObjectTypeSchema,
  id: z.string().min(1),
});
```

Canvas-native types are stored in `workspace_object`. `agency.*` types are **virtual** — `id` is the real Agency primary key (`agency_ops_project.id`, etc.). Never insert Agency rows into `workspace_object`.

`workspace_object.teamId` is required when `visibility === "team"`. Private notes: `visibility: "private"`, `teamId: null`.

`decision.properties` (minimal, maps today's decision block):

```typescript
{
  status: "open" | "decided" | "deferred";
  recommendation: string;
  decidedAt: string | null;
}
```

`agencyRefFromRelations(objectId, relations)`: if the object has `about` → `agency.project` (and optional `agency.task` on the same project), emit `{ teamId, projectId, taskId? }` for the existing node schema and `[workspace-agency-links.ts](apps/web/src/features/workspace/workspace-agency-links.ts)`. Inverse on dual-write: existing `node.agencyRef` becomes `about` relations (Task 3).

Projectors:

- `workspaceNodeToKnowledge(node) -> { object, placement, relations }`
- `knowledgeToWorkspaceNode(object, placement, relations) -> WorkspaceNode` so `/canvas` and `/node/:id` keep working
- Round-trip: orchestrator `connections` survive; a `related` edge on a standard/note/decision object does **not** appear as a React Flow `connections[]` entry
- Non-document objects synthesize a one-tab node: `note` → notes block; `decision` → decision block; `person`/`source` → notes block. **ponytail:** no new `/object/:id` route in this plan.

- [ ] **Step 1:** Write failing tests for round-trip `WorkspaceNode` → knowledge → `WorkspaceNode` (layout and orchestrator connections survive; team `agencyRef` becomes `about` project/task and projects back onto the node; `about` does not leak onto `connections[]`).
- [ ] **Step 2:** Implement schemas + projectors. IDs: `createWorkspaceId("kobj")`, `"krel"`, `"kplc"`, `"krev"`.
- [ ] **Step 3:** Run `bun test packages/workspace/src/knowledge.test.ts`. Commit: `feat: add canvas knowledge object projectors`.

---

### Task 2: Drizzle tables

**Files:** Create `[packages/db/src/schema/workspace-knowledge.ts](packages/db/src/schema/workspace-knowledge.ts)`. Export from index.

Tables (prefixed, team indexes):

- `workspace_object` — `id`, `ownerUserId`, `objectType` (canvas-native only), `title`, `visibility`, `teamId`, `properties jsonb`, `content jsonb`, timestamps. Indexes: `(ownerUserId, updatedAt)`, `(teamId, objectType)`, `(objectType)`. **No `agencyRef` column** — links live in relations.
- `workspace_relation` — `id`, `fromObjectId`, `fromObjectType` (canvas-native), `toObjectType` (any knowledge type including `agency.*`), `toObjectId`, `relationType`, `ownerUserId`, `teamId` nullable, `properties jsonb`, timestamps. Unique `(fromObjectId, toObjectType, toObjectId, relationType)`. Indexes: `fromObjectId`, `(toObjectType, toObjectId)`, `(teamId, relationType)`.
- `workspace_placement` — `id`, `objectId` (canvas-native only this plan), `viewId` (default `"board"`), `x/y/width/height`, `ownerUserId`, timestamps. Unique `(objectId, viewId, ownerUserId)` so layouts stay personal.
- `workspace_revision` — `id`, `objectId`, `actorUserId`, `proposalId` nullable, `before jsonb`, `after jsonb`, `createdAt`. Index `(objectId, createdAt)`.

Same visibility rules as nodes (team objects require `teamId` + membership). Agency links are relations, not a column.

- [ ] **Step 1:** Add schema file + export.
- [ ] **Step 2:** `bun run db:push` locally. Commit: `feat: add workspace knowledge tables`.

---

### Task 3: Dual-write from existing snapshot save

**Files:** `[knowledge-service.ts](packages/api/src/routers/workspace/knowledge-service.ts)`, hook from `[saveWorkspaceNodes](packages/api/src/routers/workspace/service.ts)`.

After a successful persist (owned nodes **and** editor write-back of shared nodes into the owner’s row):

1. Upsert one `document` object per persisted node (stable id = existing `node.id`, `ownerUserId` = node owner).
2. Upsert `workspace_placement` from `x/y/width/height` (`viewId: "board"`).
3. Replace that node’s **outbound** `related` edges from orchestrator `connections` only. Do not invent reverse edges on the target.
4. If `node.agencyRef` is set, upsert `about` relations to `agency.project` / `agency.task` (require `teamId` match). Do not store agencyRef on the object row.
5. Do **not** delete objects the snapshot omitted unless `deleteWorkspaceNode` ran (avoid wiping teammates’ objects and unplaced knowledge notes).
6. Hook `deleteWorkspaceNode` to delete the matching object + placements + relations (keep revisions).

`getWorkspaceSnapshot` stays blob-first in this plan. Dual-write is write-behind.

- [ ] **Step 1:** Test: save two connected nodes (orchestrator → standard) → two objects, two placements, one outbound `related` row; team node with `agencyRef` → `about` project/task relations; editor save of a shared node upserts the **owner’s** object; unplaced `note` is not deleted by a board save.
- [ ] **Step 2:** Implement `syncKnowledgeFromNodes(actorUserId, persistedNodes)` and call it at the end of `saveWorkspaceNodes` for both owned and owner-writeback sets (same transaction if practical).
- [ ] **Step 3:** `bun test packages/api/src/routers/workspace/knowledge-service.test.ts`. Commit: `feat: dual-write canvas nodes into knowledge graph`.

---

### Task 4: Backfill + query API

**Files:** `[apps/server/src/operations/backfill-workspace-knowledge.ts](apps/server/src/operations/backfill-workspace-knowledge.ts)`; router `knowledge.query` / `knowledge.get`.

Query input (service `(actorUserId, input)` + `requireTeamMembership` for team-visible):

```typescript
{
  teamId?: string;         // required to include Agency projections or team objects
  objectType?: KnowledgeObjectType;
  query?: string;
  about?: { objectType: KnowledgeObjectType; id: string }; // "notes about this project"
  limit?: number;          // default 20, max 50
  includePlaced?: boolean;
  includeAgency?: boolean; // default true when teamId present
}
```

When `teamId` is set: `requireTeamMembership`. Canvas-native query is SQL. Do not hit Agency tables in this task — that is Task 5. `about` filter on canvas objects works via `workspace_relation` even before live projections.

Output: `KnowledgeObjectView[]` (`origin: "canvas" | "agency"`, type, id, title, teamId, placement?, relationCounts). `get` for canvas ids returns object + relations + latest 5 revisions. `get` for `agency.*` in this task returns not-found until Task 5.

Backfill: walk `dashboard_workspace`, call the same sync helper. Idempotent.

- [ ] **Step 1:** Tests for query by type, text, and team visibility (outsider cannot see private).
- [ ] **Step 2:** Implement query/get + backfill script. Wire `workspace.knowledge.query` / `.get` on the existing workspace router (thin handlers).
- [ ] **Step 3:** Run backfill locally against a workspace with nodes. Commit: `feat: query canvas knowledge objects`.

Lift the **knowledge** object count independently of `WORKSPACE_NODE_LIMIT`. Board placement density can stay 200 for this plan (document cards); notes/decisions may share that board cap via placements. Document in a comment: Plan 2 lifts the board cap with clustering.

---

### Task 5: Live Agency projections

**Files:** Create `[packages/api/src/routers/workspace/knowledge-agency.ts](packages/api/src/routers/workspace/knowledge-agency.ts)` + tests. Extend `knowledge-service.ts` query/get. Reuse existing agency-ops list/get services — do not re-query Drizzle for those tables from a new SQL copy.

`KnowledgeObjectView` for Agency (read-through, titles live):

- `agency.project` ← `agencyOpsProject` (`id`, `name`, `clientId`, `teamId`, skip `deletedAt`)
- `agency.task` ← `agencyOpsProjectTask` (`id`, `title`, `status`, `projectId`, `teamId`)
- `agency.client` ← `agencyOpsClient` (`id`, `name`, `category`, skip archived)
- `agency.member` ← `workspaceTeamMember` + user display name (`id` = `userId`, `teamId`)
- `agency.timeEntry` ← `agencyOpsTimeEntry` (`id`, `description`, `startedAt`, `durationSeconds`, `projectId`, `taskId`, `userId`, `isWaste`; skip `deletedAt`)

`href` on the view uses existing helpers in `[workspace-agency-links.ts](apps/web/src/features/workspace/workspace-agency-links.ts)` (project/task). Member → `/agency/members/:userId`. Time entry → Tracker with `focus` if a helper exists; otherwise omit href rather than invent a URL.

`query_knowledge` with `teamId` + `includeAgency` (default true):

- `objectType: "agency.project"` etc. lists live Agency rows (membership required)
- no `objectType`: canvas-native matches **plus** Agency title matches (cap still 50 total; prefer exact Agency name hits)
- `about: { objectType: "agency.project", id }`: canvas objects with that relation, and do **not** require the project to be copied

`get_knowledge_object({ objectType, id, teamId })`:

- canvas-native → SQL
- `agency.*` → one Agency get; if missing, `{ missing: true }` (tombstone)
- include inbound `workspace_relation` rows so Orch can answer “what did we decide about this project?”

`relation.create` validation (used in Task 6): `toObjectType` `agency.*` requires `teamId`, membership, and the target exists (or allow tombstone only on **read**, not on create — create fails closed if the Agency id is unknown).

- [ ] **Step 1:** Tests: member can query projects as `agency.project` views; outsider cannot; `about` project returns linked notes; deleted project get returns `missing: true`; knowledge action cannot “update” an agency.project (no such apply path).
- [ ] **Step 2:** Implement mapping via existing agency-ops services. Wire into query/get.
- [ ] **Step 3:** `bun test` knowledge-agency tests. Commit: `feat: project Agency records into the canvas knowledge graph`.

**ponytail:** Do not pin Agency entities as their own React Flow cards. They are first-class in **query and relations**. Notes/decisions about them sit on the board.

---

### Task 6: Knowledge actions + Orch tools

**Files:** `[packages/agent/src/knowledge-actions.ts](packages/agent/src/knowledge-actions.ts)`, catalog, tools, `[agency-proposals.ts](packages/api/src/routers/agent/agency-proposals.ts)`.

`knowledgeActionSchema` discriminated union:

- `object.create` — canvas-native type only, title, properties, optional placement, optional `about` target (`knowledgeTargetSchema`)
- `object.update` — title / properties / visibility / teamId (no agencyRef field)
- `object.delete` — canvas-native only
- `relation.create` / `relation.delete` — `to` may be `agency.*`
- `placement.upsert` — canvas-native objects only

Reject `object.create` / `object.update` / `object.delete` / `placement.upsert` for `agency.*`. Creating a project is `propose_agency_action`. Linking is `relation.create`.

On Approve: persist graph, revision, **project canvas-native objects into** `dashboard_workspace.nodes`. Derive `node.agencyRef` from `about` project/task relations so existing cards and `[agencyRefHref](apps/web/src/features/workspace/workspace-agency-links.ts)` keep working.

New tools (canvas surface; unlock Agency surface when `about` targets Agency or `teamId` is on the turn — reuse `resolveUnlockedSurfaces`):

- `query_knowledge` — Ask/Plan/Agent
- `get_knowledge_object` — Ask/Plan/Agent
- `draft_knowledge_plan` — Plan
- `propose_knowledge_action` — Agent

Keep `propose_canvas_action` for tab/block AST edits. Keep existing `list_agency_*` tools; instructions: use `query_knowledge` when the question is “what do we know / decide about X”; use Agency tools when the question is operational (timers, bills, hours).

System prompt: "Canvas is a view of the team brain. Agency projects, tasks, members, clients, and time entries are live records — link with about, never copy. Private notes stay private. Query before proposing."

- [ ] **Step 1:** Failing tests: parse actions; `object.create` note `about` `agency.project`; reject `object.update` on `agency.task`; reject `about` without team membership; reject unknown project id.
- [ ] **Step 2:** Implement apply + proposal execute (`domain` stays `"canvas"`).
- [ ] **Step 3:** Catalog + tools + prompt in `[packages/agent/src/index.ts](packages/agent/src/index.ts)`.
- [ ] **Step 4:** `bun test` agent knowledge + catalog tests. Commit: `feat: add Orch knowledge query and propose tools`.

---

### Task 7: Capture path that proves the team loop

Prove: **capture → link to real team data → Approve → commit → board refresh + query**.

- On `/canvas` or Agency-unlocked Canvas, Agent mode: “we decided to cut scope on {project}” → `object.create` decision (team-scoped) + `about` that `agency.project` (id from `query_knowledge` / `list_agency_projects`, never invented) + placement near scoped node if any.
- “remember this about {task}” → team `note` + `about` `agency.task`.
- Private “remember this” with no team context → private note, no Agency link.
- Reuse proposal card + Approve. Derived `agencyRef` on the synthesized document card so the existing Agency deep-link chip works.

Optional: type chip on `[workspace-node-card.tsx](apps/web/src/features/workspace/workspace-node-card.tsx)` (`Note` / `Decision`) using existing `Badge`.

- [ ] **Step 1:** Tests: decision about a real project id → pending proposal with `about` `{ objectType: "agency.project", id }`; query `about` that project returns the decision after execute; private note has no teamId.
- [ ] **Step 2:** Manual: Approve → object + relation + revision + canvas card with working Agency href. Commit: `feat: capture team decisions linked to Agency projects`.

---

### Task 8: Verification

- `bun run check` · `check-types` · `check:conventions` · `check:golden` (new in-scope files).
- Confirm existing canvas save/load, node page block edit, `propose_canvas_action` still work.
- Confirm dual-write: edit a node title on `/node/:id` → `workspace_object.title` updates; existing `agencyRef` becomes `about` relations.
- Confirm outsider cannot query another user's private objects or another team's Agency projections.
- Confirm an editor changing a team-shared node updates the **owner’s** `workspace_object`, not a duplicate under the editor.
- Confirm `about` relations do not draw new React Flow edges. Orchestrator board links still round-trip.
- Confirm knowledge tools cannot create/edit/delete a project, task, time entry, client, or member.
- Confirm `query_knowledge` about a project returns linked notes/decisions.

Commit: `test: verify canvas knowledge kernel` only if leftover test gaps; otherwise the last feature commit is enough.

## Spec coverage (self-review)

- Typed objects as canonical layer — Tasks 1–2
- Spatial coords separate from identity — placements in Tasks 2–3
- Team-scoped brain + private notes — Tasks 2–4, 7
- Live Agency projections (project, task, member, client, time) — Task 5
- `about` links replace agencyRef as SoT — Tasks 3, 5–7
- Capture first, agent proposes types — Task 7
- Codebase semantics (query, diffs, schema-aware edits) — Tasks 4–6 + revisions
- HITL proposal bus — Task 6 (existing bus)
- React Flow stays renderer — no canvas rewrite
- Agency remains SoT; Money out of graph — Global Constraints
- Block AST kept — document.content + existing canvas actions
- Decision as first promoted type — Tasks 1 and 7
- Pin Agency cards on the board / backlinks rail / table view / 200-cap lift — **Plan 2–3, out of scope**

## Execution

Plan complete after you confirm. Two options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks
2. **Inline Execution** — execute in this session with checkpoints

Which approach?
