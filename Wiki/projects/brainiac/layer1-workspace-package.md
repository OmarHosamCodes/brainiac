---
title: "@brainiac/workspace — Workspace Primitives"
category: projects
tags: [workspace, types, schemas, zod, constants, primitives]
summary: "Core workspace domain package: all block/node/tab types, Zod schemas, constants, factory functions, tiers, and block categories."
provenance:
  extracted: 1.0
  inferred: 0.0
  ambiguous: 0.0
updated: 2026-04-23
layer: 1
---

# @brainiac/workspace — Workspace Primitives

## Primary Entity

- **Name:** `@brainiac/workspace`
- **Type:** Domain Primitives Package
- **Path:** `packages/workspace/`
- **Exports:**
  - `.` → `src/index.ts` — all workspace symbols
  - `./tiers` → `src/tiers.ts` — tier limits only
- **Only dependency:** `zod` (catalog)

---

## `src/constants.ts` — Runtime Limits & Enums

**Standalone:** Yes — no imports other than standard JS.

### Numeric Limits (selected)

| Constant | Value |
|---|---|
| `WORKSPACE_NODE_LIMIT` | 200 |
| `WORKSPACE_NODE_TAB_LIMIT` | 12 |
| `WORKSPACE_TAB_BLOCK_LIMIT` | 24 |
| `WORKSPACE_TASK_LIMIT` | 100 |
| `WORKSPACE_KANBAN_COLUMN_LIMIT` | 6 |
| `WORKSPACE_KANBAN_CARD_LIMIT` | 120 |
| `DEFAULT_WORKSPACE_NODE_WIDTH` | 320 |
| `DEFAULT_WORKSPACE_NODE_HEIGHT` | 220 |
| `DEFAULT_WORKSPACE_NODE_MIN_WIDTH` | 260 |
| `DEFAULT_WORKSPACE_NODE_MIN_HEIGHT` | 180 |
| `WORKSPACE_MARKETPLACE_ITEM_LIMIT` | 200 |
| (many more…) | |

### `const` Arrays (as-const enums)

| Constant | Values |
|---|---|
| `WORKSPACE_NODE_TYPES` | `"standard"`, `"orchestrator"`, `"agency-operator"` |
| `AGENCY_OPERATOR_PREDEFINED_TAB_TITLES` | `"Overview"`, `"Team"`, `"Settings"` |
| `WORKSPACE_TASK_DOMAINS` | `"strategy"`,`"people"`,`"sales"`,`"content"`,`"brand"`,`"finance"`,`"education"`,`"orchestrator"` |
| `WORKSPACE_TASK_QUADRANTS` | `"do"`,`"schedule"`,`"delegate"`,`"eliminate"` |
| `WORKSPACE_HABIT_GRID_DAYS` | `"mon"` … `"sun"` |
| `WORKSPACE_TIMELINE_MILESTONE_STATUSES` | `"planned"`,`"active"`,`"done"`,`"blocked"` |
| `WORKSPACE_PEOPLE_SKILL_DIMENSIONS` | `"writing"`,`"strategy"`,`"design"`,`"analytics"`,`"leadership"` |
| `WORKSPACE_DELEGATION_STATUSES` | `"stuck"`,`"transitioning"`,`"delegated"` |
| `WORKSPACE_SALES_PIPELINE_STAGES` | `"lead"`,`"consultation"`,`"proposal"`,`"negotiation"`,`"closed"` |
| `WORKSPACE_SALES_TEMPERATURES` | `"hot"`,`"warm"`,`"cold"` |
| `WORKSPACE_SALES_FORECAST_BUCKETS` | `"commit"`,`"likely"`,`"upside"`,`"at-risk"` |
| `WORKSPACE_CONTENT_PLATFORMS` | `"instagram"`,`"tiktok"`,`"linkedin"`,`"youtube"` |
| `WORKSPACE_CONTENT_PIPELINE_STATUSES` | `"ideas"`,`"draft"`,`"review"`,`"approved"`,`"published"` |
| `WORKSPACE_CONTENT_QUALITY_DIMENSIONS` | 10 dimensions (hook, value, emotion, cta, platformFit, brand, shareability, scrollStop, authenticity, storytelling) |
| `WORKSPACE_STRATEGIC_ASSUMPTION_STATUSES` | `"validating"`,`"confirmed"`,`"at-risk"`,`"false"` |
| `WORKSPACE_AUTHORITY_SCORECARD_METRICS` | posts, videos, speakingGigs, podcastAppearances, mediaFeatures, followers |
| `WORKSPACE_FINANCE_PAYMENT_STATUSES` | `"paid"`,`"partial"`,`"overdue"` |
| `WORKSPACE_COHORT_STATUSES` | `"planning"`,`"selling"`,`"running"`,`"completed"` |
| `WORKSPACE_LEADERSHIP_RHYTHMS` | `"weekly"`,`"monthly"`,`"quarterly"` |
| `WORKSPACE_LEADERSHIP_MEETING_STATUSES` | `"scheduled"`,`"missed"`,`"done"`,`"needs-reschedule"` |
| `WORKSPACE_NODE_TINTS` | `"neutral"`,`"emerald"`,`"sky"`,`"amber"`,`"rose"`,`"indigo"` |

