import { z } from "zod";

import {
  WORKSPACE_CUSTOM_BLOCK_FIELD_LIMIT,
  WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT,
  WORKSPACE_KANBAN_CARD_LIMIT,
  WORKSPACE_KANBAN_COLUMN_LIMIT,
  WORKSPACE_MARKETPLACE_ITEM_LIMIT,
  WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT,
  WORKSPACE_NODE_LIMIT,
  WORKSPACE_NODE_TAB_LIMIT,
  WORKSPACE_NODE_TINTS,
  WORKSPACE_SCORECARD_METRIC_LIMIT,
  WORKSPACE_TAB_BLOCK_LIMIT,
  WORKSPACE_TASK_DOMAINS,
  WORKSPACE_TASK_LIMIT,
  WORKSPACE_TASK_QUADRANTS,
  WORKSPACE_TIMELINE_MILESTONE_LIMIT,
  WORKSPACE_TIMELINE_MILESTONE_STATUSES,
} from "./constants";

const isoTimestampSchema = z.string().datetime();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const workspaceTaskPrioritySchema = z.enum(["low", "medium", "high"]);
export const workspaceTaskDomainSchema = z.enum(WORKSPACE_TASK_DOMAINS);
export const workspaceTaskQuadrantSchema = z.enum(WORKSPACE_TASK_QUADRANTS);
export const workspaceTimelineMilestoneStatusSchema = z.enum(WORKSPACE_TIMELINE_MILESTONE_STATUSES);
export const workspaceNodeTintSchema = z.enum(WORKSPACE_NODE_TINTS);
export const workspaceCustomFieldTypeSchema = z.enum(["text", "number", "checkbox", "textarea"]);

export const workspaceTaskSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().max(240),
  completed: z.boolean().default(false),
  dueDate: isoDateSchema.nullable().optional(),
  priority: workspaceTaskPrioritySchema.nullable().optional(),
  domain: workspaceTaskDomainSchema.nullable().optional(),
  urgency: z.number().int().min(1).max(10).default(5),
  importance: z.number().int().min(1).max(10).default(5),
  estimateMinutes: z.number().int().min(0).max(1440).default(30),
});

export const workspacePromptOutputSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().max(4000),
  output: z.string().max(12000),
  createdAt: isoTimestampSchema,
});

export const workspaceDecisionItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().max(240),
  weight: z.number().int().min(1).max(5).default(3),
});

export const workspaceTrackerEntrySchema = z.object({
  id: z.string().min(1),
  label: z.string().max(120).default(""),
  value: z.number().finite(),
  createdAt: isoTimestampSchema,
});

export const workspaceTimeOrchestratorSettingsSchema = z.object({
  domains: z
    .array(workspaceTaskDomainSchema)
    .max(WORKSPACE_TASK_DOMAINS.length)
    .default([...WORKSPACE_TASK_DOMAINS]),
  includeUnassigned: z.boolean().default(true),
  quadrants: z
    .array(workspaceTaskQuadrantSchema)
    .max(WORKSPACE_TASK_QUADRANTS.length)
    .default([...WORKSPACE_TASK_QUADRANTS]),
});

export const workspaceKanbanColumnSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(80),
});

export const workspaceKanbanCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(240),
  description: z.string().max(4000).default(""),
  columnId: z.string().min(1),
  assignee: z.string().trim().max(120).default(""),
  dueDate: isoDateSchema.nullable().optional(),
});

export const workspaceTimelineMilestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(160),
  date: isoDateSchema.nullable().optional(),
  status: workspaceTimelineMilestoneStatusSchema.default("planned"),
  note: z.string().max(2000).default(""),
});

export const workspaceScorecardMetricSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().max(120),
  value: z.number().finite().default(0),
  target: z.number().finite().default(100),
  unit: z.string().trim().max(24).default(""),
});

export const workspaceCustomBlockFieldSchema = z.object({
  id: z.string().min(1),
  key: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1).max(80),
  type: workspaceCustomFieldTypeSchema,
});

export const workspaceCustomBlockFormulaSchema = z.object({
  label: z.string().trim().min(1).max(80),
  expression: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_+\-*/().\s]+$/),
});

export const workspaceCustomBlockTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  fields: z.array(workspaceCustomBlockFieldSchema).min(1).max(WORKSPACE_CUSTOM_BLOCK_FIELD_LIMIT),
  includeNotes: z.boolean().default(false),
  formula: workspaceCustomBlockFormulaSchema.nullable().optional(),
  aiPromptTemplate: z.string().max(2000).nullable().optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const workspaceCustomBlockValueSchema = z.union([
  z.string().max(4000),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const workspaceBlockBaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(120),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const workspaceTaskListBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("task-list"),
  tasks: z.array(workspaceTaskSchema).max(WORKSPACE_TASK_LIMIT).default([]),
});

export const workspaceNotesBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("notes"),
  body: z.string().max(20000).default(""),
});

export const workspaceDecisionBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("decision"),
  pros: z.array(workspaceDecisionItemSchema).max(30).default([]),
  cons: z.array(workspaceDecisionItemSchema).max(30).default([]),
  recommendation: z.string().max(4000).default(""),
});

