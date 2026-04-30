<script setup lang="ts">
import {
  cloneWorkspaceNodes,
  createDefaultWorkspaceTab,
  createWorkspace2x2MatrixBlock,
  createWorkspaceAgencyBillingReportBlock,
  createWorkspaceAgencyProjectManagerBlock,
  createWorkspaceAgencySettingsBlock,
  createWorkspaceAgencyTimeEntriesLogBlock,
  createWorkspaceAgencyTimeSummaryBlock,
  createWorkspaceAgencyTimeTrackerBlock,
  createWorkspaceAiPromptBlock,
  createWorkspaceAssumptionTrackerBlock,
  createWorkspaceAuthorityScorecardBlock,
  createWorkspaceBusinessModelCanvasBlock,
  createWorkspaceChecklistBlock,
  createWorkspaceCohortHealthDashboardBlock,
  createWorkspaceCollectionsTrackerBlock,
  createWorkspaceContentPipelineBlock,
  createWorkspaceContentQualityRadarBlock,
  createWorkspaceContentRoiTrackerBlock,
  createWorkspaceCourseRoadmapBlock,
  createWorkspaceDealScoringMatrixBlock,
  createWorkspaceDecisionBlock,
  createWorkspaceDecisionMatrixBlock,
  createWorkspaceDelegationMatrixBlock,
  createWorkspaceEisenhowerMatrixBlock,
  createWorkspaceForecastConfidenceBoardBlock,
  createWorkspaceHabitGridBlock,
  createWorkspaceHookBankBlock,
  createWorkspaceId,
  createWorkspaceKanbanBlock,
  createWorkspaceKanbanCard,
  createWorkspaceKanbanColumn,
  createWorkspaceLeadershipRhythmPlannerBlock,
  createWorkspaceLearningOutcomesMatrixBlock,
  createWorkspaceMessageHouseBlock,
  createWorkspaceNotesBlock,
  createWorkspaceOkrTrackerBlock,
  createWorkspacePipelineFunnelBlock,
  createWorkspacePricingSimulatorBlock,
  createWorkspaceProcessBlock,
  createWorkspaceProfitabilityCashFlowBlock,
  createWorkspaceProsConsBlock,
  createWorkspaceScorecardBlock,
  createWorkspaceScorecardMetric,
  createWorkspaceSeatPlannerBlock,
  createWorkspaceSkillsHeatMapBlock,
  createWorkspaceSwotBlock,
  createWorkspaceTableBlock,
  createWorkspaceTalentGridBlock,
  createWorkspaceTask,
  createWorkspaceTaskListBlock,
  createWorkspaceTimeOrchestratorBlock,
  createWorkspaceTimelineBlock,
  createWorkspaceTimelineMilestone,
  createWorkspaceTrackerBlock,
  collectWorkspaceNodeTasks,
  evaluateCustomBlockFormula,
  filterCollectedTasksByTimeOrchestratorSettings,
  fillCustomBlockPromptTemplate,
  generateWorkspacePromptOutput,
  getTimeOrchestratorSummary,
  getWorkspaceTaskDomainLabel,
  normalizeWorkspaceNode,
  type WorkspaceBlock,
  type WorkspaceCollectedTask,
  type WorkspaceCustomBlock,
  type WorkspaceEisenhowerMatrixBlock,
  type WorkspaceKanbanCard,
  type WorkspaceNode,
  type WorkspaceNodeTab,
  type WorkspaceTask,
  type WorkspaceTimeOrchestratorBlock,
} from "@brainiac/workspace";
import type { DropdownMenuItem } from "@nuxt/ui";
import { useMutation } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";

import {
  workspaceNodeEditorContextKey,
  type WorkspaceTabEditorMode,
} from "~/components/workspace/node/context";
import { useWorkspaceNodeSharing } from "~/composables/workspace-node/useWorkspaceNodeSharing";
import {
  workspaceNodeDomainOptions,
  workspaceNodePriorityOptions,
} from "~/constants/workspace-node-options";
import { getErrorMessage } from "~/utils/get-error-message";
import { renderSimpleMarkdown } from "~/utils/render-simple-markdown";
import { createWorkspaceAddBlockMenuItems } from "~/utils/workspace-add-block-menu";
import {
  getWorkspaceBlockPreset,
  workspaceBlockPresets,
  type WorkspaceBlockPresetId,
} from "~/utils/workspace-block-presets";
import {
  createBlockMarketplacePayload,
  createNodeMarketplacePayload,
  createTabMarketplacePayload,
} from "~/utils/workspace-marketplace";
import {
  formatWorkspaceFormulaResult,
  formatWorkspaceRelativeTaskMeta,
  getWorkspaceTaskPriorityBadgeClass,
} from "~/utils/workspace-node-formatters";