---

## `src/tiers.ts` — Tier System

**Standalone:** No — no external imports, but exported separately.

| Tier | `workspaceNodes` | `blocksPerTab` | `tabsPerNode` | `teams` | `teamMembers` | `aiConversations` | `agencyOps` | `marketplacePublish` |
|---|---|---|---|---|---|---|---|---|
| `free` | 10 | 6 | 3 | 1 | 3 | 5 | false | false |
| `pro` | 200 | 24 | 12 | 5 | 20 | -1 (unlimited) | true | true |

**Exported types:** `Tier = "free" | "pro"`, `TierLimits`, `GatedFeature = "agencyOps" | "marketplacePublish"`

**Exported functions:**
- `getTierLimits(tier: Tier): TierLimits` — returns limits object from `TIER_LIMITS` map
- `canAccessFeature(tier: Tier, feature: GatedFeature): boolean` — reads boolean flag from `TIER_LIMITS`

---

## `src/shared.ts` — Pure Utility Functions

**Standalone:** Yes — imports only types from `./types`.

| Function | Signature | Purpose |
|---|---|---|
| `normalizeSelection<T>` | `(values, allowed, fallback) → T[]` | Deduplicate and filter values against allowed set |
| `getNowIsoString` | `() → string` | `new Date().toISOString()` |
| `getDueDateValue` | `(value: string) → number` | Parses date string at `T12:00:00`, returns `.getTime()` |
| `getTodayValue` | `(now?) → number` | Today at noon, as timestamp |
| `trimToEmpty` | `(value?) → string` | `value?.trim() ?? ""` |
| `truncateText` | `(value, maxLength=180) → string` | Trims and appends `...` if over max |
| `getDisplayTabTitle` | `(tab?) → string` | `tab?.title.trim() || "Untitled tab"` |
| `getDisplayBlockTitle` | `(block?) → string` | `block?.title.trim() || "Untitled block"` |

---

## `src/block-categories.ts` — Block Category Registry

**Standalone:** Imports only `WorkspaceBlock` type from `./types`.

Defines `workspaceBlockCategories` as `const satisfies readonly WorkspaceBlockCategory[]` — the authoritative list of all block types organized by category:

