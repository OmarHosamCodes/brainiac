import { z } from "zod";

export const WORKSPACE_NODE_LIMIT = 200;
export const WORKSPACE_NODE_TAB_LIMIT = 12;
export const WORKSPACE_TAB_BLOCK_LIMIT = 24;
export const WORKSPACE_TASK_LIMIT = 100;
export const WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT = 20;
export const WORKSPACE_CUSTOM_BLOCK_FIELD_LIMIT = 12;
export const WORKSPACE_MARKETPLACE_ITEM_LIMIT = 200;
export const DEFAULT_WORKSPACE_NODE_WIDTH = 320;
export const DEFAULT_WORKSPACE_NODE_HEIGHT = 220;
export const DEFAULT_WORKSPACE_NODE_MIN_WIDTH = 260;
export const DEFAULT_WORKSPACE_NODE_MIN_HEIGHT = 180;

const isoTimestampSchema = z.string().datetime();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const workspaceTaskPrioritySchema = z.enum(["low", "medium", "high"]);
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
export type WorkspaceTask = z.infer<typeof workspaceTaskSchema>;
export type WorkspacePromptOutput = z.infer<typeof workspacePromptOutputSchema>;
export type WorkspaceDecisionItem = z.infer<typeof workspaceDecisionItemSchema>;
export type WorkspaceTrackerEntry = z.infer<typeof workspaceTrackerEntrySchema>;
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
export type WorkspaceTaskListBlock = z.infer<typeof workspaceTaskListBlockSchema>;
export type WorkspaceNotesBlock = z.infer<typeof workspaceNotesBlockSchema>;
export type WorkspaceDecisionBlock = z.infer<typeof workspaceDecisionBlockSchema>;
export type WorkspaceTrackerBlock = z.infer<typeof workspaceTrackerBlockSchema>;
export type WorkspaceAiPromptBlock = z.infer<typeof workspaceAiPromptBlockSchema>;
export type WorkspaceTimeOrchestratorBlock = z.infer<
  typeof workspaceTimeOrchestratorBlockSchema
>;
export type WorkspaceCustomBlock = z.infer<typeof workspaceCustomBlockSchema>;
export type WorkspaceBlock = z.infer<typeof workspaceBlockSchema>;
export type WorkspaceNodeTab = z.infer<typeof workspaceNodeTabSchema>;
export type WorkspaceNodeViewState = z.infer<typeof workspaceNodeViewStateSchema>;
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

export type WorkspaceTimeOrchestratorSummary = {
  overdue: WorkspaceCollectedTask[];
  upcoming: WorkspaceCollectedTask[];
  highPriority: WorkspaceCollectedTask[];
  suggestedNextActions: WorkspaceCollectedTask[];
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

export function createDefaultWorkspaceTab(title = "Overview", body = "") {
  return createWorkspaceNodeTab({
    title,
    blocks: [createWorkspaceNotesBlock({ title: "Notes", body })],
  });
}

export function normalizeWorkspaceNodeTab(tab: WorkspaceNodeTab): WorkspaceNodeTab {
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
      return workspaceTimeOrchestratorBlockSchema.parse(block);
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
    parsed.viewState.activeTabId && validTabIds.has(parsed.viewState.activeTabId)
      ? parsed.viewState.activeTabId
      : tabs[0]?.id ?? null;
  const notePreviewState = Object.fromEntries(
    Object.entries(parsed.viewState.notePreviewState ?? {}).filter(([blockId]) =>
      noteBlockIds.has(blockId),
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
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "custom":
      return workspaceCustomBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        definitionId: templateIdMap.get(block.definitionId) ?? block.definitionId,
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
  const tabs = node.tabs.map((tab) => {
    const clonedTab = cloneWorkspaceTabForInsertion(tab, templateIdMap, timestamp);
    tabIdMap.set(tab.id, clonedTab.id);
    return clonedTab;
  });
  const activeTabId =
    node.viewState.activeTabId && tabIdMap.has(node.viewState.activeTabId)
      ? tabIdMap.get(node.viewState.activeTabId) ?? tabs[0]?.id ?? null
      : tabs[0]?.id ?? null;

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

function getTaskUrgencyScore(task: WorkspaceTask, now = new Date()) {
  if (task.completed) {
    return Number.NEGATIVE_INFINITY;
  }

  const priorityScore = getPriorityScore(task.priority);

  if (!task.dueDate) {
    return priorityScore;
  }

  const todayValue = getTodayValue(now);
  const dueDateValue = getDueDateValue(task.dueDate);
  const dayDelta = Math.round((dueDateValue - todayValue) / 86_400_000);

  if (dayDelta < 0) {
    return priorityScore + Math.abs(dayDelta) * 8 + 18;
  }

  if (dayDelta === 0) {
    return priorityScore + 16;
  }

  if (dayDelta <= 3) {
    return priorityScore + (4 - dayDelta) * 5;
  }

  if (dayDelta <= 7) {
    return priorityScore + 2;
  }

  return priorityScore;
}

export function getTimeOrchestratorSummary(
  node: WorkspaceNode,
  now = new Date(),
): WorkspaceTimeOrchestratorSummary {
  const tasks = collectWorkspaceNodeTasks(node).filter(
    ({ task }) => !task.completed,
  );
  const todayValue = getTodayValue(now);

  const overdue = tasks
    .filter(({ task }) => task.dueDate && getDueDateValue(task.dueDate) < todayValue)
    .sort(
      (left, right) =>
        getDueDateValue(left.task.dueDate!) - getDueDateValue(right.task.dueDate!),
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
        getDueDateValue(left.task.dueDate!) - getDueDateValue(right.task.dueDate!),
    );

  const highPriority = tasks.filter(({ task }) => task.priority === "high");
  const suggestedNextActions = [...tasks]
    .sort(
      (left, right) =>
        getTaskUrgencyScore(right.task, now) - getTaskUrgencyScore(left.task, now),
    )
    .slice(0, 5);

  return {
    overdue,
    upcoming,
    highPriority,
    suggestedNextActions,
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
    }
  }

  return "Open the node to add tabs, blocks, and working context.";
}

export function getWorkspaceNodeStats(node: WorkspaceNode) {
  const tabsCount = node.tabs.length;
  const blocksCount = node.tabs.reduce((count, tab) => count + tab.blocks.length, 0);
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

export function getTrackerTrend(block: WorkspaceTrackerBlock): WorkspaceTrackerTrend {
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
    first === 0 ? null : Number((((last - first) / Math.abs(first)) * 100).toFixed(1));
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

export function getDecisionSummary(block: WorkspaceDecisionBlock): WorkspaceDecisionSummary {
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
    Object.entries(values).map(([key, value]) => [key, typeof value === "number" ? value : 0]),
  );

  const substituted = source.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (identifier) =>
    String(numericValues[identifier] ?? 0),
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
    typeof value === "boolean" ? (value ? "true" : "false") : String(value ?? ""),
  ]);

  return promptTemplate.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, key) => {
    const match = valuePairs.find(([entryKey]) => entryKey === key);

    return match?.[1] ?? "";
  });
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

  if (/decision|recommend|choose/i.test(normalizedPrompt) && decisionBlocks.length > 0) {
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
              `${task.text} [${tabTitle} / ${blockTitle}]${task.dueDate ? ` due ${task.dueDate}` : ""}${task.priority ? `, ${task.priority} priority` : ""}`,
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
  ];

  if (notes.length > 0) {
    summaryLines.push(...notes);
  }

  return `${intro}\n\nPrompt: ${normalizedPrompt || "General summary"}\n\n- ${summaryLines.join("\n- ")}`;
}
