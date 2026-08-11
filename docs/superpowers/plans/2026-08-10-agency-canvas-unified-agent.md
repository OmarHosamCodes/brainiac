# Agency–Canvas Unified Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One composer that can Ask / Plan / Agent across Agency and Canvas with HITL proposals, real Canvas block previews via `ui_present`, seamless open-on-board handoffs, then project/task links on team-shared nodes.

**Architecture:** Keep dual-register UIs; unify the agent orchestration layer. Route sets default surface; scope/intent unlocks the other catalog. Canvas mutations join the proposal bus. New `workspaceBlock` / `workspaceNode` artifact kinds. Phase 2 adds soft `agencyRef`.

**Tech Stack:** Bun, `@orch/agent`, `@orch/api` proposals, `@orch/workspace` schemas, React 19 workspace-agent host.

## Global Constraints

- Golden-file layers: router thin → service `(actorUserId, input)` → hook owns orchestration → views props-only.
- Browser must import `@orch/agent/types`, never `@orch/agent` barrel.
- Bun only: `bun test`, `bun run check`, `bun run check-types`, `bun run check:conventions`, `bun run check:golden` when adding files.
- Canvas writes never apply inside the model tool path; only after human Approve (or Plan Confirm → proposals → Approve).
- Team-shared / `agencyRef` requires membership; fail closed without `teamId`.

---

## File map

| File                                                 | Responsibility                                                |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `packages/agent/src/canvas-actions.ts`               | Canvas action / draft-plan Zod + labels                       |
| `packages/agent/src/canvas-tools.ts`                 | `draft_canvas_plan` / `propose_canvas_action`                 |
| `packages/agent/src/tools.ts`                        | `applyCanvasAction`; Plan profile; no default direct mutators |
| `packages/agent/src/tool-catalog.ts`                 | Intent-merged catalog + canvas plan/propose                   |
| `packages/agent/src/ui-artifact.ts`                  | `workspaceBlock` / `workspaceNode` kinds                      |
| `packages/agent/src/index.ts`                        | Merged tools, Canvas Plan instructions, no snapshot apply     |
| `packages/db/src/schema/workspace.ts`                | Proposal `domain`, nullable `teamId`                          |
| `packages/api/src/routers/agent/agency-proposals.ts` | Polymorphic create/approve/reject/confirm                     |
| `apps/web/src/features/workspace-agent/*`            | Plan on Canvas, unlock tags, block preview, open-on-board     |
| `packages/workspace/src/schemas.ts`                  | Phase 2 `agencyRef`                                           |

See Cursor plan `agency_canvas_agent_unity` for task checklist.