| Category ID | Block Types |
|---|---|
| `agency-operations` | `agency-project-manager`, `agency-time-tracker`, `agency-time-entries-log`, `agency-time-summary`, `agency-settings`, `agency-billing-report` (teamOnly) |
| `strategy` | `okr-tracker`, `decision-matrix`, `business-model-canvas`, `assumption-tracker` |
| `sales` | `deal-scoring-matrix`, `pipeline-funnel`, `forecast-confidence-board` |
| `people` | `skills-heat-map`, `delegation-matrix`, `talent-grid`, `seat-planner` |
| `content` | `content-pipeline`, `content-quality-radar`, `content-roi-tracker` |
| `brand` | `authority-scorecard`, `hook-bank`, `message-house` |
| `finance` | `profitability-cash-flow`, `pricing-simulator`, `collections-tracker` |
| `education` | `course-roadmap`, `learning-outcomes-matrix`, `cohort-health-dashboard` |
| `time-orchestrator` | `time-orchestrator`, `eisenhower-matrix`, `leadership-rhythm-planner` |
| `general` | `table`, `checklist`, `kanban`, `scorecard`, `swot`, `tracker`, `pros-cons`, `habit-grid`, `process`, `2x2-matrix`, `timeline`, `ai-prompt` |

**Exported function:** `isWorkspaceTeamOnlyBlockType(type) → boolean` — checks against the derived `workspaceTeamOnlyBlockTypeSet` Set (currently only `agency-billing-report`).

---

## `src/index.ts` — Main Barrel + Factory Functions

**Outgoing dependencies (imports):**
- `./constants` — layout defaults + limit constants
- `./content` → `createWorkspaceContentQualityScoreMap`
- `./people` → `createWorkspaceSkillsScoreMap`
- `./schemas` — all Zod schemas (100+ schemas)
- `./shared` → `getNowIsoString`
- `./tasks` → `createWorkspaceLeadershipRhythmFilter`, `createWorkspaceTimeOrchestratorSettings`
- `./types` — all TypeScript types (type-only imports)

**Re-exports (all of):** `block-categories`, `brand`, `constants`, `content`, `dashboard`, `education`, `finance`, `general`, `people`, `sales`, `schemas`, `strategy`, `tasks`, `types`

**Key factory functions exported from `src/index.ts` directly:**
- `createWorkspaceId(prefix?) → string` — generates `${prefix}-${crypto.randomUUID()}` or timestamp fallback
- `createWorkspaceTask(partial?) → WorkspaceTask` — parses via `workspaceTaskSchema`
- `createWorkspaceChecklistItem(partial?) → WorkspaceChecklistItem`
- `createWorkspaceTableColumn(partial?) → WorkspaceTableColumn`
- `createWorkspaceTableRow(partial?, columns?) → WorkspaceTableRow`
- Plus `createWorkspace*Block` factories for every block type (~50+ functions)

---

## Relationship Map

| Entity | Incoming (Dependents) | Outgoing (Dependencies) | Mechanism |
|---|---|---|---|
| `@brainiac/workspace` (index) | `packages/db/src/schema/workspace.ts` | `zod` | Type import for `WorkspaceNode`, `WorkspaceMarketplacePayload` |
| `@brainiac/workspace` (index) | `apps/server` ORPC procedures | `zod` | Schema parsing and type inference |
| `@brainiac/workspace` (index) | `apps/web` composables, components, stores | `zod` | Factory function calls, type guards, constant references |
| `@brainiac/workspace/tiers` | `apps/server` auth/plan checks | none | `getTierLimits()`, `canAccessFeature()` |
| `src/constants.ts` | `src/index.ts`, `src/tasks.ts`, `src/block-categories.ts` | none | Direct constant imports |
| `src/tiers.ts` | `apps/server` billing logic, `apps/web` gating | none | `canAccessFeature()`, `getTierLimits()` |
| `src/shared.ts` | `src/index.ts`, `src/tasks.ts`, domain modules | `./types` (type-only) | Pure utility calls |
| `src/block-categories.ts` | `apps/web` block picker UI | `./types` (type-only) | `workspaceBlockCategories` array, `isWorkspaceTeamOnlyBlockType()` |

## Standalone Status

**Not standalone** — depends on `zod` for all schema definitions. No other runtime dependencies.
