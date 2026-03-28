<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import {
  WORKSPACE_TASK_DOMAINS,
  createDefaultWorkspaceTab,
  createWorkspaceAiPromptBlock,
  createWorkspaceAssumptionTrackerBlock,
  createWorkspaceBusinessModelCanvasBlock,
  createWorkspaceDecisionMatrixBlock,
  createWorkspaceDecisionBlock,
  createWorkspaceId,
  createWorkspaceKanbanBlock,
  createWorkspaceKanbanCard,
  createWorkspaceKanbanColumn,
  createWorkspaceNotesBlock,
  createWorkspaceOkrTrackerBlock,
  createWorkspaceScorecardBlock,
  createWorkspaceScorecardMetric,
  createWorkspaceTask,
  createWorkspaceTaskListBlock,
  createWorkspaceTimeOrchestratorBlock,
  createWorkspaceTimelineBlock,
  createWorkspaceTimelineMilestone,
  createWorkspaceTrackerBlock,
  cloneWorkspaceNodes,
  evaluateCustomBlockFormula,
  fillCustomBlockPromptTemplate,
  generateWorkspacePromptOutput,
  getTimeOrchestratorSummary,
  getWorkspaceTaskDomainLabel,
  normalizeWorkspaceNode,
  type WorkspaceBlock,
  type WorkspaceCollectedTask,
  type WorkspaceCustomBlock,
  type WorkspaceKanbanCard,
  type WorkspaceNode,
  type WorkspaceNodeTab,
  type WorkspaceTaskPriority,
  type WorkspaceTimeOrchestratorBlock,
} from "@brainiac/workspace";
import { useMutation } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";

import {
  workspaceNodeEditorContextKey,
  type WorkspaceNodeDomainOption,
  type WorkspaceNodePriorityOption,
  type WorkspaceTabEditorMode,
} from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";
import { renderSimpleMarkdown } from "~/utils/render-simple-markdown";
import { createWorkspaceAddBlockMenuItems } from "~/utils/workspace-add-block-menu";
import {
  createBlockMarketplacePayload,
  createNodeMarketplacePayload,
  createTabMarketplacePayload,
} from "~/utils/workspace-marketplace";
import {
  getWorkspaceBlockPreset,
  workspaceBlockPresets,
  type WorkspaceBlockPresetId,
} from "~/utils/workspace-block-presets";

definePageMeta({
  middleware: ["auth", "workspace"],
});

const route = useRoute();
const toast = useToast();
const orpc = useOrpc();
const workspaceStore = useWorkspaceStore();
const {
  isWorkspaceInitialLoading,
  isWorkspaceRefreshing,
  nodes: draftNodes,
  saveBadge,
  saveError,
} = storeToRefs(workspaceStore);
const workspaceQuery = workspaceStore.workspaceQuery;

const saveMarketplaceItem = useMutation(orpc.workspace.marketplace.save.mutationOptions());

const nodeId = computed(() => String(route.params.id ?? ""));
const emptyDropdownItems: DropdownMenuItem[][] = [];

const tabEditor = reactive({
  open: false,
  mode: "create" as WorkspaceTabEditorMode,
  title: "",
});

const node = computed(() => {
  return draftNodes.value.find((entry) => entry.id === nodeId.value) ?? null;
});

const activeTabId = computed(() => node.value?.viewState.activeTabId ?? "");
const isAgentChatVisible = ref(true);
const agentContextTarget = ref<{ tabId: string; blockId: string } | null>(null);

const activeTab = computed(() => {
  if (!node.value) {
    return null;
  }

  return node.value.tabs.find((tab) => tab.id === activeTabId.value) ?? node.value.tabs[0] ?? null;
});

const blockSearch = ref("");

const normalizedBlockSearch = computed(() => blockSearch.value.trim().toLowerCase());

const visibleBlocks = computed(() => {
  if (!activeTab.value) {
    return [];
  }

  if (!normalizedBlockSearch.value) {
    return activeTab.value.blocks;
  }

  return activeTab.value.blocks.filter((block) =>
    getBlockSearchText(block).includes(normalizedBlockSearch.value),
  );
});

const agentContextState = computed(() => {
  if (!node.value || !agentContextTarget.value) {
    return null;
  }

  const tab = node.value.tabs.find((entry) => entry.id === agentContextTarget.value?.tabId);

  if (!tab) {
    return null;
  }

  const block = tab.blocks.find((entry) => entry.id === agentContextTarget.value?.blockId);

  if (!block) {
    return null;
  }

  return {
    tab,
    block,
  };
});

const agentChatNodes = computed(() => {
  if (!node.value) {
    return [];
  }

  if (!agentContextState.value) {
    return [node.value];
  }

  return [
    createAgentContextNode(node.value, agentContextState.value.tab, agentContextState.value.block),
  ];
});

watch(agentContextState, (value) => {
  if (!value && agentContextTarget.value) {
    agentContextTarget.value = null;
  }
});

const addBlockMenuItems = computed<DropdownMenuItem[][]>(() => {
  if (!activeTab.value || !node.value) {
    return emptyDropdownItems;
  }

  return createWorkspaceAddBlockMenuItems(addBlockToActiveTab);
});

const blockPresetMenuItems = computed(() => {
  if (!activeTab.value) {
    return emptyDropdownItems;
  }

  return [
    workspaceBlockPresets.map((preset) => ({
      label: preset.label,
      icon: preset.icon,
      onSelect: () => {
        addBlockPresetToActiveTab(preset.id);
      },
    })),
  ];
});