definePageMeta({
  layout: "app",
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
const blockAgentPromptMutation = useMutation(orpc.agent.chat.turn.mutationOptions());

const nodeId = computed(() => String(route.params.id ?? ""));
const emptyDropdownItems: DropdownMenuItem[][] = [];
type AgentContextTarget = {
  tabId: string;
  blockId: string;
};

const tabEditor = reactive({
  open: false,
  mode: "create" as WorkspaceTabEditorMode,
  title: "",
});

const node = computed(() => {
  return draftNodes.value.find((entry) => entry.id === nodeId.value) ?? null;
});

const activeTabId = computed(() => node.value?.viewState.activeTabId ?? "");
const { setAgentDockOpen } = useAppShell();
useAppShellCustomDock();
useAppShellPageTitle(computed(() => node.value?.title ?? "Node"));
const agentContextTargets = ref<AgentContextTarget[]>([]);
const {
  activeTeamMembership,
  activeTeamRole,
  canEditNodeContent,
  canManageNodeSharing,
  nodeOwnerLabel,
  nodeShareTeamId,
  nodeVisibilityBadgeClass,
  nodeVisibilityLabel,
  shareCurrentNodeToTeam,
  shareNodeMutation,
  teamListQuery,
  teams,
  unshareCurrentNodeFromTeam,
  unshareNodeMutation,
} = useWorkspaceNodeSharing({
  node,
  workspaceQuery,
});

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

const agentContextStates = computed(() => {
  const currentNode = node.value;

  if (!currentNode || agentContextTargets.value.length === 0) {
    return [];
  }

  return agentContextTargets.value.flatMap((target) => {
    const tab = currentNode.tabs.find((entry) => entry.id === target.tabId);
    const block = tab?.blocks.find((entry) => entry.id === target.blockId);

    if (!tab || !block) {
      return [];
    }

    return [
      {
        tab,
        block,
        target,
        targetKey: getAgentContextTargetKey(target),
        scopedNode: createAgentContextNode(currentNode, tab, block),
      },
    ];
  });
});

const agentContextBadgeItems = computed(() => {
  const currentNode = node.value;

  if (!currentNode) {
    return [];
  }

  return agentContextStates.value.map(({ tab, block, targetKey }) => ({
    id: targetKey,
    label: getDisplayBlockTitle(block),
    title: `${currentNode.title || "Untitled node"} / ${getDisplayTabTitle(tab)}`,
    tabId: tab.id,
    blockId: block.id,
  }));
});

const agentChatNodes = computed(() => {
  if (!node.value) {
    return [];
  }

  if (agentContextStates.value.length === 0) {
    return [node.value];
  }

  return agentContextStates.value.map((entry) => entry.scopedNode);
});

watch(agentContextStates, (value) => {
  if (value.length === agentContextTargets.value.length) {
    return;
  }

  const validKeys = new Set(value.map((entry) => entry.targetKey));
  agentContextTargets.value = agentContextTargets.value.filter((target) =>
    validKeys.has(getAgentContextTargetKey(target)),
  );
});

const addBlockMenuItems = computed<DropdownMenuItem[][]>(() => {
  if (!activeTab.value || !node.value) {
    return emptyDropdownItems;
  }

  return createWorkspaceAddBlockMenuItems(addBlockToActiveTab, node.value);
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

const priorityOptions = workspaceNodePriorityOptions;

const domainOptions = workspaceNodeDomainOptions;

const agencyOperationsBlockTypeSet = new Set<WorkspaceBlock["type"]>([
  "agency-project-manager",
  "agency-settings",
  "agency-time-tracker",
  "agency-time-entries-log",
  "agency-time-summary",
]);

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
    const entry = nodes[index];

    if (!entry) {
      return;
    }

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

function mutateTypedBlock<TBlockType extends WorkspaceBlock["type"]>(
  tabId: string,
  blockId: string,
  type: TBlockType,
  mutator: (
    block: Extract<WorkspaceBlock, { type: TBlockType }>,
    tab: WorkspaceNodeTab,
    nodeEntry: WorkspaceNode,
    timestamp: string,
  ) => void,
) {
  mutateBlock(tabId, blockId, (block, tab, nodeEntry, timestamp) => {
    if (block.type !== type) {
      return;
    }

    mutator(block as Extract<WorkspaceBlock, { type: TBlockType }>, tab, nodeEntry, timestamp);
  });
}

function getBlockOperationTargetKey(tabId: string, blockId: string) {
  return `${tabId}:${blockId}`;
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

  if (
    !window.confirm(
      `Delete workspace "${getDisplayTabTitle(activeTab.value)}" and all of its blocks?`,
    )
  ) {
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
  if (!activeTab.value || !node.value) {
    return;
  }

  if (!canEditNodeContent.value) {
    toast.add({
      title: "Read-only role",
      description: "Your role can view this shared node but cannot add blocks.",
      color: "warning",
    });
    return;
  }

  const isAgencyOperationsBlock = agencyOperationsBlockTypeSet.has(type);
  let preferredAgencyTeamId =
    node.value.teamId ??
    activeTeamMembership.value?.id ??
    nodeShareTeamId.value ??
    teams.value[0]?.id ??
    null;

  if (
    isAgencyOperationsBlock &&
    node.value.visibility !== "team" &&
    !node.value.teamId &&
    teams.value.length > 1
  ) {
    const teamChoices = teams.value.map((team, index) => `${index + 1}. ${team.name}`).join("\n");
    const selection = window.prompt(
      `Select a team for this Agency Operations block:\n${teamChoices}`,
      "1",
    );

    if (selection === null) {
      return;
    }

    const selectedIndex = Number(selection) - 1;

    if (
      Number.isInteger(selectedIndex) &&
      selectedIndex >= 0 &&
      selectedIndex < teams.value.length
    ) {
      preferredAgencyTeamId = teams.value[selectedIndex]?.id ?? preferredAgencyTeamId;
    }
  }

  if (isAgencyOperationsBlock && !preferredAgencyTeamId) {
    toast.add({
      title: "Team required",
      description: "Create or join a team before adding Agency Operations blocks.",
      color: "warning",
    });
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
    case "table":
      nextBlock = createWorkspaceTableBlock();
      break;
    case "checklist":
      nextBlock = createWorkspaceChecklistBlock();
      break;
    case "decision":
      nextBlock = createWorkspaceDecisionBlock();
      break;
    case "pros-cons":
      nextBlock = createWorkspaceProsConsBlock();
      break;
    case "swot":
      nextBlock = createWorkspaceSwotBlock();
      break;
    case "tracker":
      nextBlock = createWorkspaceTrackerBlock();
      break;
    case "ai-prompt":
      nextBlock = createWorkspaceAiPromptBlock();
      break;
    case "habit-grid":
      nextBlock = createWorkspaceHabitGridBlock();
      break;
    case "process":
      nextBlock = createWorkspaceProcessBlock();
      break;
    case "2x2-matrix":
      nextBlock = createWorkspace2x2MatrixBlock();
      break;
    case "course-roadmap":
      nextBlock = createWorkspaceCourseRoadmapBlock();
      break;
    case "learning-outcomes-matrix":
      nextBlock = createWorkspaceLearningOutcomesMatrixBlock();
      break;
    case "time-orchestrator":
      nextBlock = createWorkspaceTimeOrchestratorBlock();
      break;
    case "cohort-health-dashboard":
      nextBlock = createWorkspaceCohortHealthDashboardBlock();
      break;
    case "eisenhower-matrix":
      nextBlock = createWorkspaceEisenhowerMatrixBlock();
      break;
    case "leadership-rhythm-planner":
      nextBlock = createWorkspaceLeadershipRhythmPlannerBlock();
      break;
    case "kanban":
      nextBlock = createWorkspaceKanbanBlock();
      break;
    case "timeline":
      nextBlock = createWorkspaceTimelineBlock();
      break;
    case "skills-heat-map":
      nextBlock = createWorkspaceSkillsHeatMapBlock();
      break;
    case "delegation-matrix":
      nextBlock = createWorkspaceDelegationMatrixBlock();
      break;
    case "talent-grid":
      nextBlock = createWorkspaceTalentGridBlock();
      break;
    case "seat-planner":
      nextBlock = createWorkspaceSeatPlannerBlock();
      break;
    case "deal-scoring-matrix":
      nextBlock = createWorkspaceDealScoringMatrixBlock();
      break;
    case "pipeline-funnel":
      nextBlock = createWorkspacePipelineFunnelBlock();
      break;
    case "forecast-confidence-board":
      nextBlock = createWorkspaceForecastConfidenceBoardBlock();
      break;
    case "content-pipeline":
      nextBlock = createWorkspaceContentPipelineBlock();
      break;
    case "content-quality-radar":
      nextBlock = createWorkspaceContentQualityRadarBlock();
      break;
    case "content-roi-tracker":
      nextBlock = createWorkspaceContentRoiTrackerBlock();
      break;
    case "authority-scorecard":
      nextBlock = createWorkspaceAuthorityScorecardBlock();
      break;
    case "hook-bank":
      nextBlock = createWorkspaceHookBankBlock();
      break;
    case "message-house":
      nextBlock = createWorkspaceMessageHouseBlock();
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
    case "profitability-cash-flow":
      nextBlock = createWorkspaceProfitabilityCashFlowBlock();
      break;
    case "pricing-simulator":
      nextBlock = createWorkspacePricingSimulatorBlock();
      break;
    case "collections-tracker":
      nextBlock = createWorkspaceCollectionsTrackerBlock();
      break;
    case "agency-project-manager":
      nextBlock = createWorkspaceAgencyProjectManagerBlock({
        teamId: preferredAgencyTeamId,
      });
      break;
    case "agency-time-tracker":
      nextBlock = createWorkspaceAgencyTimeTrackerBlock({
        teamId: preferredAgencyTeamId,
      });
      break;
    case "agency-time-entries-log":
      nextBlock = createWorkspaceAgencyTimeEntriesLogBlock({
        teamId: preferredAgencyTeamId,
      });
      break;
    case "agency-time-summary":
      nextBlock = createWorkspaceAgencyTimeSummaryBlock({
        teamId: preferredAgencyTeamId,
      });
      break;
    case "agency-billing-report":
      nextBlock = createWorkspaceAgencyBillingReportBlock({
        teamId: preferredAgencyTeamId,
      });
      break;
    case "agency-settings":
      nextBlock = createWorkspaceAgencySettingsBlock({
        teamId: preferredAgencyTeamId,
      });
      break;
    case "custom":
      return;
  }

  mutateTab(activeTab.value.id, (tab) => {
    tab.blocks.unshift(nextBlock);
  });
}

function addBlockPresetToActiveTab(presetId: WorkspaceBlockPresetId) {
  if (!activeTab.value) {
    return;
  }

  if (!canEditNodeContent.value) {
    toast.add({
      title: "Read-only role",
      description: "Your role can view this shared node but cannot add blocks.",
      color: "warning",
    });
    return;
  }

  const preset = getWorkspaceBlockPreset(presetId);

  if (!preset) {
    return;
  }

  mutateTab(activeTab.value.id, (tab) => {
    tab.blocks.unshift(...preset.createBlocks());
  });
}

function removeBlock(tabId: string, blockId: string) {
  const block = node.value?.tabs
    .find((tab) => tab.id === tabId)
    ?.blocks.find((entry) => entry.id === blockId);

  if (!block) {
    return;
  }

  if (!window.confirm(`Delete block "${getDisplayBlockTitle(block)}"?`)) {
    return;
  }

  if (isAgentContextBlock(tabId, blockId)) {
    removeAgentContextBlock(tabId, blockId);
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

function mutateCollectedTask(item: WorkspaceCollectedTask, mutator: (task: WorkspaceTask) => void) {
  updateDraftNodes((nodes) => {
    const sourceNodeIndex = nodes.findIndex((entry) => entry.id === item.sourceNodeId);

    if (sourceNodeIndex < 0) {
      return;
    }

    const sourceNode = nodes[sourceNodeIndex];

    if (!sourceNode) {
      return;
    }

    const tab = sourceNode.tabs.find((entry) => entry.id === item.tabId);

    if (!tab) {
      return;
    }

    const block = tab.blocks.find((entry) => entry.id === item.blockId);

    const timestamp = new Date().toISOString();

    if (block?.type === "content-pipeline") {
      const pipelineItem = block.items.find((entry) => entry.id === item.task.id);

      if (!pipelineItem) {
        return;
      }

      const taskMirror: WorkspaceTask = {
        id: pipelineItem.id,
        text: pipelineItem.title,
        completed: pipelineItem.status === "published",
        dueDate: null,
        priority: item.task.priority ?? "medium",
        domain: "content",
        urgency: item.task.urgency,
        importance: item.task.importance,
        estimateMinutes: item.task.estimateMinutes,
      };

      mutator(taskMirror);

      pipelineItem.title = taskMirror.text;
      pipelineItem.status = taskMirror.completed ? "published" : "draft";
      block.updatedAt = timestamp;
      tab.updatedAt = timestamp;
      sourceNode.updatedAt = timestamp;
      sourceNode.label = sourceNode.title;
      nodes[sourceNodeIndex] = normalizeWorkspaceNode(sourceNode);
      return;
    }

    if (!block || (block.type !== "task-list" && block.type !== "eisenhower-matrix")) {
      return;
    }

    const task = block.tasks.find((entry) => entry.id === item.task.id);

    if (!task) {
      return;
    }

    mutator(task);
    block.updatedAt = timestamp;
    tab.updatedAt = timestamp;
    sourceNode.updatedAt = timestamp;
    sourceNode.label = sourceNode.title;

    nodes[sourceNodeIndex] = normalizeWorkspaceNode(sourceNode);
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

const allNodes = computed(() => draftNodes.value);

function connectSource(standardNodeId: string) {
  if (!node.value) return;
  workspaceStore.connectNodePair({
    orchestratorNodeId: node.value.id,
    standardNodeId,
  });
}

function disconnectSource(standardNodeId: string) {
  if (!node.value) return;
  workspaceStore.disconnectNodePair({
    orchestratorNodeId: node.value.id,
    standardNodeId,
  });
}

function removeCollectedTask(item: WorkspaceCollectedTask) {
  updateDraftNodes((nodes) => {
    const sourceNode = nodes.find((entry) => entry.id === item.sourceNodeId);
    if (!sourceNode) return;

    const tab = sourceNode.tabs.find((entry) => entry.id === item.tabId);
    if (!tab) return;

    const block = tab.blocks.find((entry) => entry.id === item.blockId);
    if (!block) return;

    const timestamp = new Date().toISOString();

    if (block.type === "content-pipeline") {
      block.items = block.items.filter((entry) => entry.id !== item.task.id);
    } else if (block.type === "task-list" || block.type === "eisenhower-matrix") {
      block.tasks = block.tasks.filter((entry) => entry.id !== item.task.id);
    } else {
      return;
    }

    block.updatedAt = timestamp;
    tab.updatedAt = timestamp;
    sourceNode.updatedAt = timestamp;
    sourceNode.label = sourceNode.title;
    const idx = nodes.indexOf(sourceNode);
    if (idx >= 0) nodes[idx] = normalizeWorkspaceNode(sourceNode);
  });
}

function addTaskToSource(sourceNodeId: string) {
  updateDraftNodes((nodes) => {
    const sourceNode = nodes.find((entry) => entry.id === sourceNodeId);
    if (!sourceNode) return;

    let targetBlock: { tasks: WorkspaceTask[] } | null = null;

    for (const tab of sourceNode.tabs) {
      for (const block of tab.blocks) {
        if (block.type === "task-list" || block.type === "eisenhower-matrix") {
          targetBlock = block;
          break;
        }
      }
      if (targetBlock) break;
    }

    if (!targetBlock) return;

    targetBlock.tasks.push(createWorkspaceTask());

    const timestamp = new Date().toISOString();
    sourceNode.updatedAt = timestamp;
    sourceNode.label = sourceNode.title;
    const idx = nodes.indexOf(sourceNode);
    if (idx >= 0) nodes[idx] = normalizeWorkspaceNode(sourceNode);
  });
}

async function navigateToSource(sourceNodeId: string) {
  await navigateTo(`/node/${sourceNodeId}`);
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

const activeBlockOperationTarget = ref<{
  tabId: string;
  blockId: string;
  label: string;
} | null>(null);

async function runPromptBlock(tabId: string, blockId: string) {
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

  const prompt = block.prompt.trim();
  const scopedNodes = block.includeContext ? cloneWorkspaceNodes([node.value]) : undefined;
  const content = block.includeContext
    ? prompt
    : [
        "Answer the user's request without using any workspace or dashboard context.",
        "Treat this as a standalone prompt.",
        "",
        prompt,
      ].join("\n");

  activeBlockOperationTarget.value = {
    tabId,
    blockId,
    label: "Running prompt",
  };

  try {
    const response = await blockAgentPromptMutation.mutateAsync({
      content,
      nodes: draftNodes.value,
      scopeNodes: scopedNodes,
      contextNodeTitles: block.includeContext ? [node.value.title] : [],
      toolPreset: "ask",
    });

    if (response.workspaceSnapshot) {
      workspaceStore.applyWorkspaceSnapshot(
        response.workspaceSnapshot.nodes,
        response.workspaceSnapshot.updatedAt ?? null,
      );
    }

    const output = response.assistantMessage.content;

    mutateTypedBlock(tabId, blockId, "ai-prompt", (entry, _tab, _node, timestamp) => {
      entry.latestOutput = output;
      entry.outputHistory.unshift({
        id: createWorkspaceId("output"),
        prompt,
        output,
        createdAt: timestamp,
      });
      entry.outputHistory = entry.outputHistory.slice(0, 8);
    });
  } finally {
    if (
      getBlockOperationTargetKey(tabId, blockId) ===
      getBlockOperationTargetKey(
        activeBlockOperationTarget.value?.tabId ?? "",
        activeBlockOperationTarget.value?.blockId ?? "",
      )
    ) {
      activeBlockOperationTarget.value = null;
    }
  }
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

async function runBlockAgentPrompt(tabId: string, blockId: string, prompt: string) {
  if (!node.value) {
    throw new Error("Node is unavailable.");
  }

  const tab = node.value.tabs.find((entry) => entry.id === tabId);
  const block = tab?.blocks.find((entry) => entry.id === blockId);

  if (!tab || !block) {
    throw new Error("Block context is unavailable.");
  }

  const scopedNode = createAgentContextNode(node.value, tab, block);
  activeBlockOperationTarget.value = {
    tabId,
    blockId,
    label: "Running analysis",
  };

  try {
    const response = await blockAgentPromptMutation.mutateAsync({
      content: prompt,
      nodes: draftNodes.value,
      scopeNodes: [scopedNode],
      contextNodeTitles: [scopedNode.title],
      toolPreset: "ask",
    });

    if (response.workspaceSnapshot) {
      workspaceStore.applyWorkspaceSnapshot(
        response.workspaceSnapshot.nodes,
        response.workspaceSnapshot.updatedAt ?? null,
      );
    }

    return response.assistantMessage.content;
  } finally {
    if (
      getBlockOperationTargetKey(tabId, blockId) ===
      getBlockOperationTargetKey(
        activeBlockOperationTarget.value?.tabId ?? "",
        activeBlockOperationTarget.value?.blockId ?? "",
      )
    ) {
      activeBlockOperationTarget.value = null;
    }
  }
}

function getBlockOperationState(tabId: string, blockId: string) {
  const isTargetBlock =
    getBlockOperationTargetKey(tabId, blockId) ===
    getBlockOperationTargetKey(
      activeBlockOperationTarget.value?.tabId ?? "",
      activeBlockOperationTarget.value?.blockId ?? "",
    );

  return {
    pending: blockAgentPromptMutation.isPending.value && isTargetBlock,
    label:
      blockAgentPromptMutation.isPending.value && isTargetBlock
        ? (activeBlockOperationTarget.value?.label ?? "Working")
        : null,
  };
}

function isBlockOperationPending(tabId: string, blockId: string) {
  return getBlockOperationState(tabId, blockId).pending;
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
  return node.value
    ? getTimeOrchestratorSummary(node.value, block.settings, new Date(), draftNodes.value)
    : null;
}

function getScopedEisenhowerTasksForBlock(block: WorkspaceEisenhowerMatrixBlock) {
  if (!node.value) {
    return [];
  }

  if (node.value.nodeType === "orchestrator") {
    return filterCollectedTasksByTimeOrchestratorSettings(
      collectWorkspaceNodeTasks(node.value, draftNodes.value),
      block.settings,
    );
  }

  return filterCollectedTasksByTimeOrchestratorSettings(
    block.tasks.map((task) => ({
      sourceNodeId: node.value.id,
      sourceNodeTitle: node.value.title.trim() || node.value.label.trim() || "Untitled node",
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      tabId: activeTab.value?.id ?? block.id,
      tabTitle: getDisplayTabTitle(activeTab.value),
      task,
    })),
    block.settings,
  );
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

function getAgentContextTargetKey(target: AgentContextTarget) {
  return `${target.tabId}::${target.blockId}`;
}

function removeAgentContextBlock(tabId: string, blockId: string) {
  agentContextTargets.value = agentContextTargets.value.filter(
    (target) => target.tabId !== tabId || target.blockId !== blockId,
  );
}

function setAgentContextBlock(tabId: string, blockId: string) {
  if (!isAgentContextBlock(tabId, blockId)) {
    agentContextTargets.value = [...agentContextTargets.value, { tabId, blockId }];
  }

  setAgentDockOpen(true);
}

function toggleAgentContextBlock(tabId: string, blockId: string) {
  if (isAgentContextBlock(tabId, blockId)) {
    removeAgentContextBlock(tabId, blockId);
    return;
  }

  setAgentContextBlock(tabId, blockId);
}

function clearAgentContextBlock() {
  agentContextTargets.value = [];
}

function isAgentContextBlock(tabId: string, blockId: string) {
  return agentContextTargets.value.some(
    (target) => target.tabId === tabId && target.blockId === blockId,
  );
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
  } else if (block.type === "table") {
    fragments.push(
      ...block.columns.map((column) => column.label),
      ...block.rows.flatMap((row) => block.columns.map((column) => row.cells[column.id] ?? "")),
    );
  } else if (block.type === "checklist") {
    fragments.push(
      ...block.items.flatMap((item) => [item.text, item.completed ? "completed" : "open"]),
    );
  } else if (block.type === "decision") {
    fragments.push(
      block.recommendation,
      ...block.pros.flatMap((item) => [item.text, String(item.weight)]),
      ...block.cons.flatMap((item) => [item.text, String(item.weight)]),
    );
  } else if (block.type === "pros-cons") {
    fragments.push(
      ...block.pros.flatMap((item) => [item.text, String(item.weight), "pro"]),
      ...block.cons.flatMap((item) => [item.text, String(item.weight), "con"]),
    );
  } else if (block.type === "swot") {
    fragments.push(
      block.cells.strengths,
      block.cells.weaknesses,
      block.cells.opportunities,
      block.cells.threats,
    );
  } else if (block.type === "tracker") {
    fragments.push(
      String(block.goal ?? ""),
      ...block.entries.flatMap((entry) => [entry.label, String(entry.value)]),
    );
  } else if (block.type === "ai-prompt") {
    fragments.push(
      block.includeContext ? "with context" : "without context",
      block.prompt,
      block.latestOutput,
    );
  } else if (block.type === "habit-grid") {
    fragments.push(
      ...block.habits.flatMap((habit) => [
        habit.name,
        ...Object.entries(habit.days).flatMap(([day, completed]) => [
          day,
          completed ? "done" : "open",
        ]),
      ]),
    );
  } else if (block.type === "process") {
    fragments.push(
      ...block.steps.flatMap((step) => [
        step.title,
        step.note,
        step.completed ? "completed" : "open",
      ]),
    );
  } else if (block.type === "2x2-matrix") {
    fragments.push(
      block.xAxisLabel,
      block.xStartLabel,
      block.xEndLabel,
      block.yAxisLabel,
      block.yStartLabel,
      block.yEndLabel,
      block.quadrants.topLeft.name,
      ...block.quadrants.topLeft.items.map((item) => item.text),
      block.quadrants.topRight.name,
      ...block.quadrants.topRight.items.map((item) => item.text),
      block.quadrants.bottomLeft.name,
      ...block.quadrants.bottomLeft.items.map((item) => item.text),
      block.quadrants.bottomRight.name,
      ...block.quadrants.bottomRight.items.map((item) => item.text),
    );
  } else if (block.type === "course-roadmap") {
    fragments.push(
      ...block.courses.flatMap((course) => [
        course.name,
        course.status,
        ...course.lessons.flatMap((lesson) => [
          lesson.title,
          lesson.recorded ? "recorded" : "pending",
        ]),
        ...course.outcomes.map((outcome) => outcome.text),
      ]),
    );
  } else if (block.type === "learning-outcomes-matrix") {
    fragments.push(
      block.prompt,
      block.latestOutput,
      block.courseBlockId ?? "",
      block.courseId ?? "",
    );
  } else if (block.type === "time-orchestrator") {
    fragments.push(
      ...block.settings.domains,
      ...block.settings.quadrants,
      block.settings.includeUnassigned ? "unassigned" : "",
    );
  } else if (block.type === "cohort-health-dashboard") {
    fragments.push(
      ...block.cohorts.flatMap((cohort) => [
        cohort.name,
        String(cohort.seatsSold),
        String(cohort.capacity),
        String(cohort.revenueEgp),
        cohort.startDate ?? "",
        cohort.status,
        cohort.refundRisk ? "refund risk" : "",
        cohort.completionRisk ? "completion risk" : "",
      ]),
    );
  } else if (block.type === "eisenhower-matrix") {
    const scopedTasks = getScopedEisenhowerTasksForBlock(block);

    fragments.push(
      block.latestBattlePlan,
      ...scopedTasks.flatMap(({ task, sourceNodeTitle, blockTitle }) => [
        task.text,
        task.domain ?? "",
        task.priority ?? "",
        task.dueDate ?? "",
        String(task.urgency),
        String(task.importance),
        String(task.estimateMinutes),
        task.completed ? "completed" : "open",
        sourceNodeTitle,
        blockTitle,
      ]),
    );
  } else if (block.type === "leadership-rhythm-planner") {
    fragments.push(
      block.filter,
      ...block.meetings.flatMap((meeting) => [
        meeting.name,
        meeting.rhythm,
        meeting.owner,
        meeting.participants,
        meeting.purpose,
        String(meeting.durationMinutes),
        meeting.nextDate ?? "",
        meeting.status,
      ]),
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
  } else if (block.type === "skills-heat-map") {
    fragments.push(
      ...block.members.flatMap((member) => [
        member.name,
        member.role,
        ...Object.entries(member.scores).flatMap(([dimension, score]) => [
          dimension,
          String(score),
        ]),
      ]),
    );
  } else if (block.type === "delegation-matrix") {
    fragments.push(
      String(block.hourlyRate),
      ...block.items.flatMap((item) => [
        item.task,
        item.from,
        item.to,
        String(item.hoursPerWeek),
        item.status,
      ]),
    );
  } else if (block.type === "talent-grid") {
    fragments.push(
      ...block.members.flatMap((member) => [
        member.name,
        member.role,
        String(member.performance),
        String(member.potential),
      ]),
    );
  } else if (block.type === "seat-planner") {
    fragments.push(
      block.filter,
      ...block.seats.flatMap((seat) => [
        seat.name,
        seat.owner,
        seat.function,
        seat.health,
        seat.load,
        seat.backupOwner,
        seat.notes,
      ]),
    );
  } else if (block.type === "deal-scoring-matrix") {
    fragments.push(
      ...block.deals.flatMap((deal) => [
        deal.clientName,
        String(deal.valueEgp),
        deal.temperature,
        String(deal.score),
        deal.stage,
        deal.nextAction,
        deal.dueDate ?? "",
      ]),
    );
  } else if (block.type === "pipeline-funnel") {
    fragments.push(
      ...block.deals.flatMap((deal) => [
        deal.clientName,
        String(deal.valueEgp),
        deal.temperature,
        deal.stage,
      ]),
    );
  } else if (block.type === "forecast-confidence-board") {
    fragments.push(
      String(block.targetRevenueEgp),
      ...block.deals.flatMap((deal) => [
        deal.clientName,
        String(deal.valueEgp),
        deal.bucket,
        deal.expectedCloseMonth ?? "",
        String(deal.confidence),
        deal.owner,
        deal.nextAction,
      ]),
    );
  } else if (block.type === "content-pipeline") {
    fragments.push(
      ...block.items.flatMap((item) => [item.title, item.status, item.platform, item.assignee]),
    );
  } else if (block.type === "content-quality-radar") {
    fragments.push(
      ...Object.entries(block.scores).flatMap(([dimension, score]) => [dimension, String(score)]),
    );
  } else if (block.type === "content-roi-tracker") {
    fragments.push(
      block.sortBy,
      ...block.items.flatMap((item) => [
        item.title,
        item.platform,
        item.campaign,
        item.goal,
        String(item.reach),
        String(item.leads),
        String(item.conversionInfluence),
        String(item.repurposeValue),
      ]),
    );
  } else if (block.type === "authority-scorecard") {
    fragments.push(
      ...Object.entries(block.metrics).flatMap(([metric, entry]) => [
        metric,
        String(entry.value),
        String(entry.target),
      ]),
    );
  } else if (block.type === "hook-bank") {
    fragments.push(
      ...block.hooks.flatMap((hook) => [hook.category, hook.text, String(hook.score)]),
    );
  } else if (block.type === "message-house") {
    fragments.push(
      block.brandPromise,
      ...block.pillars.flatMap((pillar) => [pillar.title, pillar.body]),
      block.audiencePains,
      block.proofPoints,
      block.voicePrinciples,
      block.latestStressTest,
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
  } else if (block.type === "profitability-cash-flow") {
    fragments.push(
      ...block.clients.flatMap((client) => [
        client.name,
        client.paymentStatus,
        String(client.healthPercent),
        String(client.revenueEgp),
        String(client.costEgp),
      ]),
      ...block.expenses.flatMap((expense) => [expense.category, String(expense.amountEgp)]),
    );
  } else if (block.type === "pricing-simulator") {
    fragments.push(
      String(block.activeClients),
      String(block.hoursPerClientPerMonth),
      String(block.hourlyRateEgp),
      String(block.monthlyOverheadEgp),
      String(block.targetMarginPercent),
    );
  } else if (block.type === "collections-tracker") {
    fragments.push(
      block.filter,
      ...block.invoices.flatMap((invoice) => [
        invoice.clientName,
        String(invoice.amountEgp),
        invoice.dueDate ?? "",
        invoice.owner,
        invoice.nextFollowUpDate ?? "",
        invoice.status,
        invoice.notes,
        invoice.paidAt ?? "",
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
  } else if (block.type === "table") {
    details.push(
      ...block.columns.map((column) => column.label),
      ...block.rows.flatMap((row, index) => [
        `Row ${index + 1}`,
        ...block.columns.map((column) => row.cells[column.id] ?? ""),
      ]),
    );
  } else if (block.type === "checklist") {
    details.push(
      ...block.items.flatMap((item) => [item.text, item.completed ? "Completed" : "Open"]),
    );
  } else if (block.type === "decision") {
    details.push(
      block.recommendation,
      ...block.pros.map((item) => item.text),
      ...block.cons.map((item) => item.text),
    );
  } else if (block.type === "pros-cons") {
    details.push(
      ...block.pros.flatMap((item) => [item.text, `Pro weight ${item.weight}`]),
      ...block.cons.flatMap((item) => [item.text, `Con weight ${item.weight}`]),
    );
  } else if (block.type === "swot") {
    details.push(
      `Strengths ${block.cells.strengths}`,
      `Weaknesses ${block.cells.weaknesses}`,
      `Opportunities ${block.cells.opportunities}`,
      `Threats ${block.cells.threats}`,
    );
  } else if (block.type === "tracker") {
    details.push(
      ...(block.goal !== null && block.goal !== undefined ? [`Goal ${block.goal}`] : []),
      ...block.entries.map((entry) => entry.label),
    );
  } else if (block.type === "ai-prompt") {
    details.push(
      block.includeContext ? "Includes node context" : "Standalone prompt mode",
      block.prompt,
      block.latestOutput,
    );
  } else if (block.type === "habit-grid") {
    details.push(
      ...block.habits.flatMap((habit) => [
        habit.name,
        ...Object.entries(habit.days).map(
          ([day, completed]) => `${day} ${completed ? "done" : "open"}`,
        ),
      ]),
    );
  } else if (block.type === "process") {
    details.push(
      ...block.steps.flatMap((step, index) => [
        `Step ${index + 1}: ${step.title}`,
        step.note,
        step.completed ? "Completed" : "Open",
      ]),
    );
  } else if (block.type === "2x2-matrix") {
    details.push(
      `X axis ${block.xAxisLabel} from ${block.xStartLabel} to ${block.xEndLabel}`,
      `Y axis ${block.yAxisLabel} from ${block.yStartLabel} to ${block.yEndLabel}`,
      `${block.quadrants.topLeft.name} ${block.quadrants.topLeft.items.map((item) => item.text).join(", ")}`,
      `${block.quadrants.topRight.name} ${block.quadrants.topRight.items.map((item) => item.text).join(", ")}`,
      `${block.quadrants.bottomLeft.name} ${block.quadrants.bottomLeft.items.map((item) => item.text).join(", ")}`,
      `${block.quadrants.bottomRight.name} ${block.quadrants.bottomRight.items.map((item) => item.text).join(", ")}`,
    );
  } else if (block.type === "course-roadmap") {
    details.push(
      ...block.courses.flatMap((course) => [
        course.name,
        course.status,
        ...course.lessons.map(
          (lesson, index) =>
            `Lesson ${index + 1}: ${lesson.title} (${lesson.recorded ? "recorded" : "pending"})`,
        ),
        ...course.outcomes.map((outcome) => outcome.text),
      ]),
    );
  } else if (block.type === "learning-outcomes-matrix") {
    details.push(block.prompt, block.latestOutput);
  } else if (block.type === "time-orchestrator") {
    details.push(
      ...block.settings.domains.map(getWorkspaceTaskDomainLabel),
      ...block.settings.quadrants,
      block.settings.includeUnassigned ? "Unassigned" : "",
    );
  } else if (block.type === "cohort-health-dashboard") {
    details.push(
      ...block.cohorts.flatMap((cohort) => [
        cohort.name,
        `${cohort.seatsSold}/${cohort.capacity} seats`,
        `${cohort.revenueEgp} EGP`,
        cohort.startDate ?? "",
        cohort.status,
        cohort.refundRisk ? "Refund risk" : "",
        cohort.completionRisk ? "Completion risk" : "",
      ]),
    );
  } else if (block.type === "eisenhower-matrix") {
    const scopedTasks = getScopedEisenhowerTasksForBlock(block);

    details.push(
      block.latestBattlePlan,
      ...scopedTasks.flatMap(({ task, sourceNodeTitle, blockTitle }) => [
        task.text,
        task.domain ? getWorkspaceTaskDomainLabel(task.domain) : "Unassigned",
        task.dueDate ?? "",
        `${task.urgency}/10 urgency`,
        `${task.importance}/10 importance`,
        `${task.estimateMinutes} minutes`,
        task.completed ? "Completed" : "Open",
        sourceNodeTitle,
        blockTitle,
      ]),
    );
  } else if (block.type === "leadership-rhythm-planner") {
    details.push(
      block.filter,
      ...block.meetings.flatMap((meeting) => [
        meeting.name,
        meeting.rhythm,
        meeting.owner,
        meeting.participants,
        meeting.purpose,
        `${meeting.durationMinutes} minutes`,
        meeting.nextDate ?? "",
        meeting.status,
      ]),
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
  } else if (block.type === "skills-heat-map") {
    details.push(
      ...block.members.flatMap((member) => [
        member.name,
        member.role,
        ...Object.entries(member.scores).map(([dimension, score]) => `${dimension} ${score}/10`),
      ]),
    );
  } else if (block.type === "delegation-matrix") {
    details.push(
      `${block.hourlyRate} hourly rate`,
      ...block.items.flatMap((item) => [
        item.task,
        `${item.from} to ${item.to || "unassigned"}`,
        `${item.hoursPerWeek} hours per week`,
        item.status,
      ]),
    );
  } else if (block.type === "talent-grid") {
    details.push(
      ...block.members.flatMap((member) => [
        member.name,
        member.role,
        `${member.performance}/5 performance`,
        `${member.potential}/5 potential`,
      ]),
    );
  } else if (block.type === "seat-planner") {
    details.push(
      ...block.seats.flatMap((seat) => [
        seat.name,
        seat.owner,
        seat.function,
        seat.health,
        seat.load,
        seat.backupOwner,
        seat.notes,
      ]),
    );
  } else if (block.type === "deal-scoring-matrix") {
    details.push(
      ...block.deals.flatMap((deal) => [
        deal.clientName,
        `${deal.score}/100 score`,
        `${deal.valueEgp} EGP`,
        deal.temperature,
        deal.stage,
        deal.nextAction,
        deal.dueDate ?? "",
      ]),
    );
  } else if (block.type === "pipeline-funnel") {
    details.push(
      ...block.deals.flatMap((deal) => [
        deal.clientName,
        `${deal.valueEgp} EGP`,
        deal.temperature,
        deal.stage,
      ]),
    );
  } else if (block.type === "forecast-confidence-board") {
    details.push(
      `Target ${block.targetRevenueEgp} EGP`,
      ...block.deals.flatMap((deal) => [
        deal.clientName,
        `${deal.valueEgp} EGP`,
        deal.bucket,
        `${deal.confidence}% confidence`,
        deal.expectedCloseMonth ?? "",
        deal.owner,
        deal.nextAction,
      ]),
    );
  } else if (block.type === "content-pipeline") {
    details.push(
      ...block.items.flatMap((item) => [item.title, item.status, item.platform, item.assignee]),
    );
  } else if (block.type === "content-quality-radar") {
    details.push(
      ...Object.entries(block.scores).flatMap(([dimension, score]) => [
        `${dimension} ${score}/10`,
        `${score}`,
      ]),
    );
  } else if (block.type === "content-roi-tracker") {
    details.push(
      `Sort ${block.sortBy}`,
      ...block.items.flatMap((item) => [
        item.title,
        item.platform,
        item.campaign,
        item.goal,
        `${item.reach} reach`,
        `${item.leads} leads`,
        `${item.conversionInfluence}/10 conversion influence`,
        `${item.repurposeValue}/10 repurpose value`,
      ]),
    );
  } else if (block.type === "authority-scorecard") {
    details.push(
      ...Object.entries(block.metrics).flatMap(([metric, entry]) => [
        metric,
        `${entry.value}/${entry.target}`,
      ]),
    );
  } else if (block.type === "hook-bank") {
    details.push(
      ...block.hooks.flatMap((hook) => [hook.category, hook.text, `${hook.score}/10 score`]),
    );
  } else if (block.type === "message-house") {
    details.push(
      block.brandPromise,
      ...block.pillars.flatMap((pillar) => [pillar.title, pillar.body]),
      block.audiencePains,
      block.proofPoints,
      block.voicePrinciples,
      block.latestStressTest,
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
        ...objective.keyResults.flatMap((keyResult) => [keyResult.title, `${keyResult.progress}%`]),
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
  } else if (block.type === "profitability-cash-flow") {
    details.push(
      ...block.clients.flatMap((client) => [
        client.name,
        client.paymentStatus,
        `${client.healthPercent}% health`,
        `${client.revenueEgp} revenue`,
        `${client.costEgp} cost`,
      ]),
      ...block.expenses.flatMap((expense) => [expense.category, `${expense.amountEgp} expense`]),
    );
  } else if (block.type === "pricing-simulator") {
    details.push(
      `${block.activeClients} clients`,
      `${block.hoursPerClientPerMonth} hours per client per month`,
      `${block.hourlyRateEgp} EGP hourly rate`,
      `${block.monthlyOverheadEgp} EGP monthly overhead`,
      `${block.targetMarginPercent}% target margin`,
    );
  } else if (block.type === "collections-tracker") {
    details.push(
      `Filter ${block.filter}`,
      ...block.invoices.flatMap((invoice) => [
        invoice.clientName,
        `${invoice.amountEgp} EGP`,
        invoice.dueDate ?? "",
        invoice.owner,
        invoice.nextFollowUpDate ?? "",
        invoice.status,
        invoice.notes,
        invoice.paidAt ?? "",
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

const getPriorityBadgeClass = getWorkspaceTaskPriorityBadgeClass;

const formatRelativeTaskMeta = formatWorkspaceRelativeTaskMeta;

const formatFormulaResult = formatWorkspaceFormulaResult;

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
  mutateTypedBlock,
  addTask,
  mutateTask,
  mutateCollectedTask,
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
  runBlockAgentPrompt,
  getBlockOperationState,
  isBlockOperationPending,
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
  allNodes,
  connectSource,
  disconnectSource,
  removeCollectedTask,
  addTaskToSource,
  navigateToSource,
});
</script>

<template>
  <div class="relative h-full w-full overflow-hidden">
    <Teleport to="#app-shell-dock-content" defer>
      <div class="flex h-full min-h-0 flex-col">
        <DashboardAgentChatPanel
          :nodes="agentChatNodes"
          :active-tab-id="activeTabId || null"
          scope-kind="blocks"
          @close="setAgentDockOpen(false)"
        >
          <template #scope-badges>
            <div
              v-if="agentContextBadgeItems.length > 0"
              class="flex items-start justify-between gap-2"
            >
              <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                <UBadge
                  v-for="item in agentContextBadgeItems"
                  :key="item.id"
                  :title="item.title"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  class="group rounded-full pl-2.5 pr-1.5"
                >
                  <span class="max-w-40 truncate text-[11px] font-medium">
                    {{ item.label }}
                  </span>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-x"
                    class="ml-1 size-4 rounded-full p-0 opacity-0 transition pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
                    @click="toggleAgentContextBlock(item.tabId, item.blockId)"
                  />
                </UBadge>
              </div>

              <UButton
                v-if="agentContextBadgeItems.length > 1"
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-eraser"
                class="shrink-0 rounded-full"
                @click="clearAgentContextBlock"
              />
            </div>
          </template>
        </DashboardAgentChatPanel>
      </div>
    </Teleport>

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
        <div class="min-w-0 flex flex-1 flex-col">
          <div class="min-h-0 flex-1">
            <WorkspaceNodeShell
              :node="node"
              :active-tab="activeTab"
              :active-tab-id="activeTabId"
              :save-badge="saveBadge"
              :save-error="saveError"
              :visible-blocks="visibleBlocks"
              :node-visibility-label="nodeVisibilityLabel"
              :node-visibility-badge-class="nodeVisibilityBadgeClass"
              :node-owner-label="nodeOwnerLabel"
              :node-team-name="
                canManageNodeSharing ? (activeTeamMembership?.name ?? node.teamId ?? null) : null
              "
              :active-team-role="activeTeamRole"
              :can-edit-node-content="canEditNodeContent"
              :teams="teams"
              :node-share-team-id="nodeShareTeamId"
              :can-manage-node-sharing="canManageNodeSharing"
              :share-pending="shareNodeMutation.isPending.value"
              :unshare-pending="unshareNodeMutation.isPending.value"
              @update:node-share-team-id="nodeShareTeamId = $event"
              @share-node="shareCurrentNodeToTeam"
              @unshare-node="unshareCurrentNodeFromTeam"
            />
          </div>
        </div>
      </div>

      <div
        v-if="isWorkspaceRefreshing"
        class="pointer-events-none absolute right-4 top-4 z-30 md:right-6 md:top-6"
      >
        <div
          class="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-muted/70 bg-default/95 px-3 py-2 text-xs font-medium text-toned"
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

<style scoped>
.agent-rail {
  position: relative;
  isolation: isolate;
}

.agent-rail-aura {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(34rem 26rem at 12% 22%, rgb(59 130 246 / 0.16), transparent 62%),
    radial-gradient(26rem 20rem at 88% 18%, rgb(16 185 129 / 0.12), transparent 58%),
    radial-gradient(20rem 18rem at 50% 78%, rgb(99 102 241 / 0.1), transparent 60%);
  filter: blur(10px);
  opacity: 0.95;
}

.agent-rail > .sticky {
  position: sticky;
  z-index: 1;
}

:global(.dark) .agent-rail-aura {
  background:
    radial-gradient(34rem 26rem at 12% 22%, rgb(96 165 250 / 0.2), transparent 62%),
    radial-gradient(26rem 20rem at 88% 18%, rgb(45 212 191 / 0.14), transparent 58%),
    radial-gradient(20rem 18rem at 50% 78%, rgb(129 140 248 / 0.14), transparent 60%);
}
</style>
