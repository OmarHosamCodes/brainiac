import { z } from "zod";

export const WORKSPACE_NODE_LIMIT = 200;
export const WORKSPACE_NODE_TAB_LIMIT = 12;
export const WORKSPACE_TAB_BLOCK_LIMIT = 24;
export const WORKSPACE_TASK_LIMIT = 100;
export const WORKSPACE_KANBAN_COLUMN_LIMIT = 6;
export const WORKSPACE_KANBAN_CARD_LIMIT = 120;
export const WORKSPACE_TIMELINE_MILESTONE_LIMIT = 40;
export const WORKSPACE_SCORECARD_METRIC_LIMIT = 40;
export const WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT = 20;
export const WORKSPACE_CUSTOM_BLOCK_FIELD_LIMIT = 12;
export const WORKSPACE_MARKETPLACE_ITEM_LIMIT = 200;
export const WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT = 4;
export const DEFAULT_WORKSPACE_NODE_WIDTH = 320;
export const DEFAULT_WORKSPACE_NODE_HEIGHT = 220;
export const DEFAULT_WORKSPACE_NODE_MIN_WIDTH = 260;
export const DEFAULT_WORKSPACE_NODE_MIN_HEIGHT = 180;

const isoTimestampSchema = z.string().datetime();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const WORKSPACE_TASK_DOMAINS = [
  "strategy",
  "people",
  "sales",
  "content",
  "brand",
  "finance",
  "education",
  "orchestrator",
] as const;
export const WORKSPACE_TASK_QUADRANTS = [
  "do",
  "schedule",
  "delegate",
  "eliminate",
] as const;
export const WORKSPACE_TIMELINE_MILESTONE_STATUSES = [
  "planned",
  "active",
  "done",
  "blocked",
] as const;
export const WORKSPACE_NODE_TINTS = [
  "neutral",
  "emerald",
  "sky",
  "amber",
  "rose",
  "indigo",
] as const;

export const workspaceTaskPrioritySchema = z.enum(["low", "medium", "high"]);
export const workspaceTaskDomainSchema = z.enum(WORKSPACE_TASK_DOMAINS);
export const workspaceTaskQuadrantSchema = z.enum(WORKSPACE_TASK_QUADRANTS);
export const workspaceTimelineMilestoneStatusSchema = z.enum(
  WORKSPACE_TIMELINE_MILESTONE_STATUSES,
);
export const workspaceNodeTintSchema = z.enum(WORKSPACE_NODE_TINTS);
export const workspaceCustomFieldTypeSchema = z.enum([
  "text",
  "number",
  "checkbox",
  "textarea",
]);

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
  fields: z
    .array(workspaceCustomBlockFieldSchema)
    .min(1)
    .max(WORKSPACE_CUSTOM_BLOCK_FIELD_LIMIT),
  includeNotes: z.boolean().default(false),
  formula: workspaceCustomBlockFormulaSchema.nullable().optional(),
  aiPromptTemplate: z.string().max(2000).nullable().optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