const priorityOptions = [
  { label: "None", value: "" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
] satisfies WorkspaceNodePriorityOption[];

const domainOptions = [
  { label: "Unassigned", value: "" },
  ...WORKSPACE_TASK_DOMAINS.map((domain) => ({
    label: getWorkspaceTaskDomainLabel(domain),
    value: domain,
  })),
] satisfies WorkspaceNodeDomainOption[];

watch(
  () => node.value?.tabs.map((tab) => tab.id).join(","),
  () => {
    syncActiveTab();
  },
  { immediate: true },
);

function syncActiveTab() {
  const currentNode = node.value;

  if (!currentNode || currentNode.tabs.length === 0) {
    return;
  }

  if (!currentNode.tabs.some((tab) => tab.id === activeTabId.value)) {
    const nextTabId = currentNode.tabs[0]?.id ?? null;

    if (currentNode.viewState.activeTabId === nextTabId) {
      return;
    }

    mutateCurrentNode((entry) => {
      entry.viewState.activeTabId = nextTabId;
    });
  }
}

function setActiveTab(tabId: string) {
  if (!node.value || node.value.viewState.activeTabId === tabId) {
    return;
  }

  mutateCurrentNode((entry) => {
    entry.viewState.activeTabId = tabId;
  });
}

function updateDraftNodes(mutator: (nodes: WorkspaceNode[]) => void) {
  workspaceStore.updateNodes(mutator);
}

function mutateCurrentNode(mutator: (entry: WorkspaceNode, timestamp: string) => void) {
  updateDraftNodes((nodes) => {
    const index = nodes.findIndex((entry) => entry.id === nodeId.value);

    if (index < 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const entry = nodes[index]!;

    mutator(entry, timestamp);
    entry.label = entry.title;
    entry.updatedAt = timestamp;
    nodes[index] = normalizeWorkspaceNode(entry);
  });
}

function mutateTab(
  tabId: string,
  mutator: (tab: WorkspaceNodeTab, nodeEntry: WorkspaceNode, timestamp: string) => void,
) {
  mutateCurrentNode((entry, timestamp) => {
    const tab = entry.tabs.find((candidate) => candidate.id === tabId);

    if (!tab) {
      return;
    }

    mutator(tab, entry, timestamp);
    tab.updatedAt = timestamp;
  });
}

function mutateBlock(
  tabId: string,
  blockId: string,
  mutator: (
    block: WorkspaceBlock,
    tab: WorkspaceNodeTab,
    nodeEntry: WorkspaceNode,
    timestamp: string,
  ) => void,
) {
  mutateTab(tabId, (tab, entry, timestamp) => {
    const block = tab.blocks.find((candidate) => candidate.id === blockId);

    if (!block) {
      return;
    }

    mutator(block, tab, entry, timestamp);
    block.updatedAt = timestamp;
    tab.updatedAt = timestamp;
  });
}

function openTabEditor(mode: WorkspaceTabEditorMode) {
  if (!node.value) {
    return;
  }

  tabEditor.mode = mode;
  tabEditor.title = mode === "rename" ? getDisplayTabTitle(activeTab.value) : "";
  tabEditor.open = true;
}

function closeTabEditor() {
  tabEditor.open = false;
  tabEditor.title = "";
}

function submitTabEditor() {
  const title = tabEditor.title.trim() || "Untitled tab";

  if (tabEditor.mode === "create") {
    const nextTab = createDefaultWorkspaceTab(title);

    mutateCurrentNode((entry) => {
      entry.tabs.push(nextTab);
      entry.viewState.activeTabId = nextTab.id;
    });
  } else if (activeTab.value) {
    mutateTab(activeTab.value.id, (tab) => {
      tab.title = title;
    });
  }

  closeTabEditor();
}

function deleteActiveTab() {
  if (!node.value || !activeTab.value) {
    return;
  }

  const currentTabId = activeTab.value.id;
  const currentIndex = node.value.tabs.findIndex((tab) => tab.id === currentTabId);

  if (!window.confirm(`Delete "${getDisplayTabTitle(activeTab.value)}"?`)) {
    return;
  }

  mutateCurrentNode((entry) => {
    entry.tabs = entry.tabs.filter((tab) => tab.id !== currentTabId);

    if (entry.tabs.length === 0) {
      const fallbackTab = createDefaultWorkspaceTab("Overview", entry.content);
      entry.tabs = [fallbackTab];
      entry.viewState.activeTabId = fallbackTab.id;
      return;
    }

    const nextTab =
      entry.tabs[currentIndex] ?? entry.tabs[Math.max(0, currentIndex - 1)] ?? entry.tabs[0];

    entry.viewState.activeTabId = nextTab?.id ?? null;
  });
}

function addBlockToActiveTab(type: WorkspaceBlock["type"]) {
  if (!activeTab.value) {
    return;
  }

  let nextBlock: WorkspaceBlock;

  switch (type) {
    case "task-list":
      nextBlock = createWorkspaceTaskListBlock();
      break;
    case "notes":
      nextBlock = createWorkspaceNotesBlock();
      break;
    case "decision":
      nextBlock = createWorkspaceDecisionBlock();
      break;
    case "tracker":
      nextBlock = createWorkspaceTrackerBlock();
      break;
    case "ai-prompt":
      nextBlock = createWorkspaceAiPromptBlock();
      break;
    case "time-orchestrator":
      nextBlock = createWorkspaceTimeOrchestratorBlock();
      break;
    case "kanban":
      nextBlock = createWorkspaceKanbanBlock();
      break;
    case "timeline":
      nextBlock = createWorkspaceTimelineBlock();
      break;
    case "scorecard":
      nextBlock = createWorkspaceScorecardBlock();
      break;
    case "okr-tracker":
      nextBlock = createWorkspaceOkrTrackerBlock();
      break;
    case "decision-matrix":
      nextBlock = createWorkspaceDecisionMatrixBlock();
      break;
    case "business-model-canvas":
      nextBlock = createWorkspaceBusinessModelCanvasBlock();
      break;
    case "assumption-tracker":
      nextBlock = createWorkspaceAssumptionTrackerBlock();
      break;
    case "custom":
      return;
  }

  mutateTab(activeTab.value.id, (tab) => {
    tab.blocks.push(nextBlock);
  });
}

function addBlockPresetToActiveTab(presetId: WorkspaceBlockPresetId) {
  if (!activeTab.value) {
    return;
  }

  const preset = getWorkspaceBlockPreset(presetId);

  if (!preset) {
    return;
  }

  mutateTab(activeTab.value.id, (tab) => {
    tab.blocks.push(...preset.createBlocks());
  });
}

function removeBlock(tabId: string, blockId: string) {
  if (isAgentContextBlock(tabId, blockId)) {
    clearAgentContextBlock();
  }

  mutateTab(tabId, (tab) => {
    tab.blocks = tab.blocks.filter((block) => block.id !== blockId);
  });
}

function updateBlockTitle(tabId: string, blockId: string, value: string) {
  mutateBlock(tabId, blockId, (block) => {
    block.title = value;
  });
}

function addTask(tabId: string, blockId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "task-list") {
      return;
    }

    block.tasks.push(createWorkspaceTask());
  });
}

