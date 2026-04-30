---
title: Brainiac
category: projects
tags: [nuxt, vue, workspace, ai-blocks, agency]
summary: "Nuxt/Vue monorepo workspace application with composable AI-powered blocks for task management, time tracking, and planning."
sources:
  - ~/.claude/projects/-home-omar-Projects-brainiac/ac9367d2-e5c0-4596-98b6-ea191f8069d2.jsonl
  - ~/.codex/sessions/2026/04/13/rollout-2026-04-13T21-25-51.jsonl
  - ~/.codex/sessions/2026/04/22/rollout-2026-04-22T17-33-59.jsonl
provenance:
  extracted: 0.8
  inferred: 0.2
  ambiguous: 0.0
updated: 2026-04-23
---

# Brainiac

A Nuxt 3 / Vue monorepo workspace application. The core UX is a canvas of **nodes**, each containing one or more **blocks** — composable AI-powered widgets.

## Architecture

- **Monorepo** under `apps/web` (Nuxt 3, Vue 3 Composition API)
- Node-based canvas: each node hosts blocks
- Blocks communicate via a shared **store** (Pinia)
- Block editors live under `apps/web/app/components/workspace/node/blocks/`

## Key Blocks

| Block                            | Purpose                                                    |
| -------------------------------- | ---------------------------------------------------------- |
| [[brainiac-agency-time-tracker]] | Track billable time per project/client with tags and links |
| [[brainiac-eisenhower-matrix]]   | Prioritize tasks across urgency/importance quadrants       |
| [[brainiac-time-orchestrator]]   | Orchestrate tasks sourced from connected nodes             |

## Related Projects

- [[ogm-reimagined]] — separate admin panel project also worked on by the same developer
