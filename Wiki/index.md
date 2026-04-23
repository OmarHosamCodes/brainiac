---
title: Wiki Index
---

# Wiki Index

*This index is automatically maintained. Last updated: 2026-04-23T00:00:00Z*

## Projects

- [[projects/brainiac/brainiac|Brainiac]] — Nuxt/Vue workspace app with AI-powered blocks
  - **Layer 1 — Configs/Primitives**
    - [[projects/brainiac/layer1-monorepo-config|Monorepo Root Config]] — package.json, turbo.json, tsconfig.json, knip.json
    - [[projects/brainiac/layer1-config-package|@brainiac/config]] — shared TypeScript compiler options (tsconfig.base.json)
    - [[projects/brainiac/layer1-env-package|@brainiac/env]] — validated env vars (server: DATABASE_URL, auth, Polar; web: NUXT_PUBLIC_SERVER_URL)
    - [[projects/brainiac/layer1-db-package|@brainiac/db]] — Drizzle client + all PostgreSQL schemas (auth, workspace, team, agency-ops)
    - [[projects/brainiac/layer1-workspace-package|@brainiac/workspace]] — all block/node types, Zod schemas, constants, tiers, factory functions
  - **Layer 2 — Data/State**
    - [[projects/brainiac/layer2-auth-package|@brainiac/auth]] — BetterAuth instance: Drizzle adapter, email/password, Polar checkout/portal/webhooks plugins
    - [[projects/brainiac/layer2-workspace-store|useWorkspaceStore]] — Pinia store: node CRUD, save/sync lifecycle, revision tracking, optimistic editor draft
    - [[projects/brainiac/layer2-agency-time-tracking-store|useAgencyTimeTrackingStore]] — Pinia store: per-team tracker drafts, timer start/stop/restart, optimistic cache patching, query registry
    - [[projects/brainiac/layer2-client-composables|Client Composables]] — useOrpc, useAuthClient, useAuthSession (thin Nuxt plugin wrappers)
  - **Layer N — Features/Blocks**
    - [[projects/brainiac/brainiac-agency-time-tracker|Agency Time Tracker Block]] — grouped project selector, stop gating, entry links
    - [[projects/brainiac/brainiac-eisenhower-matrix|Eisenhower Matrix Block]] — source-aware task prioritization
    - [[projects/brainiac/brainiac-time-orchestrator|Time Orchestrator Block]] — task orchestration from connected nodes
    - [[projects/brainiac/brainiac-workspace-editor-modal|Workspace Editor Modal]] — node settings with swatch tint picker
- [[projects/ogm-reimagined/ogm-reimagined|OGM Reimagined]] — React/TanStack admin panel for platform management

## Concepts

- [[concepts/icon-popover-pattern|Icon + Popover Action Pattern]] — icon button → popover for inline data entry

## Entities

## Skills

- [[skills/shape-skill|Shape Skill]] — design brief workflow before coding

## References

## Synthesis

## Journal
