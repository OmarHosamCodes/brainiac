---
title: Wiki Index
---

# Wiki Index

_This index is automatically maintained. Last updated: 2026-04-23T00:00:00Z_

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
  - **Layer 3 — API/Logic**
    - [[projects/brainiac/layer3-procedures-context|ORPC Procedures & Context]] — createContext (BetterAuth session extraction), publicProcedure / protectedProcedure / protectedProProcedure middleware chain
    - [[projects/brainiac/layer3-app-router|appRouter]] — root ORPC router: agent, agencyOps, billing, system (spread), team, workspace; exports AppRouter + AppRouterClient types
    - [[projects/brainiac/layer3-billing|Billing State & Guard]] — billing.ts: BillingState type + normalizeBillingState; billing-guard.ts: getBillingStateForUser + requirePro middleware
    - [[projects/brainiac/layer3-dev-errors|Dev Error Handling]] — toProcedureError / toInternalServerError: maps OpenRouter HTTP errors + dev/prod ORPCError conversion
    - [[projects/brainiac/layer3-router-system-billing|System & Billing Routers]] — healthCheck (public), privateData (protected), billing.state (protected → getBillingStateForUser)
    - [[projects/brainiac/layer3-router-agent|Agent Router]] — freeModels, modelCatalog, accountStatus, chat.turn (billing-gated), conversations CRUD; all via @brainiac/agent + OpenRouter
    - [[projects/brainiac/layer3-router-workspace|Workspace Router]] — workspace get/save (node-limit gated), shareNode, unshareNode, deleteNode, marketplace list/save (Pro)
    - [[projects/brainiac/layer3-router-team|Team Router]] — team CRUD (team-limit gated on create), members add/updateRole/remove; RBAC via workspaceTeamRoleSchema
    - [[projects/brainiac/layer3-router-agency-ops|Agency Ops Router]] — Pro-only: clients, projects, tags CRUD; timer start/stop/getActive; timeEntries CRUD; summary + reports (CSV export)
    - [[projects/brainiac/layer3-server-app|Server App & Handlers]] — Hono app (port 7000): CORS, auth routes, billing redirect, RPCHandler (/rpc/_), OpenAPIHandler (/api-reference/_)
    - [[projects/brainiac/layer3-web-middleware|Web Route Middleware]] — auth.ts (session guard → /login), workspace.ts (preloadWorkspace on route enter); both client-only Nuxt middleware
  - **Layer 4 — Agents/Tools**
    - [[projects/brainiac/layer4-agent-client|OpenRouter Client Factory]] — `createOpenRouterClient`: authenticated `OpenRouter` SDK instance; throws if `OPENROUTER_API_KEY` absent
    - [[projects/brainiac/layer4-agent-models|OpenRouter Model Catalog & Account Status]] — catalog fetch/cache (10 min TTL), free-model filter, account status (60 s TTL), 7 exported functions + 6 Zod schemas
    - [[projects/brainiac/layer4-agent-types|Agent Types & Schemas]] — all agent Zod schemas (usage, presets, messages, conversations, I/O), constants (`DEFAULT_AGENT_MODEL`, window/history limits), TypeScript types
    - [[projects/brainiac/layer4-agent-runner|Dashboard Agent Runner]] — `runDashboardAgent`: model resolution → workspace runtime → instruction building (ask/agent/fallback) → OpenRouter `callModel` with tools; retry logic, fallback pass
    - [[projects/brainiac/layer4-agent-tools|Workspace Tools & Runtime]] — `buildDashboardAgentTools` (9 read + 10 mutation tools), `createDashboardAgentWorkspaceRuntime` (mutable in-memory clone), `patch_block` path engine, `describeBlockEditGuide` for 44 block types
    - [[projects/brainiac/layer4-agent-service|Agent API Service]] — conversation CRUD against `dashboardConversation`/`dashboardConversationMessage` tables; `appendDashboardConversationTurn` orchestrates workspace fetch → agent run → DB persist → workspace save
  - **Layer 5 — UI/Features**
    - [[projects/brainiac/layer5-app-bootstrap|App Bootstrap]] — app.vue root, app.config.ts, default layout, auth-client/orpc/vue-query plugins
    - [[projects/brainiac/layer5-pages-public|Public Pages]] — index (hero + health check), login (split auth panel), pricing (free/pro grid), privacy, terms
    - [[projects/brainiac/layer5-pages-protected|Protected Pages]] — dashboard (infinite canvas + teams + agent), marketplace (infinite scroll), billing/index + billing/success
    - [[projects/brainiac/layer5-page-node|Node Detail Page]] — `/node/[id]` (2500+ lines): tab/block management, agent context, sharing, marketplace publish
    - [[projects/brainiac/layer5-composables-core|Core Composables]] — useOrpc (plugin accessor), useAuthClient/useAuthSession, useBilling (Polar checkout), useDashboardLayout
    - [[projects/brainiac/layer5-composables-workspace|Workspace Composables]] — useWorkspaceBoard (store facade), useCanvas (pan/zoom engine), useNodeSharing (board), useWorkspaceNodeSharing (node)
    - [[projects/brainiac/layer5-composables-team|Team Composables]] — useTeamSelection (list+detail queries, auto-select), useTeamManagement (CRUD + optimistic updates)
    - [[projects/brainiac/layer5-composable-agent-chat|Agent Chat Composable]] — useDashboardAgentChat: 8 queries/mutations, @mention system, model preferences, localStorage
    - [[projects/brainiac/layer5-components-core|Core Components]] — Header (floating pill nav), UserMenu, LegalPageShell, InfiniteCanvas (canvas engine + connections + resize)
    - [[projects/brainiac/layer5-components-auth|Auth Components]] — SignInForm, SignUpForm (email/password, better-auth)
    - [[projects/brainiac/layer5-components-workspace|Workspace Board Components]] — WorkspaceNodeCard, WorkspaceBoardStatus, WorkspaceEditorModal, AgencyOperatorConnectModal, Marketplace/Team/Dashboard AI components
    - [[projects/brainiac/layer5-components-node-editor|Node Editor Components]] — WorkspaceNodeShell, WorkspaceNodeBlockRenderer (dynamic), WorkspaceNodeEditorContext (80+ field provide/inject contract)
    - [[projects/brainiac/layer5-block-registry|Block Registry & 44 Block Editors]] — workspaceBlockRegistry map + all block editor components (core/analysis/planning/business/sales/content/HR/learning/time/agency/health/AI)
    - [[projects/brainiac/layer5-stores|Stores]] — useWorkspaceStore (node CRUD, revision-based sync, debounced save), useAgencyTimeTrackingStore (timer clock-in/out, optimistic cache)
    - [[projects/brainiac/layer5-utils|Utilities & Constants]] — workspace-node-connections, workspace-node-dashboard (tint), workspace-marketplace (serialize/clone), workspace-block-presets (5 packs), workspace-node-formatters, dashboard-agent-mentions, render-simple-markdown, get-error-message, workspace-node-options
  - **Layer N — Features/Blocks (legacy entries)**
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
