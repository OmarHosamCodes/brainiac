---
title: Time Orchestrator Block
category: projects/brainiac
tags: [vue, nuxt, tasks, orchestrator]
summary: "Workspace block that orchestrates tasks sourced from connected nodes; used as the reference implementation for source-aware blocks."
sources:
  - ~/.codex/sessions/2026/04/13/rollout-2026-04-13T21-25-51.jsonl
provenance:
  extracted: 0.7
  inferred: 0.3
  ambiguous: 0.0
updated: 2026-04-23
---

# Time Orchestrator Block

File: `apps/web/app/components/workspace/node/blocks/WorkspaceTimeOrchestratorBlockEditor.vue`

## Purpose

Orchestrates tasks from **connected source nodes** in the workspace graph. Acts as the canonical reference for "orchestrator-node-aware" block behavior.

## Key Behavior

- When a block's parent node is an **orchestrator** node, it collects tasks from all connected upstream nodes
- Exposes domain and quadrant filter state that can be shared across blocks in the same node
- Used as the model for making [[brainiac-eisenhower-matrix]] source-aware

## Related

- [[brainiac-eisenhower-matrix]]
- [[brainiac-agency-time-tracker]]
- [[brainiac]]