export const workspaceTrackerBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("tracker"),
  entries: z.array(workspaceTrackerEntrySchema).max(60).default([]),
});

export const workspaceAiPromptBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("ai-prompt"),
  prompt: z.string().max(4000).default(""),
  latestOutput: z.string().max(12000).default(""),
  outputHistory: z.array(workspacePromptOutputSchema).max(20).default([]),
});

export const workspaceTimeOrchestratorBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("time-orchestrator"),
  settings: workspaceTimeOrchestratorSettingsSchema.default({
    domains: [...WORKSPACE_TASK_DOMAINS],
    includeUnassigned: true,
    quadrants: [...WORKSPACE_TASK_QUADRANTS],
  }),
});

export const workspaceKanbanBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("kanban"),
  columns: z.array(workspaceKanbanColumnSchema).min(1).max(WORKSPACE_KANBAN_COLUMN_LIMIT),
  cards: z.array(workspaceKanbanCardSchema).max(WORKSPACE_KANBAN_CARD_LIMIT),
});

export const workspaceTimelineBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("timeline"),
  milestones: z
    .array(workspaceTimelineMilestoneSchema)
    .max(WORKSPACE_TIMELINE_MILESTONE_LIMIT)
    .default([]),
});

export const workspaceScorecardBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("scorecard"),
  metrics: z
    .array(workspaceScorecardMetricSchema)
    .max(WORKSPACE_SCORECARD_METRIC_LIMIT)
    .default([]),
});

export const workspaceCustomBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("custom"),
  definitionId: z.string().min(1),
  values: z.record(z.string(), workspaceCustomBlockValueSchema).default({}),
  notes: z.string().max(4000).default(""),
  latestAiOutput: z.string().max(12000).default(""),
  outputHistory: z.array(workspacePromptOutputSchema).max(20).default([]),
});

export const workspaceBlockSchema = z.discriminatedUnion("type", [
  workspaceTaskListBlockSchema,
  workspaceNotesBlockSchema,
  workspaceDecisionBlockSchema,
  workspaceTrackerBlockSchema,
  workspaceAiPromptBlockSchema,
  workspaceTimeOrchestratorBlockSchema,
  workspaceKanbanBlockSchema,
  workspaceTimelineBlockSchema,
  workspaceScorecardBlockSchema,
  workspaceCustomBlockSchema,
]);

export const workspaceNodeTabSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(80),
  blocks: z.array(workspaceBlockSchema).max(WORKSPACE_TAB_BLOCK_LIMIT).default([]),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const workspaceNodeViewStateSchema = z.object({
  activeTabId: z.string().min(1).nullable().optional(),
  notePreviewState: z.record(z.string(), z.boolean()).default({}),
});

export const workspaceNodeDashboardFeaturedBlockSchema = z.object({
  tabId: z.string().min(1),
  blockId: z.string().min(1),
});

export const workspaceNodeDashboardSchema = z.object({
  tint: workspaceNodeTintSchema.default("neutral"),
  featuredBlocks: z
    .array(workspaceNodeDashboardFeaturedBlockSchema)
    .max(WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT)
    .default([]),
});

export const workspaceNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  content: z.string().max(4000).default(""),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  label: z.string().max(120).optional(),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  tabs: z.array(workspaceNodeTabSchema).max(WORKSPACE_NODE_TAB_LIMIT).default([]),
  customBlockTemplates: z
    .array(workspaceCustomBlockTemplateSchema)
    .max(WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT)
    .default([]),
  viewState: workspaceNodeViewStateSchema.default({
    activeTabId: null,
    notePreviewState: {},
  }),
  dashboard: workspaceNodeDashboardSchema.default({
    tint: "neutral",
    featuredBlocks: [],
  }),
});

export const workspaceSaveInputSchema = z.object({
  nodes: z.array(workspaceNodeSchema).max(WORKSPACE_NODE_LIMIT),
});

export const workspaceMarketplacePayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("node"),
    node: workspaceNodeSchema,
  }),
  z.object({
    kind: z.literal("tab"),
    tab: workspaceNodeTabSchema,
    customBlockTemplates: z
      .array(workspaceCustomBlockTemplateSchema)
      .max(WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT)
      .default([]),
  }),
  z.object({
    kind: z.literal("block"),
    block: workspaceBlockSchema,
    customBlockTemplates: z
      .array(workspaceCustomBlockTemplateSchema)
      .max(WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT)
      .default([]),
  }),
]);

export const workspaceMarketplaceItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(240).default(""),
  payload: workspaceMarketplacePayloadSchema,
  createdByUserId: z.string().min(1).nullable().optional(),
  createdByName: z.string().trim().min(1).max(120).default("Unknown"),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const workspaceMarketplaceSaveInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(240).optional(),
  payload: workspaceMarketplacePayloadSchema,
});

export const workspaceMarketplaceListSchema = z.object({
  items: z.array(workspaceMarketplaceItemSchema).max(WORKSPACE_MARKETPLACE_ITEM_LIMIT).default([]),
});