function mutateTask(
  tabId: string,
  blockId: string,
  taskId: string,
  mutator: (task: ReturnType<typeof createWorkspaceTask>) => void,
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "task-list") {
      return;
    }

    const task = block.tasks.find((entry) => entry.id === taskId);

    if (!task) {
      return;
    }

    mutator(task);
  });
}

function removeTask(tabId: string, blockId: string, taskId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "task-list") {
      return;
    }

    block.tasks = block.tasks.filter((task) => task.id !== taskId);
  });
}

function addDecisionItem(tabId: string, blockId: string, list: "pros" | "cons") {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "decision") {
      return;
    }

    block[list].push({
      id: createWorkspaceId("decision"),
      text: "",
      weight: 3,
    });
  });
}

function mutateDecisionItem(
  tabId: string,
  blockId: string,
  itemId: string,
  list: "pros" | "cons",
  mutator: (item: { id: string; text: string; weight: number }) => void,
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "decision") {
      return;
    }

    const item = block[list].find((entry) => entry.id === itemId);

    if (!item) {
      return;
    }

    mutator(item);
  });
}

function removeDecisionItem(tabId: string, blockId: string, itemId: string, list: "pros" | "cons") {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "decision") {
      return;
    }

    block[list] = block[list].filter((item) => item.id !== itemId);
  });
}

function addTrackerEntry(tabId: string, blockId: string) {
  mutateBlock(tabId, blockId, (block, _tab, _entry, timestamp) => {
    if (block.type !== "tracker") {
      return;
    }

    block.entries.push({
      id: createWorkspaceId("entry"),
      label: "",
      value: 0,
      createdAt: timestamp,
    });
  });
}

function mutateTrackerEntry(
  tabId: string,
  blockId: string,
  entryId: string,
  mutator: (entry: { id: string; label: string; value: number; createdAt: string }) => void,
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "tracker") {
      return;
    }

    const trackerEntry = block.entries.find((entry) => entry.id === entryId);

    if (!trackerEntry) {
      return;
    }

    mutator(trackerEntry);
  });
}

function removeTrackerEntry(tabId: string, blockId: string, entryId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "tracker") {
      return;
    }

    block.entries = block.entries.filter((entry) => entry.id !== entryId);
  });
}

function addKanbanColumn(tabId: string, blockId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "kanban") {
      return;
    }

    block.columns.push(createWorkspaceKanbanColumn());
  });
}

function mutateKanbanColumn(
  tabId: string,
  blockId: string,
  columnId: string,
  mutator: (column: ReturnType<typeof createWorkspaceKanbanColumn>) => void,
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "kanban") {
      return;
    }

    const column = block.columns.find((entry) => entry.id === columnId);

    if (!column) {
      return;
    }

    mutator(column);
  });
}

function removeKanbanColumn(tabId: string, blockId: string, columnId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "kanban" || block.columns.length <= 1) {
      return;
    }

    const nextColumns = block.columns.filter((column) => column.id !== columnId);
    const fallbackColumnId = nextColumns[0]?.id;

    if (!fallbackColumnId) {
      return;
    }

    block.columns = nextColumns;
    block.cards = block.cards.map((card) =>
      card.columnId === columnId
        ? {
            ...card,
            columnId: fallbackColumnId,
          }
        : card,
    );
  });
}

function addKanbanCard(tabId: string, blockId: string, columnId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "kanban") {
      return;
    }

    block.cards.push(createWorkspaceKanbanCard({ columnId }));
  });
}