const workspaceCustomBlockValueSchema = z.union([
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

export const workspaceTimeOrchestratorBlockSchema =
  workspaceBlockBaseSchema.extend({
    type: z.literal("time-orchestrator"),
    settings: workspaceTimeOrchestratorSettingsSchema.default({
      domains: [...WORKSPACE_TASK_DOMAINS],
      includeUnassigned: true,
      quadrants: [...WORKSPACE_TASK_QUADRANTS],
    }),
  });

export const workspaceKanbanBlockSchema = workspaceBlockBaseSchema.extend({
  type: z.literal("kanban"),
  columns: z
    .array(workspaceKanbanColumnSchema)
    .min(1)
    .max(WORKSPACE_KANBAN_COLUMN_LIMIT),
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
  blocks: z
    .array(workspaceBlockSchema)
    .max(WORKSPACE_TAB_BLOCK_LIMIT)
    .default([]),
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
  tabs: z
    .array(workspaceNodeTabSchema)
    .max(WORKSPACE_NODE_TAB_LIMIT)
    .default([]),
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
  items: z
    .array(workspaceMarketplaceItemSchema)
    .max(WORKSPACE_MARKETPLACE_ITEM_LIMIT)
    .default([]),
});

export type WorkspaceTaskPriority = z.infer<typeof workspaceTaskPrioritySchema>;
export type WorkspaceTaskDomain = z.infer<typeof workspaceTaskDomainSchema>;
export type WorkspaceTaskQuadrant = z.infer<typeof workspaceTaskQuadrantSchema>;
export type WorkspaceTask = z.infer<typeof workspaceTaskSchema>;
export type WorkspacePromptOutput = z.infer<typeof workspacePromptOutputSchema>;
export type WorkspaceDecisionItem = z.infer<typeof workspaceDecisionItemSchema>;
export type WorkspaceTrackerEntry = z.infer<typeof workspaceTrackerEntrySchema>;
export type WorkspaceTimeOrchestratorSettings = z.infer<
  typeof workspaceTimeOrchestratorSettingsSchema
>;
export type WorkspaceKanbanColumn = z.infer<typeof workspaceKanbanColumnSchema>;
export type WorkspaceKanbanCard = z.infer<typeof workspaceKanbanCardSchema>;
export type WorkspaceTimelineMilestoneStatus = z.infer<
  typeof workspaceTimelineMilestoneStatusSchema
>;
export type WorkspaceNodeTint = z.infer<typeof workspaceNodeTintSchema>;
export type WorkspaceTimelineMilestone = z.infer<
  typeof workspaceTimelineMilestoneSchema
>;
export type WorkspaceScorecardMetric = z.infer<
  typeof workspaceScorecardMetricSchema
>;
export type WorkspaceCustomFieldType = z.infer<
  typeof workspaceCustomFieldTypeSchema
>;
export type WorkspaceCustomBlockField = z.infer<
  typeof workspaceCustomBlockFieldSchema
>;
export type WorkspaceCustomBlockFormula = z.infer<
  typeof workspaceCustomBlockFormulaSchema
>;
export type WorkspaceCustomBlockTemplate = z.infer<
  typeof workspaceCustomBlockTemplateSchema
>;
export type WorkspaceTaskListBlock = z.infer<
  typeof workspaceTaskListBlockSchema
>;
export type WorkspaceNotesBlock = z.infer<typeof workspaceNotesBlockSchema>;
export type WorkspaceDecisionBlock = z.infer<
  typeof workspaceDecisionBlockSchema
>;
export type WorkspaceTrackerBlock = z.infer<typeof workspaceTrackerBlockSchema>;
export type WorkspaceAiPromptBlock = z.infer<
  typeof workspaceAiPromptBlockSchema
>;
export type WorkspaceTimeOrchestratorBlock = z.infer<
  typeof workspaceTimeOrchestratorBlockSchema
>;
export type WorkspaceKanbanBlock = z.infer<typeof workspaceKanbanBlockSchema>;
export type WorkspaceTimelineBlock = z.infer<
  typeof workspaceTimelineBlockSchema
>;
export type WorkspaceScorecardBlock = z.infer<
  typeof workspaceScorecardBlockSchema
>;
export type WorkspaceCustomBlock = z.infer<typeof workspaceCustomBlockSchema>;
export type WorkspaceBlock = z.infer<typeof workspaceBlockSchema>;
export type WorkspaceNodeTab = z.infer<typeof workspaceNodeTabSchema>;
export type WorkspaceNodeViewState = z.infer<
  typeof workspaceNodeViewStateSchema
>;
export type WorkspaceNodeDashboardFeaturedBlock = z.infer<
  typeof workspaceNodeDashboardFeaturedBlockSchema
>;
export type WorkspaceNodeDashboard = z.infer<typeof workspaceNodeDashboardSchema>;
export type WorkspaceNode = z.infer<typeof workspaceNodeSchema>;
export type WorkspaceSaveInput = z.infer<typeof workspaceSaveInputSchema>;
export type WorkspaceMarketplacePayload = z.infer<
  typeof workspaceMarketplacePayloadSchema
>;
export type WorkspaceMarketplaceItem = z.infer<
  typeof workspaceMarketplaceItemSchema
>;
export type WorkspaceMarketplaceSaveInput = z.infer<
  typeof workspaceMarketplaceSaveInputSchema
>;
export type WorkspaceCustomBlockValue = z.infer<
  typeof workspaceCustomBlockValueSchema
>;
export type WorkspaceNodeRecord = WorkspaceNode;

export type WorkspaceCollectedTask = {
  blockId: string;
  blockTitle: string;
  tabId: string;
  tabTitle: string;
  task: WorkspaceTask;
};

export type WorkspaceTimeOrchestratorDomainSummary = {
  domain: WorkspaceTaskDomain | null;
  label: string;
  count: number;
  estimateMinutes: number;
  tasks: WorkspaceCollectedTask[];
};

export type WorkspaceTimeOrchestratorQuadrantSummary = {
  key: WorkspaceTaskQuadrant;
  label: string;
  count: number;
  estimateMinutes: number;
  tasks: WorkspaceCollectedTask[];
};

export type WorkspaceTimeOrchestratorSummary = {
  overdue: WorkspaceCollectedTask[];
  upcoming: WorkspaceCollectedTask[];
  highPriority: WorkspaceCollectedTask[];
  suggestedNextActions: WorkspaceCollectedTask[];
  totalOpenTasks: number;
  totalEstimateMinutes: number;
  averageUrgency: number;
  averageImportance: number;
  domainBreakdown: WorkspaceTimeOrchestratorDomainSummary[];
  quadrants: Record<
    WorkspaceTaskQuadrant,
    WorkspaceTimeOrchestratorQuadrantSummary
  >;
};

export type WorkspaceTrackerTrend = {
  direction: "up" | "down" | "flat";
  delta: number;
  percentChange: number | null;
  points: number[];
};

export type WorkspaceDecisionSummary = {
  prosWeight: number;
  consWeight: number;
  totalScore: number;
  signal: "lean-yes" | "lean-no" | "balanced";
};

export type WorkspaceNodeDashboardSelectableBlock = {
  tabId: string;
  tabTitle: string;
  blockId: string;
  blockTitle: string;
  blockType: WorkspaceBlock["type"];
};

export type WorkspaceNodeDashboardDetailMetric = {
  label: string;
  value: string;
};

export type WorkspaceNodeDashboardDetail = {
  tabId: string;
  tabTitle: string;
  blockId: string;
  blockTitle: string;
  blockType: WorkspaceBlock["type"];
  summary: string;
  metrics: WorkspaceNodeDashboardDetailMetric[];
  highlights: string[];
};

function normalizeSelection<T extends string>(
  values: readonly T[] | undefined,
  allowed: readonly T[],
  fallback: readonly T[],
) {
  const selected = values === undefined ? fallback : values;
  const seen = new Set<T>();
  const result: T[] = [];

  for (const value of selected) {
    if (!allowed.includes(value) || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  if (result.length > 0 || values !== undefined) {
    return result;
  }

  return [...fallback];
}

function getNowIsoString() {
  return new Date().toISOString();
}

function getDueDateValue(value: string) {
  return new Date(`${value}T12:00:00`).getTime();
}

function getTodayValue(now = new Date()) {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0,
  ).getTime();
}

function trimToEmpty(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function truncateText(value: string, maxLength = 180) {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function getDisplayTabTitle(tab: WorkspaceNodeTab | null | undefined) {
  return tab?.title.trim() || "Untitled tab";
}

function getDisplayBlockTitle(block: WorkspaceBlock | null | undefined) {
  return block?.title.trim() || "Untitled block";
}

export function createWorkspaceId(prefix = "item") {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) {
    return `${prefix}-${randomUuid}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createWorkspaceTask(
  partial: Partial<WorkspaceTask> = {},
): WorkspaceTask {
  return workspaceTaskSchema.parse({
    id: partial.id ?? createWorkspaceId("task"),
    text: partial.text ?? "New task",
    completed: partial.completed ?? false,
    dueDate: partial.dueDate ?? null,
    priority: partial.priority ?? "medium",
    domain: partial.domain ?? null,
    urgency: partial.urgency ?? 5,
    importance: partial.importance ?? 5,
    estimateMinutes: partial.estimateMinutes ?? 30,
  });
}

export function createWorkspaceTimeOrchestratorSettings(
  partial: Partial<WorkspaceTimeOrchestratorSettings> = {},
): WorkspaceTimeOrchestratorSettings {
  return workspaceTimeOrchestratorSettingsSchema.parse({
    domains: normalizeSelection(
      partial.domains,
      WORKSPACE_TASK_DOMAINS,
      WORKSPACE_TASK_DOMAINS,
    ),
    includeUnassigned: partial.includeUnassigned ?? true,
    quadrants: normalizeSelection(
      partial.quadrants,
      WORKSPACE_TASK_QUADRANTS,
      WORKSPACE_TASK_QUADRANTS,
    ),
  });
}

export function createWorkspaceKanbanColumn(
  partial: Partial<WorkspaceKanbanColumn> = {},
): WorkspaceKanbanColumn {
  return workspaceKanbanColumnSchema.parse({
    id: partial.id ?? createWorkspaceId("column"),
    title: partial.title ?? "New column",
  });
}

export function createWorkspaceKanbanCard(
  partial: Partial<WorkspaceKanbanCard> & { columnId: string },
): WorkspaceKanbanCard {
  return workspaceKanbanCardSchema.parse({
    id: partial.id ?? createWorkspaceId("card"),
    title: partial.title ?? "New card",
    description: partial.description ?? "",
    columnId: partial.columnId,
    assignee: partial.assignee ?? "",
    dueDate: partial.dueDate ?? null,
  });
}

export function createWorkspaceTimelineMilestone(
  partial: Partial<WorkspaceTimelineMilestone> = {},
): WorkspaceTimelineMilestone {
  return workspaceTimelineMilestoneSchema.parse({
    id: partial.id ?? createWorkspaceId("milestone"),
    title: partial.title ?? "Milestone",
    date: partial.date ?? null,
    status: partial.status ?? "planned",
    note: partial.note ?? "",
  });
}

export function createWorkspaceScorecardMetric(
  partial: Partial<WorkspaceScorecardMetric> = {},
): WorkspaceScorecardMetric {
  return workspaceScorecardMetricSchema.parse({
    id: partial.id ?? createWorkspaceId("metric"),
    label: partial.label ?? "Metric",
    value: partial.value ?? 0,
    target: partial.target ?? 100,
    unit: partial.unit ?? "",
  });
}

export function createWorkspaceTaskListBlock(
  partial: Partial<WorkspaceTaskListBlock> = {},
): WorkspaceTaskListBlock {
  const timestamp = getNowIsoString();

  return workspaceTaskListBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "task-list",
    title: partial.title ?? "Task list",
    tasks: partial.tasks ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceNotesBlock(
  partial: Partial<WorkspaceNotesBlock> = {},
): WorkspaceNotesBlock {
  const timestamp = getNowIsoString();

  return workspaceNotesBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "notes",
    title: partial.title ?? "Notes",
    body: partial.body ?? "",
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceDecisionBlock(
  partial: Partial<WorkspaceDecisionBlock> = {},
): WorkspaceDecisionBlock {
  const timestamp = getNowIsoString();

  return workspaceDecisionBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "decision",
    title: partial.title ?? "Decision",
    pros: partial.pros ?? [],
    cons: partial.cons ?? [],
    recommendation: partial.recommendation ?? "",
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTrackerBlock(
  partial: Partial<WorkspaceTrackerBlock> = {},
): WorkspaceTrackerBlock {
  const timestamp = getNowIsoString();

  return workspaceTrackerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "tracker",
    title: partial.title ?? "Tracker",
    entries: partial.entries ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceAiPromptBlock(
  partial: Partial<WorkspaceAiPromptBlock> = {},
): WorkspaceAiPromptBlock {
  const timestamp = getNowIsoString();

  return workspaceAiPromptBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "ai-prompt",
    title: partial.title ?? "Prompt",
    prompt: partial.prompt ?? "",
    latestOutput: partial.latestOutput ?? "",
    outputHistory: partial.outputHistory ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTimeOrchestratorBlock(
  partial: Partial<WorkspaceTimeOrchestratorBlock> = {},
): WorkspaceTimeOrchestratorBlock {
  const timestamp = getNowIsoString();

  return workspaceTimeOrchestratorBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "time-orchestrator",
    title: partial.title ?? "Time orchestrator",
    settings: createWorkspaceTimeOrchestratorSettings(partial.settings),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceKanbanBlock(
  partial: Partial<WorkspaceKanbanBlock> = {},
): WorkspaceKanbanBlock {
  const timestamp = getNowIsoString();
  const columns =
    partial.columns && partial.columns.length > 0
      ? partial.columns
      : [
          createWorkspaceKanbanColumn({ title: "Backlog" }),
          createWorkspaceKanbanColumn({ title: "In progress" }),
          createWorkspaceKanbanColumn({ title: "Done" }),
        ];

  return workspaceKanbanBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "kanban",
    title: partial.title ?? "Kanban board",
    columns,
    cards: partial.cards ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTimelineBlock(
  partial: Partial<WorkspaceTimelineBlock> = {},
): WorkspaceTimelineBlock {
  const timestamp = getNowIsoString();

  return workspaceTimelineBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "timeline",
    title: partial.title ?? "Timeline",
    milestones: partial.milestones ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceScorecardBlock(
  partial: Partial<WorkspaceScorecardBlock> = {},
): WorkspaceScorecardBlock {
  const timestamp = getNowIsoString();

  return workspaceScorecardBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "scorecard",
    title: partial.title ?? "Scorecard",
    metrics: partial.metrics ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceCustomBlockTemplate(
  partial: Partial<WorkspaceCustomBlockTemplate> & {
    fields: WorkspaceCustomBlockField[];
    name: string;
  },
): WorkspaceCustomBlockTemplate {
  const timestamp = getNowIsoString();

  return workspaceCustomBlockTemplateSchema.parse({
    id: partial.id ?? createWorkspaceId("template"),
    name: partial.name,
    fields: partial.fields,
    includeNotes: partial.includeNotes ?? false,
    formula: partial.formula ?? null,
    aiPromptTemplate: partial.aiPromptTemplate ?? null,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceCustomBlock(
  template: WorkspaceCustomBlockTemplate,
  partial: Partial<WorkspaceCustomBlock> = {},
): WorkspaceCustomBlock {
  const timestamp = getNowIsoString();
  const values =
    partial.values ??
    Object.fromEntries(
      template.fields.map((field) => [
        field.key,
        field.type === "checkbox" ? false : field.type === "number" ? 0 : "",
      ]),
    );

  return workspaceCustomBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "custom",
    title: partial.title ?? template.name,
    definitionId: partial.definitionId ?? template.id,
    values,
    notes: partial.notes ?? "",
    latestAiOutput: partial.latestAiOutput ?? "",
    outputHistory: partial.outputHistory ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceNodeTab(
  partial: Partial<WorkspaceNodeTab> = {},
): WorkspaceNodeTab {
  const timestamp = getNowIsoString();

  return workspaceNodeTabSchema.parse({
    id: partial.id ?? createWorkspaceId("tab"),
    title: partial.title ?? "New tab",
    blocks: partial.blocks ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceNodeViewState(
  partial: Partial<WorkspaceNodeViewState> = {},
): WorkspaceNodeViewState {
  return workspaceNodeViewStateSchema.parse({
    activeTabId: partial.activeTabId ?? null,
    notePreviewState: partial.notePreviewState ?? {},
  });
}

export function createWorkspaceNodeDashboard(
  partial: Partial<WorkspaceNodeDashboard> = {},
): WorkspaceNodeDashboard {
  return workspaceNodeDashboardSchema.parse({
    tint: partial.tint ?? "neutral",
    featuredBlocks: partial.featuredBlocks ?? [],
  });
}

export function createWorkspaceNode(
  partial: Partial<WorkspaceNode> & {
    title: string;
  },
): WorkspaceNode {
  const timestamp = getNowIsoString();
  const content = partial.content ?? "";

  return normalizeWorkspaceNode({
    id: partial.id ?? createWorkspaceId("node"),
    title: partial.title,
    content,
    label: partial.label ?? partial.title,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? DEFAULT_WORKSPACE_NODE_WIDTH,
    height: partial.height ?? DEFAULT_WORKSPACE_NODE_HEIGHT,
    minWidth: partial.minWidth ?? DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
    minHeight: partial.minHeight ?? DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
    tabs: partial.tabs ?? [createDefaultWorkspaceTab("Overview", content)],
    customBlockTemplates: partial.customBlockTemplates ?? [],
    viewState: partial.viewState ?? {
      activeTabId: partial.tabs?.[0]?.id ?? null,
      notePreviewState: {},
    },
    dashboard: partial.dashboard ?? {
      tint: "neutral",
      featuredBlocks: [],
    },
  });
}

export function createDefaultWorkspaceTab(title = "Overview", body = "") {
  return createWorkspaceNodeTab({
    title,
    blocks: [createWorkspaceNotesBlock({ title: "Notes", body })],
  });
}

function normalizeWorkspaceKanbanBlock(
  block:
    | WorkspaceKanbanBlock
    | (Partial<WorkspaceKanbanBlock> & { type: "kanban" }),
) {
  const columns =
    block.columns && block.columns.length > 0
      ? block.columns.map((column) => workspaceKanbanColumnSchema.parse(column))
      : createWorkspaceKanbanBlock().columns;
  const fallbackColumnId = columns[0]!.id;
  const validColumnIds = new Set(columns.map((column) => column.id));

  return workspaceKanbanBlockSchema.parse({
    ...block,
    columns,
    cards: (block.cards ?? []).map((card) => ({
      ...card,
      columnId: validColumnIds.has(card.columnId)
        ? card.columnId
        : fallbackColumnId,
    })),
  });
}

export function normalizeWorkspaceNodeTab(
  tab: WorkspaceNodeTab,
): WorkspaceNodeTab {
  const parsed = workspaceNodeTabSchema.parse({
    ...tab,
    blocks: tab.blocks ?? [],
  });

  return {
    ...parsed,
    blocks: parsed.blocks.map((block) => normalizeWorkspaceBlock(block)),
  };
}

export function normalizeWorkspaceBlock(block: WorkspaceBlock): WorkspaceBlock {
  switch (block.type) {
    case "task-list":
      return workspaceTaskListBlockSchema.parse({
        ...block,
        tasks: block.tasks ?? [],
      });
    case "notes":
      return workspaceNotesBlockSchema.parse({
        ...block,
        body: block.body ?? "",
      });
    case "decision":
      return workspaceDecisionBlockSchema.parse({
        ...block,
        pros: block.pros ?? [],
        cons: block.cons ?? [],
        recommendation: block.recommendation ?? "",
      });
    case "tracker":
      return workspaceTrackerBlockSchema.parse({
        ...block,
        entries: block.entries ?? [],
      });
    case "ai-prompt":
      return workspaceAiPromptBlockSchema.parse({
        ...block,
        prompt: block.prompt ?? "",
        latestOutput: block.latestOutput ?? "",
        outputHistory: block.outputHistory ?? [],
      });
    case "time-orchestrator":
      return workspaceTimeOrchestratorBlockSchema.parse({
        ...block,
        settings: createWorkspaceTimeOrchestratorSettings(block.settings),
      });
    case "kanban":
      return normalizeWorkspaceKanbanBlock(block);
    case "timeline":
      return workspaceTimelineBlockSchema.parse({
        ...block,
        milestones: block.milestones ?? [],
      });
    case "scorecard":
      return workspaceScorecardBlockSchema.parse({
        ...block,
        metrics: block.metrics ?? [],
      });
    case "custom":
      return workspaceCustomBlockSchema.parse({
        ...block,
        values: block.values ?? {},
        notes: block.notes ?? "",
        latestAiOutput: block.latestAiOutput ?? "",
        outputHistory: block.outputHistory ?? [],
      });
  }
}

export function normalizeWorkspaceNode(node: WorkspaceNode): WorkspaceNode {
  const parsed = workspaceNodeSchema.parse({
    ...node,
    content: node.content ?? "",
    tabs: node.tabs ?? [],
    customBlockTemplates: node.customBlockTemplates ?? [],
    viewState: node.viewState ?? {},
    dashboard: node.dashboard ?? {},
  });

  const tabs =
    parsed.tabs.length > 0
      ? parsed.tabs.map((tab) => normalizeWorkspaceNodeTab(tab))
      : [createDefaultWorkspaceTab("Overview", parsed.content)];
  const validTabIds = new Set(tabs.map((tab) => tab.id));
  const noteBlockIds = new Set(
    tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => (block.type === "notes" ? [block.id] : [])),
    ),
  );
  const activeTabId =
    parsed.viewState.activeTabId &&
    validTabIds.has(parsed.viewState.activeTabId)
      ? parsed.viewState.activeTabId
      : (tabs[0]?.id ?? null);
  const notePreviewState = Object.fromEntries(
    Object.entries(parsed.viewState.notePreviewState ?? {}).filter(
      ([blockId]) => noteBlockIds.has(blockId),
    ),
  );
  const featuredBlocks = parsed.dashboard.featuredBlocks.filter(({ tabId, blockId }) =>
    tabs.some(
      (tab) =>
        tab.id === tabId && tab.blocks.some((block) => block.id === blockId),
    ),
  );

  return {
    ...parsed,
    label: parsed.label ?? parsed.title,
    minWidth: parsed.minWidth ?? DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
    minHeight: parsed.minHeight ?? DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
    tabs,
    customBlockTemplates: parsed.customBlockTemplates.map((template) =>
      workspaceCustomBlockTemplateSchema.parse({
        ...template,
        includeNotes: template.includeNotes ?? false,
        formula: template.formula ?? null,
        aiPromptTemplate: template.aiPromptTemplate ?? null,
      }),
    ),
    viewState: createWorkspaceNodeViewState({
      activeTabId,
      notePreviewState,
    }),
    dashboard: createWorkspaceNodeDashboard({
      tint: parsed.dashboard.tint,
      featuredBlocks,
    }),
  };
}

export function cloneWorkspaceNodes(nodes: WorkspaceNode[]) {
  let cloned: WorkspaceNode[];

  try {
    cloned =
      typeof structuredClone === "function"
        ? structuredClone(nodes)
        : JSON.parse(JSON.stringify(nodes));
  } catch {
    // Vue reactive proxies cannot be passed to structuredClone in the browser.
    cloned = JSON.parse(JSON.stringify(nodes));
  }

  return cloned.map((node: WorkspaceNode) => normalizeWorkspaceNode(node));
}

function clonePromptOutputsForInsertion(outputs: WorkspacePromptOutput[]) {
  return outputs.map((entry) => ({
    ...entry,
    id: createWorkspaceId("output"),
  }));
}

export function cloneWorkspaceTemplatesForInsertion(
  templates: WorkspaceCustomBlockTemplate[],
  timestamp = getNowIsoString(),
) {
  const templateIdMap = new Map<string, string>();
  const clonedTemplates = templates.map((template) => {
    const nextTemplateId = createWorkspaceId("template");
    templateIdMap.set(template.id, nextTemplateId);

    return workspaceCustomBlockTemplateSchema.parse({
      ...template,
      id: nextTemplateId,
      fields: template.fields.map((field) => ({
        ...field,
        id: createWorkspaceId("field"),
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  return {
    templateIdMap,
    templates: clonedTemplates,
  };
}

export function cloneWorkspaceBlockForInsertion(
  block: WorkspaceBlock,
  templateIdMap = new Map<string, string>(),
  timestamp = getNowIsoString(),
): WorkspaceBlock {
  switch (block.type) {
    case "task-list":
      return workspaceTaskListBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        tasks: block.tasks.map((task) => ({
          ...task,
          id: createWorkspaceId("task"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "notes":
      return workspaceNotesBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "decision":
      return workspaceDecisionBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        pros: block.pros.map((item) => ({
          ...item,
          id: createWorkspaceId("decision"),
        })),
        cons: block.cons.map((item) => ({
          ...item,
          id: createWorkspaceId("decision"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "tracker":
      return workspaceTrackerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        entries: block.entries.map((entry) => ({
          ...entry,
          id: createWorkspaceId("entry"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "ai-prompt":
      return workspaceAiPromptBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        outputHistory: clonePromptOutputsForInsertion(block.outputHistory),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "time-orchestrator":
      return workspaceTimeOrchestratorBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        settings: createWorkspaceTimeOrchestratorSettings(block.settings),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "kanban": {
      const columnIdMap = new Map<string, string>();
      const columns = block.columns.map((column) => {
        const nextColumnId = createWorkspaceId("column");
        columnIdMap.set(column.id, nextColumnId);

        return workspaceKanbanColumnSchema.parse({
          ...column,
          id: nextColumnId,
        });
      });
      const fallbackColumnId = columns[0]?.id ?? createWorkspaceId("column");

      return workspaceKanbanBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        columns,
        cards: block.cards.map((card) => ({
          ...card,
          id: createWorkspaceId("card"),
          columnId: columnIdMap.get(card.columnId) ?? fallbackColumnId,
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    case "timeline":
      return workspaceTimelineBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        milestones: block.milestones.map((milestone) => ({
          ...milestone,
          id: createWorkspaceId("milestone"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "scorecard":
      return workspaceScorecardBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        metrics: block.metrics.map((metric) => ({
          ...metric,
          id: createWorkspaceId("metric"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "custom":
      return workspaceCustomBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        definitionId:
          templateIdMap.get(block.definitionId) ?? block.definitionId,
        outputHistory: clonePromptOutputsForInsertion(block.outputHistory),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
  }
}

export function cloneWorkspaceTabForInsertion(
  tab: WorkspaceNodeTab,
  templateIdMap = new Map<string, string>(),
  timestamp = getNowIsoString(),
): WorkspaceNodeTab {
  return workspaceNodeTabSchema.parse({
    ...tab,
    id: createWorkspaceId("tab"),
    blocks: tab.blocks.map((block) =>
      cloneWorkspaceBlockForInsertion(block, templateIdMap, timestamp),
    ),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function cloneWorkspaceNodeForInsertion(
  node: WorkspaceNode,
  timestamp = getNowIsoString(),
): WorkspaceNode {
  const { templateIdMap, templates } = cloneWorkspaceTemplatesForInsertion(
    node.customBlockTemplates,
    timestamp,
  );
  const tabIdMap = new Map<string, string>();
  const blockIdMap = new Map<string, string>();
  const tabs = node.tabs.map((tab) => {
    const clonedTab = cloneWorkspaceTabForInsertion(
      tab,
      templateIdMap,
      timestamp,
    );
    tabIdMap.set(tab.id, clonedTab.id);
    tab.blocks.forEach((block, index) => {
      const clonedBlockId = clonedTab.blocks[index]?.id;

      if (clonedBlockId) {
        blockIdMap.set(block.id, clonedBlockId);
      }
    });
    return clonedTab;
  });
  const activeTabId =
    node.viewState.activeTabId && tabIdMap.has(node.viewState.activeTabId)
      ? (tabIdMap.get(node.viewState.activeTabId) ?? tabs[0]?.id ?? null)
      : (tabs[0]?.id ?? null);
  const featuredBlocks = node.dashboard.featuredBlocks.flatMap((selection) => {
    const nextTabId = tabIdMap.get(selection.tabId);
    const nextBlockId = blockIdMap.get(selection.blockId);

    if (!nextTabId || !nextBlockId) {
      return [];
    }

    return [
      {
        tabId: nextTabId,
        blockId: nextBlockId,
      },
    ];
  });

  return normalizeWorkspaceNode({
    ...node,
    id: createWorkspaceId("node"),
    createdAt: timestamp,
    updatedAt: timestamp,
    label: node.title,
    tabs,
    customBlockTemplates: templates,
    viewState: {
      activeTabId,
      notePreviewState: {},
    },
    dashboard: {
      tint: node.dashboard.tint,
      featuredBlocks,
    },
  });
}

export function getTaskListProgress(block: WorkspaceTaskListBlock) {
  const total = block.tasks.length;
  const completed = block.tasks.filter((task) => task.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    percent,
  };
}

export function collectWorkspaceNodeTasks(node: WorkspaceNode) {
  return node.tabs.flatMap((tab) =>
    tab.blocks.flatMap((block) => {
      if (block.type !== "task-list") {
        return [];
      }

      return block.tasks.map(
        (task) =>
          ({
            blockId: block.id,
            blockTitle: block.title,
            tabId: tab.id,
            tabTitle: tab.title,
            task,
          }) satisfies WorkspaceCollectedTask,
      );
    }),
  );
}

function getPriorityScore(priority: WorkspaceTaskPriority | null | undefined) {
  switch (priority) {
    case "high":
      return 12;
    case "medium":
      return 7;
    case "low":
      return 3;
    default:
      return 0;
  }
}

export function getWorkspaceTaskDomainLabel(
  domain: WorkspaceTaskDomain | null | undefined,
) {
  switch (domain) {
    case "strategy":
      return "Strategy";
    case "people":
      return "People";
    case "sales":
      return "Sales";
    case "content":
      return "Content";
    case "brand":
      return "Brand";
    case "finance":
      return "Finance";
    case "education":
      return "Education";
    case "orchestrator":
      return "Orchestrator";
    default:
      return "Unassigned";
  }
}

export function getWorkspaceTaskQuadrantLabel(quadrant: WorkspaceTaskQuadrant) {
  switch (quadrant) {
    case "do":
      return "Do first";
    case "schedule":
      return "Schedule";
    case "delegate":
      return "Delegate";
    case "eliminate":
      return "Eliminate";
  }
}

export function getWorkspaceTaskQuadrant(
  task: WorkspaceTask,
): WorkspaceTaskQuadrant {
  const highUrgency = task.urgency >= 7;
  const highImportance = task.importance >= 7;

  if (highUrgency && highImportance) {
    return "do";
  }

  if (highImportance) {
    return "schedule";
  }

  if (highUrgency) {
    return "delegate";
  }

  return "eliminate";
}

function getTaskEstimatePenalty(task: WorkspaceTask) {
  return Math.min(task.estimateMinutes / 30, 12);
}

function getTaskUrgencyScore(task: WorkspaceTask, now = new Date()) {
  if (task.completed) {
    return Number.NEGATIVE_INFINITY;
  }

  const baseScore =
    getPriorityScore(task.priority) +
    task.urgency * 4 +
    task.importance * 3 -
    getTaskEstimatePenalty(task);

  if (!task.dueDate) {
    return baseScore;
  }

  const todayValue = getTodayValue(now);
  const dueDateValue = getDueDateValue(task.dueDate);
  const dayDelta = Math.round((dueDateValue - todayValue) / 86_400_000);

  if (dayDelta < 0) {
    return baseScore + Math.abs(dayDelta) * 8 + 18;
  }

  if (dayDelta === 0) {
    return baseScore + 16;
  }

  if (dayDelta <= 3) {
    return baseScore + (4 - dayDelta) * 5;
  }

  if (dayDelta <= 7) {
    return baseScore + 2;
  }

  return baseScore;
}

export function getTimeOrchestratorSummary(
  node: WorkspaceNode,
  settings: Partial<WorkspaceTimeOrchestratorSettings> = {},
  now = new Date(),
): WorkspaceTimeOrchestratorSummary {
  const resolvedSettings = createWorkspaceTimeOrchestratorSettings(settings);
  const tasks = collectWorkspaceNodeTasks(node).filter(({ task }) => {
    if (task.completed) {
      return false;
    }

    const domainAllowed = task.domain
      ? resolvedSettings.domains.includes(task.domain)
      : resolvedSettings.includeUnassigned;
    const quadrantAllowed = resolvedSettings.quadrants.includes(
      getWorkspaceTaskQuadrant(task),
    );

    return domainAllowed && quadrantAllowed;
  });
  const todayValue = getTodayValue(now);
  const totalEstimateMinutes = tasks.reduce(
    (sum, { task }) => sum + task.estimateMinutes,
    0,
  );
  const averageUrgency =
    tasks.length === 0
      ? 0
      : Number(
          (
            tasks.reduce((sum, { task }) => sum + task.urgency, 0) /
            tasks.length
          ).toFixed(1),
        );
  const averageImportance =
    tasks.length === 0
      ? 0
      : Number(
          (
            tasks.reduce((sum, { task }) => sum + task.importance, 0) /
            tasks.length
          ).toFixed(1),
        );

  const overdue = tasks
    .filter(
      ({ task }) => task.dueDate && getDueDateValue(task.dueDate) < todayValue,
    )
    .sort(
      (left, right) =>
        getDueDateValue(left.task.dueDate!) -
        getDueDateValue(right.task.dueDate!),
    );

  const upcoming = tasks
    .filter(({ task }) => {
      if (!task.dueDate) {
        return false;
      }

      const value = getDueDateValue(task.dueDate);
      const dayDelta = Math.round((value - todayValue) / 86_400_000);

      return dayDelta >= 0 && dayDelta <= 7;
    })
    .sort(
      (left, right) =>
        getDueDateValue(left.task.dueDate!) -
        getDueDateValue(right.task.dueDate!),
    );

  const highPriority = tasks.filter(
    ({ task }) =>
      task.priority === "high" || task.urgency >= 8 || task.importance >= 8,
  );
  const suggestedNextActions = [...tasks]
    .sort(
      (left, right) =>
        getTaskUrgencyScore(right.task, now) -
        getTaskUrgencyScore(left.task, now),
    )
    .slice(0, 5);
  const quadrants = {
    do: {
      key: "do",
      label: getWorkspaceTaskQuadrantLabel("do"),
      count: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceCollectedTask[],
    },
    schedule: {
      key: "schedule",
      label: getWorkspaceTaskQuadrantLabel("schedule"),
      count: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceCollectedTask[],
    },
    delegate: {
      key: "delegate",
      label: getWorkspaceTaskQuadrantLabel("delegate"),
      count: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceCollectedTask[],
    },
    eliminate: {
      key: "eliminate",
      label: getWorkspaceTaskQuadrantLabel("eliminate"),
      count: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceCollectedTask[],
    },
  } satisfies Record<
    WorkspaceTaskQuadrant,
    WorkspaceTimeOrchestratorQuadrantSummary
  >;

  for (const item of tasks) {
    const quadrant = quadrants[getWorkspaceTaskQuadrant(item.task)];
    quadrant.count += 1;
    quadrant.estimateMinutes += item.task.estimateMinutes;
    quadrant.tasks.push(item);
  }

  for (const quadrant of Object.values(quadrants)) {
    quadrant.tasks.sort(
      (left, right) =>
        getTaskUrgencyScore(right.task, now) -
        getTaskUrgencyScore(left.task, now),
    );
  }

  const domainGroups = new Map<
    WorkspaceTaskDomain | null,
    WorkspaceTimeOrchestratorDomainSummary
  >();

  for (const item of tasks) {
    const key = item.task.domain ?? null;
    const existing = domainGroups.get(key);

    if (existing) {
      existing.count += 1;
      existing.estimateMinutes += item.task.estimateMinutes;
      existing.tasks.push(item);
      continue;
    }

    domainGroups.set(key, {
      domain: key,
      label: getWorkspaceTaskDomainLabel(key),
      count: 1,
      estimateMinutes: item.task.estimateMinutes,
      tasks: [item],
    });
  }

  const domainBreakdown = [...domainGroups.values()].sort(
    (left, right) =>
      right.estimateMinutes - left.estimateMinutes || right.count - left.count,
  );

  return {
    overdue,
    upcoming,
    highPriority,
    suggestedNextActions,
    totalOpenTasks: tasks.length,
    totalEstimateMinutes,
    averageUrgency,
    averageImportance,
    domainBreakdown,
    quadrants,
  };
}

export function getWorkspaceNodePreview(node: WorkspaceNode, maxLength = 180) {
  const summary = trimToEmpty(node.content);

  if (summary) {
    return truncateText(summary, maxLength);
  }

  for (const tab of node.tabs) {
    for (const block of tab.blocks) {
      if (block.type === "notes" && trimToEmpty(block.body)) {
        return truncateText(block.body, maxLength);
      }

      if (block.type === "task-list" && block.tasks.length > 0) {
        const remaining = block.tasks.filter((task) => !task.completed).length;

        return truncateText(
          `${block.title}: ${remaining} remaining of ${block.tasks.length} tasks.`,
          maxLength,
        );
      }

      if (block.type === "decision" && trimToEmpty(block.recommendation)) {
        return truncateText(block.recommendation, maxLength);
      }

      if (block.type === "kanban" && block.cards.length > 0) {
        return truncateText(
          `${block.title}: ${block.cards.length} cards across ${block.columns.length} columns.`,
          maxLength,
        );
      }

      if (block.type === "timeline" && block.milestones.length > 0) {
        return truncateText(
          `${block.title}: ${block.milestones.length} milestones tracked.`,
          maxLength,
        );
      }

      if (block.type === "scorecard" && block.metrics.length > 0) {
        return truncateText(
          `${block.title}: ${block.metrics.length} metrics being tracked.`,
          maxLength,
        );
      }
    }
  }

  return "Open the node to add tabs, blocks, and working context.";
}

export function getWorkspaceNodeStats(node: WorkspaceNode) {
  const tabsCount = node.tabs.length;
  const blocksCount = node.tabs.reduce(
    (count, tab) => count + tab.blocks.length,
    0,
  );
  const tasks = collectWorkspaceNodeTasks(node);
  const completedTasks = tasks.filter(({ task }) => task.completed).length;
  const overdueTasks = getTimeOrchestratorSummary(node).overdue.length;

  return {
    tabsCount,
    blocksCount,
    totalTasks: tasks.length,
    completedTasks,
    overdueTasks,
  };
}

function formatDashboardTaskLine(task: WorkspaceTask) {
  const fragments: string[] = [];

  if (task.domain) {
    fragments.push(getWorkspaceTaskDomainLabel(task.domain));
  }

  if (task.priority) {
    fragments.push(`${task.priority} priority`);
  }

  if (task.dueDate) {
    fragments.push(`due ${task.dueDate}`);
  }

  return fragments.length > 0
    ? `${task.text} (${fragments.join(", ")})`
    : task.text;
}

function getTimelineMilestoneSortValue(milestone: WorkspaceTimelineMilestone) {
  return milestone.date ? getDueDateValue(milestone.date) : Number.MAX_SAFE_INTEGER;
}

function isScorecardMetricOnTarget(metric: WorkspaceScorecardMetric) {
  return metric.target >= 0 ? metric.value >= metric.target : metric.value <= metric.target;
}

function buildWorkspaceNodeDashboardDetail(
  node: WorkspaceNode,
  tab: WorkspaceNodeTab,
  block: WorkspaceBlock,
): WorkspaceNodeDashboardDetail {
  if (block.type === "task-list") {
    const completedTasks = block.tasks.filter((task) => task.completed).length;
    const openTasks = block.tasks.filter((task) => !task.completed);
    const overdueTasks = openTasks.filter(
      (task) => task.dueDate && getDueDateValue(task.dueDate) < getTodayValue(),
    ).length;

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        block.tasks.length > 0
          ? `${openTasks.length} open tasks out of ${block.tasks.length}.`
          : "No tasks added yet.",
      metrics: [
        {
          label: "Done",
          value: `${completedTasks}/${block.tasks.length}`,
        },
        {
          label: "Open",
          value: String(openTasks.length),
        },
        ...(overdueTasks > 0
          ? [
              {
                label: "Overdue",
                value: String(overdueTasks),
              },
            ]
          : []),
      ],
      highlights: openTasks.slice(0, 2).map((task) => formatDashboardTaskLine(task)),
    };
  }

  if (block.type === "notes") {
    const lines = block.body
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: lines[0]
        ? truncateText(lines[0], 110)
        : "No notes captured yet.",
      metrics: [
        {
          label: "Lines",
          value: String(lines.length),
        },
      ],
      highlights: lines.slice(1, 3).map((line) => truncateText(line, 110)),
    };
  }

  if (block.type === "decision") {
    const summary = getDecisionSummary(block);
    const recommendation = trimToEmpty(block.recommendation);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        recommendation ||
        `Decision signal is ${summary.signal.replace("-", " ")} with score ${summary.totalScore}.`,
      metrics: [
        {
          label: "Score",
          value: String(summary.totalScore),
        },
        {
          label: "Pros",
          value: String(block.pros.length),
        },
        {
          label: "Cons",
          value: String(block.cons.length),
        },
      ],
      highlights: [
        ...block.pros.slice(0, 1).map((item) => `Upside: ${truncateText(item.text, 90)}`),
        ...block.cons.slice(0, 1).map((item) => `Risk: ${truncateText(item.text, 90)}`),
      ],
    };
  }

  if (block.type === "tracker") {
    const trend = getTrackerTrend(block);
    const latestEntry = block.entries[block.entries.length - 1];
    const trendLabel =
      trend.direction === "flat"
        ? "Flat"
        : `${trend.direction === "up" ? "+" : ""}${trend.delta}`;

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: latestEntry
        ? `${latestEntry.label || "Latest value"} is ${latestEntry.value}.`
        : "No tracker entries yet.",
      metrics: [
        {
          label: "Entries",
          value: String(block.entries.length),
        },
        ...(latestEntry
          ? [
              {
                label: "Trend",
                value: trendLabel,
              },
            ]
          : []),
      ],
      highlights: block.entries
        .slice(-2)
        .reverse()
        .map((entry) => `${entry.label || "Entry"}: ${entry.value}`),
    };
  }

  if (block.type === "ai-prompt") {
    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: trimToEmpty(block.prompt)
        ? truncateText(block.prompt, 110)
        : "Prompt not configured yet.",
      metrics: [
        {
          label: "Runs",
          value: String(block.outputHistory.length),
        },
        {
          label: "Output",
          value: trimToEmpty(block.latestOutput) ? "Saved" : "Empty",
        },
      ],
      highlights: trimToEmpty(block.latestOutput)
        ? [truncateText(block.latestOutput, 110)]
        : [],
    };
  }

  if (block.type === "time-orchestrator") {
    const orchestration = getTimeOrchestratorSummary(node, block.settings);
    const estimateHours = Number((orchestration.totalEstimateMinutes / 60).toFixed(1));

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        orchestration.totalOpenTasks > 0
          ? `${orchestration.suggestedNextActions.length} suggested next actions across ${orchestration.totalOpenTasks} open tasks.`
          : "No open tasks match the current orchestration filters.",
      metrics: [
        {
          label: "Open",
          value: String(orchestration.totalOpenTasks),
        },
        {
          label: "Estimate",
          value: `${estimateHours}h`,
        },
        {
          label: "Overdue",
          value: String(orchestration.overdue.length),
        },
      ],
      highlights: orchestration.suggestedNextActions
        .slice(0, 2)
        .map(({ task }) => formatDashboardTaskLine(task)),
    };
  }

  if (block.type === "kanban") {
    const cardsByColumn = block.columns.map((column) => ({
      title: column.title.trim() || "Untitled column",
      count: block.cards.filter((card) => card.columnId === column.id).length,
    }));

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        block.cards.length > 0
          ? `${block.cards.length} cards across ${block.columns.length} columns.`
          : "No cards on the board yet.",
      metrics: [
        {
          label: "Cards",
          value: String(block.cards.length),
        },
        {
          label: "Columns",
          value: String(block.columns.length),
        },
      ],
      highlights: cardsByColumn
        .filter((entry) => entry.count > 0)
        .slice(0, 3)
        .map((entry) => `${entry.title}: ${entry.count}`),
    };
  }

  if (block.type === "timeline") {
    const sortedMilestones = [...block.milestones].sort(
      (left, right) =>
        getTimelineMilestoneSortValue(left) - getTimelineMilestoneSortValue(right),
    );
    const nextMilestone = sortedMilestones.find(
      (milestone) => milestone.status !== "done",
    );
    const doneCount = block.milestones.filter(
      (milestone) => milestone.status === "done",
    ).length;
    const activeCount = block.milestones.filter(
      (milestone) => milestone.status === "active",
    ).length;

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: nextMilestone
        ? `Next milestone is ${nextMilestone.title}${nextMilestone.date ? ` on ${nextMilestone.date}` : ""}.`
        : block.milestones.length > 0
          ? "All milestones are marked done."
          : "No milestones planned yet.",
      metrics: [
        {
          label: "Milestones",
          value: String(block.milestones.length),
        },
        {
          label: "Done",
          value: String(doneCount),
        },
        {
          label: "Active",
          value: String(activeCount),
        },
      ],
      highlights: sortedMilestones
        .slice(0, 2)
        .map(
          (milestone) =>
            `${milestone.title}${milestone.date ? ` (${milestone.date})` : ""}`,
        ),
    };
  }

  if (block.type === "scorecard") {
    const onTargetCount = block.metrics.filter((metric) =>
      isScorecardMetricOnTarget(metric),
    ).length;

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        block.metrics.length > 0
          ? `${onTargetCount} of ${block.metrics.length} metrics are on target.`
          : "No scorecard metrics tracked yet.",
      metrics: [
        {
          label: "Metrics",
          value: String(block.metrics.length),
        },
        {
          label: "On target",
          value: String(onTargetCount),
        },
      ],
      highlights: block.metrics
        .slice(0, 2)
        .map(
          (metric) =>
            `${metric.label}: ${metric.value}/${metric.target}${metric.unit ? ` ${metric.unit}` : ""}`,
        ),
    };
  }

  const template = node.customBlockTemplates.find(
    (entry) => entry.id === block.definitionId,
  );
  const formulaResult = evaluateCustomBlockFormula(template?.formula?.expression, block.values);
  const filledValues = Object.entries(block.values)
    .filter(([, value]) => value !== null && String(value).trim().length > 0)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return {
    tabId: tab.id,
    tabTitle: getDisplayTabTitle(tab),
    blockId: block.id,
    blockTitle: getDisplayBlockTitle(block),
    blockType: block.type,
    summary:
      formulaResult !== null
        ? `${template?.formula?.label || "Formula"} is ${formulaResult}.`
        : template?.name
          ? `${template.name} block with ${Object.keys(block.values).length} fields.`
          : "Custom block data captured.",
    metrics: [
      {
        label: "Fields",
        value: String(Object.keys(block.values).length),
      },
      {
        label: "Outputs",
        value: String(block.outputHistory.length),
      },
    ],
    highlights:
      filledValues.length > 0
        ? filledValues
        : trimToEmpty(block.notes)
          ? [truncateText(block.notes, 110)]
          : [],
  };
}

export function getWorkspaceNodeDashboardSelectableBlocks(
  node: WorkspaceNode,
): WorkspaceNodeDashboardSelectableBlock[] {
  return node.tabs.flatMap((tab) =>
    tab.blocks.map((block) => ({
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
    })),
  );
}

export function getWorkspaceNodeDashboardDetails(
  node: WorkspaceNode,
): WorkspaceNodeDashboardDetail[] {
  return node.dashboard.featuredBlocks.flatMap((selection) => {
    const tab = node.tabs.find((entry) => entry.id === selection.tabId);
    const block = tab?.blocks.find((entry) => entry.id === selection.blockId);

    if (!tab || !block) {
      return [];
    }

    return [buildWorkspaceNodeDashboardDetail(node, tab, block)];
  });
}

export function getTrackerTrend(
  block: WorkspaceTrackerBlock,
): WorkspaceTrackerTrend {
  const values = block.entries.map((entry) => entry.value);

  if (values.length === 0) {
    return {
      direction: "flat",
      delta: 0,
      percentChange: null,
      points: [],
    };
  }

  const first = values[0]!;
  const last = values[values.length - 1]!;
  const delta = Number((last - first).toFixed(2));
  const percentChange =
    first === 0
      ? null
      : Number((((last - first) / Math.abs(first)) * 100).toFixed(1));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points =
    max === min
      ? values.map(() => 56)
      : values.map((value) => Math.round(((value - min) / (max - min)) * 100));

  return {
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    delta,
    percentChange,
    points,
  };
}

export function getDecisionSummary(
  block: WorkspaceDecisionBlock,
): WorkspaceDecisionSummary {
  const prosWeight = block.pros.reduce((sum, item) => sum + item.weight, 0);
  const consWeight = block.cons.reduce((sum, item) => sum + item.weight, 0);
  const totalScore = prosWeight - consWeight;

  return {
    prosWeight,
    consWeight,
    totalScore,
    signal:
      totalScore > 1 ? "lean-yes" : totalScore < -1 ? "lean-no" : "balanced",
  };
}

export function evaluateCustomBlockFormula(
  expression: string | null | undefined,
  values: Record<string, WorkspaceCustomBlockValue>,
) {
  const source = expression?.trim();

  if (!source) {
    return null;
  }

  const numericValues = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      typeof value === "number" ? value : 0,
    ]),
  );

  const substituted = source.replace(
    /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g,
    (identifier) => String(numericValues[identifier] ?? 0),
  );

  if (!/^[0-9+\-*/().\s]+$/.test(substituted)) {
    return null;
  }

  try {
    const result = Function(`"use strict"; return (${substituted});`)();

    return typeof result === "number" && Number.isFinite(result)
      ? Number(result.toFixed(2))
      : null;
  } catch {
    return null;
  }
}

export function fillCustomBlockPromptTemplate(
  template: WorkspaceCustomBlockTemplate,
  block: WorkspaceCustomBlock,
) {
  const promptTemplate = template.aiPromptTemplate?.trim();

  if (!promptTemplate) {
    return "";
  }

  const valuePairs = Object.entries(block.values).map(([key, value]) => [
    key,
    typeof value === "boolean"
      ? value
        ? "true"
        : "false"
      : String(value ?? ""),
  ]);

  return promptTemplate.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    (_, key) => {
      const match = valuePairs.find(([entryKey]) => entryKey === key);

      return match?.[1] ?? "";
    },
  );
}

export function generateWorkspacePromptOutput(
  node: WorkspaceNode,
  prompt: string,
) {
  const normalizedPrompt = prompt.trim();
  const stats = getWorkspaceNodeStats(node);
  const timeSummary = getTimeOrchestratorSummary(node);
  const decisionBlocks = node.tabs.flatMap((tab) =>
    tab.blocks.filter(
      (block): block is WorkspaceDecisionBlock => block.type === "decision",
    ),
  );

  const intro = [
    `Node: ${node.title}`,
    `Tabs: ${stats.tabsCount}`,
    `Blocks: ${stats.blocksCount}`,
    `Tasks: ${stats.completedTasks}/${stats.totalTasks} complete`,
  ].join(" | ");

  if (
    /decision|recommend|choose/i.test(normalizedPrompt) &&
    decisionBlocks.length > 0
  ) {
    const recommendations = decisionBlocks.map((block) => {
      const summary = getDecisionSummary(block);
      const base = `${block.title}: score ${summary.totalScore} (${summary.signal})`;

      if (trimToEmpty(block.recommendation)) {
        return `${base}. Recommendation: ${block.recommendation.trim()}`;
      }

      return base;
    });

    return `${intro}\n\nDecision scan:\n- ${recommendations.join("\n- ")}`;
  }

  if (/task|priority|next|plan|schedule/i.test(normalizedPrompt)) {
    const lines =
      timeSummary.suggestedNextActions.length > 0
        ? timeSummary.suggestedNextActions.map(
            ({ task, tabTitle, blockTitle }) =>
              `${task.text} [${tabTitle} / ${blockTitle}]${task.domain ? `, ${getWorkspaceTaskDomainLabel(task.domain)}` : ""}${task.dueDate ? ` due ${task.dueDate}` : ""}${task.priority ? `, ${task.priority} priority` : ""}, urgency ${task.urgency}/10, importance ${task.importance}/10${task.estimateMinutes ? `, ${task.estimateMinutes}m` : ""}`,
          )
        : ["No outstanding tasks found."];

    return `${intro}\n\nSuggested next actions:\n- ${lines.join("\n- ")}`;
  }

  const notes = node.tabs
    .flatMap((tab) =>
      tab.blocks.flatMap((block) =>
        block.type === "notes" && trimToEmpty(block.body)
          ? [`${tab.title} / ${block.title}: ${truncateText(block.body, 180)}`]
          : [],
      ),
    )
    .slice(0, 3);

  const summaryLines = [
    `Overdue tasks: ${timeSummary.overdue.length}`,
    `Upcoming tasks: ${timeSummary.upcoming.length}`,
    `High priority tasks: ${timeSummary.highPriority.length}`,
    `Open task load: ${timeSummary.totalOpenTasks} tasks / ${timeSummary.totalEstimateMinutes} minutes`,
  ];

  if (notes.length > 0) {
    summaryLines.push(...notes);
  }

  return `${intro}\n\nPrompt: ${normalizedPrompt || "General summary"}\n\n- ${summaryLines.join("\n- ")}`;
}
