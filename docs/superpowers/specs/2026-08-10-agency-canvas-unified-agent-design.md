# Agency–Canvas Unified Agent

Date: 2026-08-10
Status: Approved — implementation in progress

## Feature summary

Unify the workspace composer so Ask / Plan / Agent work across Agency and Canvas
with one HITL proposal bus. `ui_present` can preview real Canvas blocks; Approve
applies them to the board. Phase 2 links team-shared nodes to Agency projects/tasks.

## Locked decisions

- Destination: agent bridge (B) + domain links (C). C is the north star; B ships first.
- Ownership: hybrid on existing team-sharable nodes (`visibility: team` + `teamId`).
- Writes: Agency-style propose + `ui_present` + Approve/Reject on both surfaces.
- Composer: route sets default surface; scope/intent unlocks the other catalog.
- First C links: project + task only.
- Non-goals: Money on Canvas, legacy Agency-in-canvas blocks, MagicBento `/canvas` rewrite.

## Architecture

Keep dual-register UIs (Canvas spatial / Agency execution). Unify agent orchestration.

1. One composer, one proposal bus (`domain`: `agency` | `canvas`).
2. Intent-gated catalogs: default surface from pathname; node/tab/block or explicit
   Canvas tag unlocks canvas tools on Agency (and Agency chips unlock Agency tools on Canvas).
3. `ui_present` kinds `workspaceBlock` / `workspaceNode` render registry components.
4. Phase 2: optional `agencyRef` on team-visible nodes.

## Composer & runtime

| Mode  | Behavior                                                                      |
| ----- | ----------------------------------------------------------------------------- |
| Ask   | Reads + `ui_present` + clarifying questions; no writes                        |
| Plan  | Research → question → `draft_*_plan` → overview → Confirm → pending proposals |
| Agent | Every write via `propose_*` + required `ui_present` → Approve/Reject          |

Canvas Plan is enabled (no Ask coercion). Direct Agent-mode board writes are removed.

## `ui_present` blocks

Artifact kinds `workspaceBlock` and compact `workspaceNode` validate with workspace
Zod schemas and render through the web block registry (read-only preview). After
Approve, Open on board → `/node/:id` or `/canvas`.

## Phase 2 — `agencyRef`

```ts
agencyRef?: { teamId: string; projectId?: string; taskId?: string }
```

Valid only on team-visible nodes for that team. Soft link; Agency remains source of
truth. Bidirectional deep-links; agent may emit paired proposals.