function getKanbanColumnInsertIndex(cards: WorkspaceKanbanCard[], columnId: string) {
  for (let index = cards.length - 1; index >= 0; index -= 1) {
    if (cards[index]?.columnId === columnId) {
      return index + 1;
    }
  }

  return cards.length;
}

function mutateKanbanCard(
  tabId: string,
  blockId: string,
  cardId: string,
  mutator: (card: ReturnType<typeof createWorkspaceKanbanCard>) => void,
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "kanban") {
      return;
    }

    const card = block.cards.find((entry) => entry.id === cardId);

    if (!card) {
      return;
    }

    mutator(card);
  });
}

function moveKanbanCard(tabId: string, blockId: string, cardId: string, targetColumnId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "kanban") {
      return;
    }

    if (!block.columns.some((column) => column.id === targetColumnId)) {
      return;
    }

    const fromIndex = block.cards.findIndex((card) => card.id === cardId);

    if (fromIndex < 0) {
      return;
    }

    const [card] = block.cards.splice(fromIndex, 1);

    if (!card) {
      return;
    }

    card.columnId = targetColumnId;

    const insertIndex = getKanbanColumnInsertIndex(block.cards, targetColumnId);
    block.cards.splice(insertIndex, 0, card);
  });
}

function removeKanbanCard(tabId: string, blockId: string, cardId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "kanban") {
      return;
    }

    block.cards = block.cards.filter((card) => card.id !== cardId);
  });
}

function addTimelineMilestone(tabId: string, blockId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "timeline") {
      return;
    }

    block.milestones.push(createWorkspaceTimelineMilestone());
  });
}

function mutateTimelineMilestone(
  tabId: string,
  blockId: string,
  milestoneId: string,
  mutator: (milestone: ReturnType<typeof createWorkspaceTimelineMilestone>) => void,
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "timeline") {
      return;
    }

    const milestone = block.milestones.find((entry) => entry.id === milestoneId);

    if (!milestone) {
      return;
    }

    mutator(milestone);
  });
}

function removeTimelineMilestone(tabId: string, blockId: string, milestoneId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "timeline") {
      return;
    }

    block.milestones = block.milestones.filter((milestone) => milestone.id !== milestoneId);
  });
}

function moveTimelineMilestone(
  tabId: string,
  blockId: string,
  milestoneId: string,
  direction: "up" | "down",
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "timeline") {
      return;
    }

    const fromIndex = block.milestones.findIndex((milestone) => milestone.id === milestoneId);

    if (fromIndex < 0) {
      return;
    }

    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;

    if (toIndex < 0 || toIndex >= block.milestones.length) {
      return;
    }

    const [milestone] = block.milestones.splice(fromIndex, 1);

    if (!milestone) {
      return;
    }

    block.milestones.splice(toIndex, 0, milestone);
  });
}

function addScorecardMetric(tabId: string, blockId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "scorecard") {
      return;
    }

    block.metrics.push(createWorkspaceScorecardMetric());
  });
}

function mutateScorecardMetric(
  tabId: string,
  blockId: string,
  metricId: string,
  mutator: (metric: ReturnType<typeof createWorkspaceScorecardMetric>) => void,
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "scorecard") {
      return;
    }

    const metric = block.metrics.find((entry) => entry.id === metricId);

    if (!metric) {
      return;
    }

    mutator(metric);
  });
}

function removeScorecardMetric(tabId: string, blockId: string, metricId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "scorecard") {
      return;
    }

    block.metrics = block.metrics.filter((metric) => metric.id !== metricId);
  });
}

function runPromptBlock(tabId: string, blockId: string) {
  if (!node.value) {
    return;
  }

  const block = activeTab.value?.blocks.find(
    (candidate): candidate is Extract<WorkspaceBlock, { type: "ai-prompt" }> =>
      candidate.id === blockId && candidate.type === "ai-prompt",
  );

  if (!block || !block.prompt.trim()) {
    return;
  }

  const output = generateWorkspacePromptOutput(node.value, block.prompt);

  mutateBlock(tabId, blockId, (entry, _tab, _node, timestamp) => {
    if (entry.type !== "ai-prompt") {
      return;
    }

    entry.latestOutput = output;
    entry.outputHistory.unshift({
      id: createWorkspaceId("output"),
      prompt: entry.prompt,
      output,
      createdAt: timestamp,
    });
    entry.outputHistory = entry.outputHistory.slice(0, 8);
  });
}

function runCustomPrompt(tabId: string, blockId: string) {
  if (!node.value) {
    return;
  }

  const block = activeTab.value?.blocks.find(
    (candidate): candidate is WorkspaceCustomBlock =>
      candidate.id === blockId && candidate.type === "custom",
  );

  if (!block) {
    return;
  }

  const template = node.value.customBlockTemplates.find((entry) => entry.id === block.definitionId);

  if (!template) {
    return;
  }

  const prompt = fillCustomBlockPromptTemplate(template, block).trim();

  if (!prompt) {
    return;
  }

  const output = generateWorkspacePromptOutput(node.value, prompt);

  mutateBlock(tabId, blockId, (entry, _tab, _node, timestamp) => {
    if (entry.type !== "custom") {
      return;
    }

    entry.latestAiOutput = output;
    entry.outputHistory.unshift({
      id: createWorkspaceId("output"),
      prompt,
      output,
      createdAt: timestamp,
    });
    entry.outputHistory = entry.outputHistory.slice(0, 8);
  });
}

