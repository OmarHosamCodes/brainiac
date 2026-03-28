import {
  DEFAULT_WORKSPACE_NODE_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
  DEFAULT_WORKSPACE_NODE_WIDTH,
} from "./constants";
import {
  workspaceAiPromptBlockSchema,
  workspaceCustomBlockSchema,
  workspaceCustomBlockTemplateSchema,
  workspaceDecisionBlockSchema,
  workspaceKanbanBlockSchema,
  workspaceKanbanCardSchema,
  workspaceKanbanColumnSchema,
  workspaceNodeDashboardSchema,
  workspaceNodeSchema,
  workspaceNodeTabSchema,
  workspaceNodeViewStateSchema,
  workspaceNotesBlockSchema,
  workspacePromptOutputSchema,
  workspaceScorecardBlockSchema,
  workspaceScorecardMetricSchema,
  workspaceTaskListBlockSchema,
  workspaceTaskSchema,
  workspaceTimeOrchestratorBlockSchema,
  workspaceTimelineBlockSchema,
  workspaceTimelineMilestoneSchema,
  workspaceTrackerBlockSchema,
} from "./schemas";
import { getNowIsoString } from "./shared";
import { createWorkspaceTimeOrchestratorSettings } from "./tasks";
import type {
  WorkspaceAiPromptBlock,
  WorkspaceBlock,
  WorkspaceCustomBlock,
  WorkspaceCustomBlockField,
  WorkspaceCustomBlockTemplate,
  WorkspaceDecisionBlock,
  WorkspaceKanbanBlock,
  WorkspaceKanbanCard,
  WorkspaceKanbanColumn,
  WorkspaceNode,
  WorkspaceNodeDashboard,
  WorkspaceNodeTab,
  WorkspaceNodeViewState,
  WorkspaceNotesBlock,
  WorkspacePromptOutput,
  WorkspaceScorecardBlock,
  WorkspaceScorecardMetric,
  WorkspaceTask,
  WorkspaceTaskListBlock,
  WorkspaceTimeOrchestratorBlock,
  WorkspaceTimelineBlock,
  WorkspaceTimelineMilestone,
  WorkspaceTrackerBlock,
} from "./types";

export * from "./constants";
export * from "./dashboard";
export * from "./schemas";
export * from "./tasks";
export * from "./types";

export function createWorkspaceId(prefix = "item") {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) {
    return `${prefix}-${randomUuid}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createWorkspaceTask(partial: Partial<WorkspaceTask> = {}): WorkspaceTask {
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

export function createWorkspaceNodeTab(partial: Partial<WorkspaceNodeTab> = {}): WorkspaceNodeTab {
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
  block: WorkspaceKanbanBlock | (Partial<WorkspaceKanbanBlock> & { type: "kanban" }),
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
      columnId: validColumnIds.has(card.columnId) ? card.columnId : fallbackColumnId,
    })),
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
    parsed.viewState.activeTabId && validTabIds.has(parsed.viewState.activeTabId)
      ? parsed.viewState.activeTabId
      : (tabs[0]?.id ?? null);
  const notePreviewState = Object.fromEntries(
    Object.entries(parsed.viewState.notePreviewState ?? {}).filter(([blockId]) =>
      noteBlockIds.has(blockId),
    ),
  );
  const featuredBlocks = parsed.dashboard.featuredBlocks.filter(({ tabId, blockId }) =>
    tabs.some((tab) => tab.id === tabId && tab.blocks.some((block) => block.id === blockId)),
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
  return outputs.map((entry) =>
    workspacePromptOutputSchema.parse({
      ...entry,
      id: createWorkspaceId("output"),
    }),
  );
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
  const blockIdMap = new Map<string, string>();
  const tabs = node.tabs.map((tab) => {
    const clonedTab = cloneWorkspaceTabForInsertion(tab, templateIdMap, timestamp);
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
