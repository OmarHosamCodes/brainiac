---
title: Eisenhower Matrix Block
category: projects/brainiac
tags: [vue, nuxt, tasks, prioritization, orchestrator]
summary: "Workspace block for task prioritization across urgency/importance quadrants; source-aware when inside an orchestrator node."
sources:
  - ~/.codex/sessions/2026/04/13/rollout-2026-04-13T21-25-51.jsonl
provenance:
  extracted: 0.8
  inferred: 0.2
  ambiguous: 0.0
updated: 2026-04-23
---

# Eisenhower Matrix Block

File: `apps/web/app/components/workspace/node/blocks/WorkspaceEisenhowerMatrixBlockEditor.vue`

## Purpose

Prioritize tasks across the classic 2×2 urgency/importance matrix. Supports an AI "battle-plan" flow for automated quadrant assignment.

## Source-Aware Mode (Orchestrator Nodes)

When placed inside an **orchestrator** node, the block inherits the same scope and filter behavior as [[brainiac-time-orchestrator]]:

- Tasks come from **connected source nodes** (not the global task list)
- Persists the same **domain/quadrant filters** as the time orchestrator
- Supports **cross-source task** visibility

This behavior was added to match parity with `WorkspaceTimeOrchestratorBlockEditor.vue`.

### What was added
- In orchestrator nodes: uses collected tasks from connected sources
- Persists domain/quadrant filter state shared with the time orchestrator
- Cross-source task support

## Related

- [[brainiac-time-orchestrator]]
- [[brainiac-agency-time-tracker]]
- [[brainiac]]