function toggleNotePreview(blockId: string) {
  mutateCurrentNode((entry) => {
    entry.viewState.notePreviewState = {
      ...entry.viewState.notePreviewState,
      [blockId]: !entry.viewState.notePreviewState?.[blockId],
    };
  });
}

function isNotePreviewEnabled(blockId: string) {
  return Boolean(node.value?.viewState.notePreviewState?.[blockId]);
}

async function saveToMarketplace(
  title: string,
  summary: string,
  payload: ReturnType<typeof createNodeMarketplacePayload>,
) {
  try {
    await saveMarketplaceItem.mutateAsync({
      title,
      summary,
      payload,
    });

    toast.add({
      title: "Saved to team marketplace",
      description: `${title} is now available from any dashboard or node page.`,
      color: "success",
      icon: "i-lucide-store",
    });
  } catch (error) {
    toast.add({
      title: "Could not save to marketplace",
      description: getErrorMessage(error, "Marketplace save failed"),
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  }
}

async function saveNodeToMarketplace() {
  if (!node.value) {
    return;
  }

  const payload = createNodeMarketplacePayload(node.value);
  await saveToMarketplace(node.value.title, `${node.value.tabs.length} tabs`, payload);
}

async function saveActiveTabToMarketplace() {
  if (!node.value || !activeTab.value) {
    return;
  }

  const payload = createTabMarketplacePayload(node.value, activeTab.value);
  await saveToMarketplace(
    `${node.value.title} / ${getDisplayTabTitle(activeTab.value)}`,
    `${activeTab.value.blocks.length} blocks`,
    payload,
  );
}

async function saveBlockToMarketplace(block: WorkspaceBlock) {
  if (!node.value || !activeTab.value) {
    return;
  }

  const payload = createBlockMarketplacePayload(node.value, block);
  await saveToMarketplace(
    `${node.value.title} / ${getDisplayTabTitle(activeTab.value)} / ${getDisplayBlockTitle(block)}`,
    block.type,
    payload,
  );
}

function getTimeOrchestratorSummaryForBlock(block: WorkspaceTimeOrchestratorBlock) {
  return node.value ? getTimeOrchestratorSummary(node.value, block.settings) : null;
}

function getDisplayTabTitle(tab: WorkspaceNodeTab | null | undefined) {
  return tab?.title.trim() || "Untitled tab";
}

function getDisplayBlockTitle(block: WorkspaceBlock) {
  return block.title.trim() || "Untitled block";
}

function createAgentContextNode(
  nodeEntry: WorkspaceNode,
  tab: WorkspaceNodeTab,
  block: WorkspaceBlock,
) {
  const clonedNode = cloneWorkspaceNodes([nodeEntry])[0];
  const scopedTab = clonedNode?.tabs.find((entry) => entry.id === tab.id);

  if (!clonedNode || !scopedTab) {
    return nodeEntry;
  }

  clonedNode.id = `${nodeEntry.id}::context::${block.id}`;
  clonedNode.title = `${getDisplayBlockTitle(block)} - ${nodeEntry.title}`.slice(0, 120);
  clonedNode.label = getDisplayTabTitle(tab).slice(0, 120);
  clonedNode.content = `Block-only context from node "${nodeEntry.title}" in tab "${getDisplayTabTitle(tab)}".`;
  scopedTab.blocks = scopedTab.blocks.filter((entry) => entry.id === block.id);
  clonedNode.tabs = [scopedTab];
  clonedNode.viewState = {
    activeTabId: scopedTab.id,
    notePreviewState: {},
  };
  clonedNode.dashboard = {
    ...clonedNode.dashboard,
    featuredBlocks: [],
  };
  clonedNode.customBlockTemplates =
    block.type === "custom"
      ? clonedNode.customBlockTemplates.filter((template) => template.id === block.definitionId)
      : [];

  return clonedNode;
}

function setAgentContextBlock(tabId: string, blockId: string) {
  agentContextTarget.value = { tabId, blockId };
  isAgentChatVisible.value = true;
}

function toggleAgentContextBlock(tabId: string, blockId: string) {
  if (isAgentContextBlock(tabId, blockId)) {
    clearAgentContextBlock();
    return;
  }

  setAgentContextBlock(tabId, blockId);
}

function clearAgentContextBlock() {
  agentContextTarget.value = null;
}

function isAgentContextBlock(tabId: string, blockId: string) {
  return agentContextTarget.value?.tabId === tabId && agentContextTarget.value?.blockId === blockId;
}

function getBlockSearchText(block: WorkspaceBlock) {
  const fragments: string[] = [block.type, getDisplayBlockTitle(block)];

  if (block.type === "task-list") {
    fragments.push(
      ...block.tasks.flatMap((task) => [
        task.text,
        task.dueDate ?? "",
        task.priority ?? "",
        task.domain ?? "",
        String(task.urgency),
        String(task.importance),
        String(task.estimateMinutes),
      ]),
    );
  } else if (block.type === "notes") {
    fragments.push(block.body);
  } else if (block.type === "decision") {
    fragments.push(
      block.recommendation,
      ...block.pros.flatMap((item) => [item.text, String(item.weight)]),
      ...block.cons.flatMap((item) => [item.text, String(item.weight)]),
    );
  } else if (block.type === "tracker") {
    fragments.push(...block.entries.flatMap((entry) => [entry.label, String(entry.value)]));
  } else if (block.type === "ai-prompt") {
    fragments.push(block.prompt, block.latestOutput);
  } else if (block.type === "time-orchestrator") {
    fragments.push(
      ...block.settings.domains,
      ...block.settings.quadrants,
      block.settings.includeUnassigned ? "unassigned" : "",
    );
  } else if (block.type === "kanban") {
    fragments.push(
      ...block.columns.map((column) => column.title),
      ...block.cards.flatMap((card) => [
        card.title,
        card.description,
        card.assignee,
        card.dueDate ?? "",
      ]),
    );
  } else if (block.type === "timeline") {
    fragments.push(
      ...block.milestones.flatMap((milestone) => [
        milestone.title,
        milestone.date ?? "",
        milestone.status,
        milestone.note,
      ]),
    );
  } else if (block.type === "scorecard") {
    fragments.push(
      ...block.metrics.flatMap((metric) => [
        metric.label,
        String(metric.value),
        String(metric.target),
        metric.unit,
      ]),
    );
  } else if (block.type === "okr-tracker") {
    fragments.push(
      ...block.objectives.flatMap((objective) => [
        objective.title,
        ...objective.keyResults.flatMap((keyResult) => [
          keyResult.title,
          String(keyResult.progress),
        ]),
      ]),
    );
  } else if (block.type === "decision-matrix") {
    fragments.push(
      block.question,
      ...block.criteria.flatMap((criterion) => [criterion.label, String(criterion.weight)]),
      ...block.options.flatMap((option) => [
        option.label,
        ...Object.values(option.scores).map(String),
      ]),
    );
  } else if (block.type === "business-model-canvas") {
    fragments.push(block.analysis, ...Object.values(block.cells));
  } else if (block.type === "assumption-tracker") {
    fragments.push(
      block.filter,
      ...block.assumptions.flatMap((assumption) => [
        assumption.statement,
        assumption.owner,
        assumption.reviewDate ?? "",
        assumption.status,
        String(assumption.confidence),
        assumption.evidenceNotes,
        assumption.linkType,
        assumption.linkId ?? "",
      ]),
    );
  } else if (block.type === "custom") {
    const templateName = getCustomTemplate(block.definitionId)?.name ?? "";
    fragments.push(templateName, block.notes, ...Object.values(block.values).map(String));
  }

  return fragments.join(" ").toLowerCase();
}

function escapeForRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(input: string) {
  return input.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function collectBlockSearchDetails(block: WorkspaceBlock) {
  const details: string[] = [getDisplayBlockTitle(block)];

  if (block.type === "task-list") {
    details.push(
      ...block.tasks.flatMap((task) => [
        task.text,
        task.domain ?? "",
        task.dueDate ?? "",
        `${task.urgency}/10 urgency`,
        `${task.importance}/10 importance`,
        `${task.estimateMinutes} minutes`,
      ]),
    );
  } else if (block.type === "notes") {
    details.push(...block.body.split("\n"));
  } else if (block.type === "decision") {
    details.push(
      block.recommendation,
      ...block.pros.map((item) => item.text),
      ...block.cons.map((item) => item.text),
    );
  } else if (block.type === "tracker") {
    details.push(...block.entries.map((entry) => entry.label));
  } else if (block.type === "ai-prompt") {
    details.push(block.prompt, block.latestOutput);
  } else if (block.type === "time-orchestrator") {
    details.push(
      ...block.settings.domains.map(getWorkspaceTaskDomainLabel),
      ...block.settings.quadrants,
      block.settings.includeUnassigned ? "Unassigned" : "",
    );
  } else if (block.type === "kanban") {
    details.push(
      ...block.columns.map((column) => column.title),
      ...block.cards.flatMap((card) => [
        card.title,
        card.description,
        card.assignee,
        card.dueDate ?? "",
      ]),
    );
  } else if (block.type === "timeline") {
    details.push(
      ...block.milestones.flatMap((milestone) => [
        milestone.title,
        milestone.date ?? "",
        milestone.status,
        milestone.note,
      ]),
    );
  } else if (block.type === "scorecard") {
    details.push(
      ...block.metrics.flatMap((metric) => [
        metric.label,
        `${metric.value}/${metric.target}`,
        metric.unit,
      ]),
    );
  } else if (block.type === "okr-tracker") {
    details.push(
      ...block.objectives.flatMap((objective) => [
        objective.title,
        ...objective.keyResults.flatMap((keyResult) => [
          keyResult.title,
          `${keyResult.progress}%`,
        ]),
      ]),
    );
  } else if (block.type === "decision-matrix") {
    details.push(
      block.question,
      ...block.criteria.flatMap((criterion) => [criterion.label, `Weight ${criterion.weight}`]),
      ...block.options.flatMap((option) => [
        option.label,
        ...Object.values(option.scores).map((score) => `Score ${score}`),
      ]),
    );
  } else if (block.type === "business-model-canvas") {
    details.push(block.analysis, ...Object.values(block.cells));
  } else if (block.type === "assumption-tracker") {
    details.push(
      ...block.assumptions.flatMap((assumption) => [
        assumption.statement,
        assumption.owner,
        assumption.reviewDate ?? "",
        assumption.status,
        `${assumption.confidence}/5 confidence`,
        assumption.evidenceNotes,
      ]),
    );
  } else if (block.type === "custom") {
    const templateName = getCustomTemplate(block.definitionId)?.name ?? "";
    details.push(templateName, block.notes, ...Object.values(block.values).map(String));
  }

  return details.map((detail) => detail.trim()).filter(Boolean);
}

function getBlockSearchMatches(block: WorkspaceBlock) {
  if (!normalizedBlockSearch.value) {
    return [];
  }

  return collectBlockSearchDetails(block)
    .filter((detail) => detail.toLowerCase().includes(normalizedBlockSearch.value))
    .slice(0, 3);
}

function highlightSearchMatch(value: string) {
  const safeValue = escapeHtml(value);

  if (!normalizedBlockSearch.value) {
    return safeValue;
  }

  const pattern = new RegExp(escapeForRegex(normalizedBlockSearch.value), "ig");
  return safeValue.replace(
    pattern,
    `<mark class="rounded bg-warning/25 px-1 text-highlighted">$&</mark>`,
  );
}

function getCustomTemplate(definitionId: string) {
  return node.value?.customBlockTemplates.find((entry) => entry.id === definitionId) ?? null;
}

function getCustomFormulaResult(block: WorkspaceCustomBlock) {
  const template = getCustomTemplate(block.definitionId);

  return evaluateCustomBlockFormula(template?.formula?.expression, block.values);
}

function getCustomPromptPreview(block: WorkspaceCustomBlock) {
  const template = getCustomTemplate(block.definitionId);

  return template ? fillCustomBlockPromptTemplate(template, block) : "";
}

function getPriorityBadgeClass(priority: WorkspaceTaskPriority | null | undefined) {
  switch (priority) {
    case "high":
      return "border-error/40 bg-error/10 text-error";
    case "medium":
      return "border-warning/40 bg-warning/10 text-warning";
    case "low":
      return "border-success/40 bg-success/10 text-success";
    default:
      return "border-muted/60 bg-elevated/80 text-muted";
  }
}

function formatRelativeTaskMeta(item: WorkspaceCollectedTask) {
  const fragments = [`${item.tabTitle} / ${item.blockTitle}`];

  if (item.task.domain) {
    fragments.push(getWorkspaceTaskDomainLabel(item.task.domain));
  }

  if (item.task.dueDate) {
    fragments.push(`Due ${item.task.dueDate}`);
  }

  if (item.task.priority) {
    fragments.push(`${item.task.priority} priority`);
  }

  fragments.push(`U${item.task.urgency}`);
  fragments.push(`I${item.task.importance}`);

  if (item.task.estimateMinutes > 0) {
    fragments.push(`${item.task.estimateMinutes} min`);
  }

  return fragments.join(" • ");
}

function formatFormulaResult(value: number | null) {
  if (value === null) {
    return "Invalid formula";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

const renderNotesPreview = renderSimpleMarkdown;

provide(workspaceNodeEditorContextKey, {
  currentNode: node,
  blockSearch,
  normalizedBlockSearch,
  addBlockMenuItems,
  blockPresetMenuItems,
  tabEditor,
  priorityOptions,
  domainOptions,
  setActiveTab,
  openTabEditor,
  closeTabEditor,
  submitTabEditor,
  deleteActiveTab,
  saveNodeToMarketplace,
  saveActiveTabToMarketplace,
  addBlockToActiveTab,
  addBlockPresetToActiveTab,
  removeBlock,
  updateBlockTitle,
  toggleAgentContextBlock,
  clearAgentContextBlock,
  isAgentContextBlock,
  saveBlockToMarketplace,
  getTimeOrchestratorSummaryForBlock,
  mutateBlock,
  addTask,
  mutateTask,
  removeTask,
  addDecisionItem,
  mutateDecisionItem,
  removeDecisionItem,
  addTrackerEntry,
  mutateTrackerEntry,
  removeTrackerEntry,
  addKanbanColumn,
  mutateKanbanColumn,
  removeKanbanColumn,
  addKanbanCard,
  mutateKanbanCard,
  moveKanbanCard,
  removeKanbanCard,
  addTimelineMilestone,
  mutateTimelineMilestone,
  removeTimelineMilestone,
  moveTimelineMilestone,
  addScorecardMetric,
  mutateScorecardMetric,
  removeScorecardMetric,
  runPromptBlock,
  runCustomPrompt,
  toggleNotePreview,
  isNotePreviewEnabled,
  getDisplayTabTitle,
  getDisplayBlockTitle,
  getBlockSearchMatches,
  highlightSearchMatch,
  getCustomTemplate,
  getCustomFormulaResult,
  getCustomPromptPreview,
  getPriorityBadgeClass,
  formatRelativeTaskMeta,
  formatFormulaResult,
  renderNotesPreview,
});
</script>

<template>
  <div class="h-full w-full overflow-hidden">
    <div v-if="workspaceQuery.status === 'error'" class="p-6">
      <UAlert
        color="error"
        icon="i-lucide-alert-circle"
        title="Workspace unavailable"
        :description="workspaceQuery.error?.message || 'The user workspace could not be loaded.'"
      />
    </div>

    <div v-else-if="isWorkspaceInitialLoading" class="flex h-full w-full gap-0 overflow-hidden">
      <!-- Sidebar Skeleton -->
      <div class="w-80 border-r border-muted/30 bg-default/40 p-6 space-y-8">
        <div class="space-y-4">
          <USkeleton class="h-8 w-24 rounded-lg" />
          <div class="space-y-2">
            <USkeleton class="h-4 w-16 rounded-full" />
            <USkeleton class="h-10 w-48 rounded-xl" />
          </div>
        </div>
        <div class="space-y-3">
          <USkeleton class="h-4 w-20 rounded-full" />
          <USkeleton class="h-12 w-full rounded-2xl" />
          <USkeleton class="h-12 w-full rounded-2xl" />
          <USkeleton class="h-12 w-full rounded-2xl" />
        </div>
      </div>

      <!-- Main Area Skeleton -->
      <div class="flex-1 bg-elevated/5">
        <div
          class="h-16 border-b border-muted/20 bg-default/40 flex items-center justify-between px-6"
        >
          <USkeleton class="h-8 w-48 rounded-full" />
          <USkeleton class="h-10 w-64 rounded-full" />
        </div>
        <div class="p-12 space-y-10 max-w-4xl mx-auto">
          <USkeleton class="h-64 w-full rounded-[40px]" />
          <USkeleton class="h-96 w-full rounded-[40px]" />
        </div>
      </div>
    </div>

    <template v-else-if="node && activeTab">
      <div class="flex h-full min-h-0 w-full overflow-hidden">
        <div class="min-w-0 flex-1">
          <WorkspaceNodeShell
            :node="node"
            :active-tab="activeTab"
            :active-tab-id="activeTabId"
            :save-badge="saveBadge"
            :save-error="saveError"
            :visible-blocks="visibleBlocks"
          />
        </div>

        <div
          class="hidden shrink-0 overflow-hidden border-l border-neutral-200/60 bg-white/50 transition-[width,opacity] duration-300 dark:border-neutral-800/60 dark:bg-neutral-950/40 lg:block"
          :class="
            isAgentChatVisible
              ? 'w-[26rem] opacity-100'
              : 'pointer-events-none w-0 opacity-0'
          "
        >
          <div class="sticky top-0 flex h-full min-h-0 flex-col gap-3 p-3">
            <div
              v-if="agentContextState"
              class="rounded-[1.75rem] border border-neutral-200/70 bg-white/92 px-4 py-3 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/92"
            >
              <div class="flex items-start gap-3">
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                >
                  <UIcon name="i-lucide-square-dashed-mouse-pointer" class="size-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">
                    Block context
                  </p>
                  <p class="truncate text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                    {{ getDisplayBlockTitle(agentContextState.block) }}
                  </p>
                  <p class="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {{ node.title }} / {{ getDisplayTabTitle(agentContextState.tab) }}
                  </p>
                </div>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-x"
                  class="rounded-full"
                  @click="clearAgentContextBlock"
                />
              </div>
            </div>

            <div class="min-h-0 flex-1">
              <DashboardAgentChatPanel :nodes="agentChatNodes" @close="isAgentChatVisible = false" />
            </div>
          </div>
        </div>
      </div>

      <div
        class="pointer-events-none fixed bottom-4 right-3 top-20 z-40 flex w-[min(26rem,calc(100vw-1.5rem))] flex-col gap-3 transition-all duration-300 sm:bottom-6 sm:right-6 sm:top-24 lg:hidden"
        :class="
          isAgentChatVisible
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none translate-x-8 opacity-0'
        "
      >
        <div
          v-if="agentContextState"
          class="pointer-events-auto rounded-[1.75rem] border border-neutral-200/70 bg-white/92 px-4 py-3 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/92"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            >
              <UIcon name="i-lucide-square-dashed-mouse-pointer" class="size-4" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">
                Block context
              </p>
              <p class="truncate text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                {{ getDisplayBlockTitle(agentContextState.block) }}
              </p>
              <p class="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {{ node.title }} / {{ getDisplayTabTitle(agentContextState.tab) }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-x"
              class="rounded-full"
              @click="clearAgentContextBlock"
            />
          </div>
        </div>

        <div class="pointer-events-auto min-h-0 flex-1">
          <DashboardAgentChatPanel :nodes="agentChatNodes" @close="isAgentChatVisible = false" />
        </div>
      </div>

      <button
        v-if="!isAgentChatVisible"
        type="button"
        class="fixed bottom-8 right-8 z-50 flex size-14 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-2xl shadow-black/20 transition-all duration-300 hover:scale-110 active:scale-95 dark:bg-neutral-100 dark:text-neutral-900"
        @click="isAgentChatVisible = true"
      >
        <UIcon name="i-lucide-sparkles" class="size-6" />
      </button>

      <div v-if="isWorkspaceRefreshing" class="pointer-events-none fixed right-6 top-20 z-50">
        <div
          class="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-muted/70 bg-default/90 px-3 py-2 text-xs font-medium text-toned shadow-lg shadow-black/5 backdrop-blur-md"
        >
          <UIcon name="i-lucide-loader-2" class="size-3.5 animate-spin text-primary" />
          Refreshing workspace
        </div>
      </div>
    </template>

    <div v-else class="mx-auto flex max-w-xl flex-col gap-4 py-16 px-6">
      <UAlert
        color="warning"
        icon="i-lucide-search-x"
        title="Node not found"
        description="This node is not in your workspace. It may have been removed, or the link is invalid."
      />
      <UButton to="/dashboard" color="neutral" variant="soft" class="rounded-xl">
        Return to dashboard
      </UButton>
    </div>
  </div>
</template>
