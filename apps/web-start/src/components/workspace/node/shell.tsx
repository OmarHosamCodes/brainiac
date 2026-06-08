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
  createWorkspaceKanbanBlock,
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
  createWorkspaceSeatPlannerBlock,
  createWorkspaceSkillsHeatMapBlock,
  createWorkspaceSwotBlock,
  createWorkspaceTableBlock,
  createWorkspaceTalentGridBlock,
  createWorkspaceTaskListBlock,
  createWorkspaceTimeOrchestratorBlock,
  createWorkspaceTimelineBlock,
  createWorkspaceTrackerBlock,
  evaluateCustomBlockFormula,
  fillCustomBlockPromptTemplate,
  generateWorkspacePromptOutput,
  getTimeOrchestratorSummary,
  normalizeWorkspaceNode,
  workspaceBlockCategories,
  type WorkspaceBlock,
  type WorkspaceCollectedTask,
  type WorkspaceCustomBlock,
  type WorkspaceNode,
  type WorkspaceNodeTab,
  type WorkspaceTask,
} from "@brainiac/workspace";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FolderPlus, PackagePlus, Plus, Save, Search, Trash2 } from "lucide-react";
import * as React from "react";

import { WorkspaceNodeBlockRenderer } from "@/components/workspace/node/block-renderer";
import {
  WorkspaceNodeEditorProvider,
  type WorkspaceNodeEditorContextValue,
  type WorkspaceTabEditorMode,
  type WorkspaceTabEditorState,
} from "@/components/workspace/node/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useAppShellActions, useAppShellPageTitle } from "@/hooks/use-app-shell";
import { useTeamSelection } from "@/hooks/use-team-selection";
import { useWorkspaceState } from "@/hooks/useWorkspaceState";
import { orpc } from "@/lib/orpc";
import { useWorkspaceStore } from "@/stores/workspace";
import { getErrorMessage } from "@/utils/get-error-message";
import { getWorkspaceBlockPreset, workspaceBlockPresets, type WorkspaceBlockPresetId } from "@/utils/workspace-block-presets";
import {
  createBlockMarketplacePayload,
  createNodeMarketplacePayload,
  createTabMarketplacePayload,
} from "@/utils/workspace-marketplace";
import {
  getWorkspaceTaskPriorityBadgeClass,
} from "@/utils/workspace-node-formatters";

type AgentContextTarget = {
  tabId: string;
  blockId: string;
};

const primaryBlockTypes: WorkspaceBlock["type"][] = ["task-list", "notes", "decision"];
const agencyOperationsBlockTypeSet = new Set<WorkspaceBlock["type"]>([
  "agency-project-manager",
  "agency-settings",
  "agency-time-tracker",
  "agency-time-entries-log",
  "agency-time-summary",
  "agency-billing-report",
]);

export function WorkspaceNodeShell(props: { nodeId: string }) {
  const workspaceState = useWorkspaceState();
  const teamSelection = useTeamSelection();
  const [blockSearch, setBlockSearch] = React.useState("");
  const [tabEditor, setTabEditor] = React.useState<WorkspaceTabEditorState>({
    open: false,
    mode: "create",
    title: "",
  });
  const [agentContextTargets, setAgentContextTargets] = React.useState<AgentContextTarget[]>([]);
  const [activeBlockOperationTarget, setActiveBlockOperationTarget] = React.useState<{
    tabId: string;
    blockId: string;
    label: string;
  } | null>(null);

  const node = workspaceState.nodes.find((entry) => entry.id === props.nodeId) ?? null;
  const normalizedBlockSearch = blockSearch.trim().toLowerCase();
  const activeTabId = node?.viewState.activeTabId ?? "";
  const activeTab = node?.tabs.find((tab) => tab.id === activeTabId) ?? node?.tabs[0] ?? null;
  const visibleBlocks = React.useMemo(() => {
    if (!activeTab) return [];
    if (!normalizedBlockSearch) return activeTab.blocks;
    return activeTab.blocks.filter((block) => getBlockSearchText(block).includes(normalizedBlockSearch));
  }, [activeTab, normalizedBlockSearch]);
  const shellActions = React.useMemo(
    () => (
      <Button asChild variant="outline" size="sm">
        <Link to="/dashboard">
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
      </Button>
    ),
    [],
  );

  useAppShellPageTitle(node?.title ?? "Node");
  useAppShellActions(shellActions);

  React.useEffect(() => {
    if (!node || node.tabs.length === 0) return;
    if (node.viewState.activeTabId && node.tabs.some((tab) => tab.id === node.viewState.activeTabId)) {
      return;
    }
    mutateCurrentNode((entry) => {
      entry.viewState.activeTabId = entry.tabs[0]?.id ?? null;
    });
  }, [node?.id, node?.tabs.length, node?.viewState.activeTabId]);

  function updateDraftNodes(mutator: (nodes: WorkspaceNode[]) => void) {
    workspaceState.updateNodes(mutator);
  }

  function mutateCurrentNode(mutator: (entry: WorkspaceNode, timestamp: string) => void) {
    updateDraftNodes((nodes) => {
      const index = nodes.findIndex((entry) => entry.id === props.nodeId);
      const entry = nodes[index];
      if (!entry) return;
      const timestamp = new Date().toISOString();
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
      if (!tab) return;
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
      if (!block) return;
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
      if (block.type !== type) return;
      mutator(block as Extract<WorkspaceBlock, { type: TBlockType }>, tab, nodeEntry, timestamp);
    });
  }

  function setActiveTab(tabId: string) {
    mutateCurrentNode((entry) => {
      entry.viewState.activeTabId = tabId;
    });
  }

  function openTabEditor(mode: WorkspaceTabEditorMode) {
    setTabEditor({
      open: true,
      mode,
      title: mode === "rename" ? getDisplayTabTitle(activeTab) : "",
    });
  }

  function closeTabEditor() {
    setTabEditor((current) => ({ ...current, open: false, title: "" }));
  }

  function submitTabEditor() {
    const title = tabEditor.title.trim() || "Untitled tab";
    if (tabEditor.mode === "create") {
      const nextTab = createDefaultWorkspaceTab(title);
      mutateCurrentNode((entry) => {
        entry.tabs.push(nextTab);
        entry.viewState.activeTabId = nextTab.id;
      });
    } else if (activeTab) {
      mutateTab(activeTab.id, (tab) => {
        tab.title = title;
      });
    }
    closeTabEditor();
  }

  function deleteActiveTab() {
    if (!node || !activeTab) return;
    if (!window.confirm(`Delete workspace "${getDisplayTabTitle(activeTab)}" and all blocks?`)) {
      return;
    }
    const currentTabId = activeTab.id;
    const currentIndex = node.tabs.findIndex((tab) => tab.id === currentTabId);
    mutateCurrentNode((entry) => {
      entry.tabs = entry.tabs.filter((tab) => tab.id !== currentTabId);
      if (entry.tabs.length === 0) {
        const fallbackTab = createDefaultWorkspaceTab("Overview", entry.content);
        entry.tabs = [fallbackTab];
        entry.viewState.activeTabId = fallbackTab.id;
        return;
      }
      const nextTab = entry.tabs[currentIndex] ?? entry.tabs[Math.max(0, currentIndex - 1)] ?? entry.tabs[0];
      entry.viewState.activeTabId = nextTab?.id ?? null;
    });
  }

  function addBlockToActiveTab(type: WorkspaceBlock["type"]) {
    if (!activeTab || !node) return;
    const preferredAgencyTeamId = getPreferredAgencyTeamId(node);
    if (agencyOperationsBlockTypeSet.has(type) && !preferredAgencyTeamId) {
      toast({
        title: "Team required",
        description: "Create or join a team before adding Agency Operations blocks.",
        variant: "destructive",
      });
      return;
    }
    const nextBlock = createBlockByType(type, preferredAgencyTeamId);
    if (!nextBlock) return;
    mutateTab(activeTab.id, (tab) => {
      tab.blocks.unshift(nextBlock);
    });
  }

  function addBlockPresetToActiveTab(presetId: WorkspaceBlockPresetId) {
    if (!activeTab) return;
    const preset = getWorkspaceBlockPreset(presetId);
    if (!preset) return;
    mutateTab(activeTab.id, (tab) => {
      tab.blocks.unshift(...preset.createBlocks());
    });
  }

  function removeBlock(tabId: string, blockId: string) {
    const block = node?.tabs.find((tab) => tab.id === tabId)?.blocks.find((entry) => entry.id === blockId);
    if (!block) return;
    if (!window.confirm(`Delete block "${getDisplayBlockTitle(block)}"?`)) return;
    setAgentContextTargets((targets) =>
      targets.filter((target) => target.tabId !== tabId || target.blockId !== blockId),
    );
    mutateTab(tabId, (tab) => {
      tab.blocks = tab.blocks.filter((entry) => entry.id !== blockId);
    });
  }

  function updateBlockTitle(tabId: string, blockId: string, value: string) {
    mutateBlock(tabId, blockId, (block) => {
      block.title = value;
    });
  }

  function toggleAgentContextBlock(tabId: string, blockId: string) {
    setAgentContextTargets((targets) => {
      const exists = targets.some((target) => target.tabId === tabId && target.blockId === blockId);
      if (exists) {
        return targets.filter((target) => target.tabId !== tabId || target.blockId !== blockId);
      }
      return [...targets, { tabId, blockId }];
    });
  }

  function clearAgentContextBlock() {
    setAgentContextTargets([]);
  }

  function isAgentContextBlock(tabId: string, blockId: string) {
    return agentContextTargets.some((target) => target.tabId === tabId && target.blockId === blockId);
  }

  async function saveMarketplacePayload(input: {
    title: string;
    summary: string;
    payload: ReturnType<typeof createNodeMarketplacePayload>;
  }) {
    await orpc.workspace.marketplace.save.call(input);
    toast({ title: "Saved to marketplace" });
  }

  async function saveNodeToMarketplace() {
    if (!node) return;
    await saveMarketplacePayload({
      title: node.title,
      summary: `${node.tabs.length} tabs`,
      payload: createNodeMarketplacePayload(node),
    });
  }

  async function saveActiveTabToMarketplace() {
    if (!node || !activeTab) return;
    await saveMarketplacePayload({
      title: `${node.title} / ${getDisplayTabTitle(activeTab)}`,
      summary: `${activeTab.blocks.length} blocks`,
      payload: createTabMarketplacePayload(node, activeTab),
    });
  }

  async function saveBlockToMarketplace(tabId: string, block: WorkspaceBlock) {
    if (!node) return;
    const tab = node.tabs.find((entry) => entry.id === tabId);
    if (!tab) return;
    await saveMarketplacePayload({
      title: `${node.title} / ${getDisplayTabTitle(tab)} / ${getDisplayBlockTitle(block)}`,
      summary: block.type,
      payload: createBlockMarketplacePayload(node, block),
    });
  }

  async function runPromptBlock(tabId: string, blockId: string) {
    if (!node) return;
    const block = activeTab?.blocks.find(
      (candidate): candidate is Extract<WorkspaceBlock, { type: "ai-prompt" }> =>
        candidate.id === blockId && candidate.type === "ai-prompt",
    );
    if (!block || !block.prompt.trim()) return;
    const prompt = block.prompt.trim();
    const scopedNodes = block.includeContext ? cloneWorkspaceNodes([node]) : undefined;
    const content = block.includeContext
      ? prompt
      : ["Answer the user's request without workspace context.", "", prompt].join("\n");
    setActiveBlockOperationTarget({ tabId, blockId, label: "Running prompt" });
    try {
      const response = await orpc.agent.chat.turn.call({
        content,
        nodes: workspaceState.nodes,
        scopeNodes: scopedNodes,
        contextNodeTitles: block.includeContext ? [node.title] : [],
        toolPreset: "ask",
      });
      if (response.workspaceSnapshot) {
        useWorkspaceStore.getState().applyWorkspaceSnapshot(
          response.workspaceSnapshot.nodes,
          response.workspaceSnapshot.updatedAt ?? null,
        );
      }
      mutateTypedBlock(tabId, blockId, "ai-prompt", (entry, _tab, _node, timestamp) => {
        entry.latestOutput = response.assistantMessage.content;
        entry.outputHistory.unshift({
          id: crypto.randomUUID(),
          prompt,
          output: response.assistantMessage.content,
          createdAt: timestamp,
        });
        entry.outputHistory = entry.outputHistory.slice(0, 8);
      });
    } catch (error) {
      toast({
        title: "Prompt failed",
        description: getErrorMessage(error, "Failed to run prompt"),
        variant: "destructive",
      });
    } finally {
      setActiveBlockOperationTarget(null);
    }
  }

  function runCustomPrompt(tabId: string, blockId: string) {
    if (!node) return;
    const block = activeTab?.blocks.find(
      (candidate): candidate is WorkspaceCustomBlock =>
        candidate.id === blockId && candidate.type === "custom",
    );
    if (!block) return;
    const template = node.customBlockTemplates.find((entry) => entry.id === block.definitionId);
    if (!template) return;
    const prompt = fillCustomBlockPromptTemplate(template, block).trim();
    if (!prompt) return;
    const output = generateWorkspacePromptOutput(node, prompt);
    mutateTypedBlock(tabId, blockId, "custom", (entry, _tab, _node, timestamp) => {
      entry.latestAiOutput = output;
      entry.outputHistory.unshift({
        id: crypto.randomUUID(),
        prompt,
        output,
        createdAt: timestamp,
      });
      entry.outputHistory = entry.outputHistory.slice(0, 8);
    });
  }

  async function runBlockAgentPrompt(tabId: string, blockId: string, prompt: string) {
    if (!node) throw new Error("Node is unavailable.");
    const tab = node.tabs.find((entry) => entry.id === tabId);
    const block = tab?.blocks.find((entry) => entry.id === blockId);
    if (!tab || !block) throw new Error("Block context is unavailable.");
    const scopedNode = createAgentContextNode(node, tab, block);
    setActiveBlockOperationTarget({ tabId, blockId, label: "Running analysis" });
    try {
      const response = await orpc.agent.chat.turn.call({
        content: prompt,
        nodes: workspaceState.nodes,
        scopeNodes: [scopedNode],
        contextNodeTitles: [scopedNode.title],
        toolPreset: "ask",
      });
      if (response.workspaceSnapshot) {
        useWorkspaceStore.getState().applyWorkspaceSnapshot(
          response.workspaceSnapshot.nodes,
          response.workspaceSnapshot.updatedAt ?? null,
        );
      }
      return response.assistantMessage.content;
    } finally {
      setActiveBlockOperationTarget(null);
    }
  }

  function getBlockOperationState(tabId: string, blockId: string) {
    const pending =
      activeBlockOperationTarget?.tabId === tabId && activeBlockOperationTarget.blockId === blockId;
    return {
      pending,
      label: pending ? activeBlockOperationTarget?.label ?? "Working" : null,
    };
  }

  function toggleNotePreview(blockId: string) {
    mutateCurrentNode((entry) => {
      entry.viewState.notePreviewState = {
        ...entry.viewState.notePreviewState,
        [blockId]: !entry.viewState.notePreviewState?.[blockId],
      };
    });
  }

  function mutateCollectedTask(item: WorkspaceCollectedTask, mutator: (task: WorkspaceTask) => void) {
    updateDraftNodes((nodes) => {
      const sourceNodeIndex = nodes.findIndex((entry) => entry.id === item.sourceNodeId);
      const sourceNode = nodes[sourceNodeIndex];
      if (!sourceNode) return;
      const tab = sourceNode.tabs.find((entry) => entry.id === item.tabId);
      const block = tab?.blocks.find((entry) => entry.id === item.blockId);
      if (!tab || !block || (block.type !== "task-list" && block.type !== "eisenhower-matrix")) {
        return;
      }
      const task = block.tasks.find((entry) => entry.id === item.task.id);
      if (!task) return;
      mutator(task);
      const timestamp = new Date().toISOString();
      block.updatedAt = timestamp;
      tab.updatedAt = timestamp;
      sourceNode.updatedAt = timestamp;
      sourceNode.label = sourceNode.title;
      nodes[sourceNodeIndex] = normalizeWorkspaceNode(sourceNode);
    });
  }

  function getPreferredAgencyTeamId(currentNode: WorkspaceNode) {
    if (!teamSelection.teams || teamSelection.teams.length === 0) return currentNode.teamId ?? null;
    if (currentNode.teamId) return currentNode.teamId;
    if (teamSelection.selectedTeamId) return teamSelection.selectedTeamId;
    if (teamSelection.teams.length === 1) return teamSelection.teams[0]?.id ?? null;
    const choices = teamSelection.teams.map((team, index) => `${index + 1}. ${team.name}`).join("\n");
    const selection = window.prompt(`Select a team for this Agency Operations block:\n${choices}`, "1");
    if (selection === null) return null;
    const index = Number(selection) - 1;
    return Number.isInteger(index) ? teamSelection.teams[index]?.id ?? null : null;
  }

  const contextValue: WorkspaceNodeEditorContextValue = {
    currentNode: node,
    canEditNodeContent: true,
    blockSearch,
    normalizedBlockSearch,
    tabEditor,
    setBlockSearch,
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
    getTimeOrchestratorSummaryForBlock: (block) =>
      node ? getTimeOrchestratorSummary(node, block.settings, new Date(), workspaceState.nodes) : null,
    mutateBlock,
    mutateTypedBlock,
    mutateCollectedTask,
    runPromptBlock,
    runCustomPrompt,
    runBlockAgentPrompt,
    getBlockOperationState,
    isBlockOperationPending: (tabId, blockId) => getBlockOperationState(tabId, blockId).pending,
    toggleNotePreview,
    isNotePreviewEnabled: (blockId) => Boolean(node?.viewState.notePreviewState?.[blockId]),
    getDisplayTabTitle,
    getDisplayBlockTitle,
    getBlockSearchText,
    getCustomTemplate: (definitionId) =>
      node?.customBlockTemplates.find((entry) => entry.id === definitionId) ?? null,
    getCustomFormulaResult: (block) => {
      const template = node?.customBlockTemplates.find((entry) => entry.id === block.definitionId);
      if (!template) return null;
      return evaluateCustomBlockFormula(template.formula?.expression, block.values);
    },
    getCustomPromptPreview: (block) => {
      const template = node?.customBlockTemplates.find((entry) => entry.id === block.definitionId);
      return template ? fillCustomBlockPromptTemplate(template, block) : "";
    },
    getPriorityBadgeClass: getWorkspaceTaskPriorityBadgeClass,
    getDomainLabel: (domain) => domain ?? "Unassigned",
  };

  if (workspaceState.isWorkspaceInitialLoading || workspaceState.workspaceQuery.isLoading) {
    return (
      <div className="grid gap-4 p-4 md:p-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!node) {
    return (
      <section className="p-4 md:p-6">
        <div className="rounded-3xl border bg-background p-8">
          <h2 className="text-xl font-bold">Node not found</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The node may have been deleted or may not belong to this workspace.
          </p>
          <Button asChild className="mt-5">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <WorkspaceNodeEditorProvider value={contextValue}>
      <section className="grid min-h-full grid-rows-[auto_1fr]">
        <header className="border-b bg-background px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{node.nodeType}</Badge>
                <Badge variant="muted">{node.visibility}</Badge>
                <Badge className={workspaceState.saveBadge.className}>{workspaceState.saveBadge.label}</Badge>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-normal">{node.title}</h1>
              {node.content ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{node.content}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={saveNodeToMarketplace}>
                <Save className="size-4" />
                Save node
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => openTabEditor("create")}>
                <FolderPlus className="size-4" />
                Tab
              </Button>
              <Select onValueChange={(value) => addBlockPresetToActiveTab(value as WorkspaceBlockPresetId)}>
                <SelectTrigger className="h-8 w-[10rem] text-xs">
                  <SelectValue placeholder="Add pack" />
                </SelectTrigger>
                <SelectContent>
                  {workspaceBlockPresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(value) => addBlockToActiveTab(value as WorkspaceBlock["type"])}>
                <SelectTrigger className="h-8 w-[12rem] text-xs">
                  <SelectValue placeholder="Add block" />
                </SelectTrigger>
                <SelectContent>
                  {primaryBlockTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getBlockTypeLabel(type)}
                    </SelectItem>
                  ))}
                  {workspaceBlockCategories.flatMap((category) =>
                    category.items.map((item) => (
                      <SelectItem key={item.blockType} value={item.blockType}>
                        {category.label}: {item.label}
                      </SelectItem>
                    )),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <main className="grid min-h-0 gap-4 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {node.tabs.map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  size="sm"
                  variant={tab.id === activeTab?.id ? "default" : "outline"}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {getDisplayTabTitle(tab)}
                </Button>
              ))}
              {activeTab ? (
                <>
                  <Button type="button" size="icon" variant="ghost" onClick={() => openTabEditor("rename")} aria-label="Rename tab">
                    <Plus className="size-4 rotate-45" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={deleteActiveTab} aria-label="Delete tab">
                    <Trash2 className="size-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={saveActiveTabToMarketplace} aria-label="Save tab to marketplace">
                    <PackagePlus className="size-4" />
                  </Button>
                </>
              ) : null}
            </div>
            <label className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={blockSearch}
                onChange={(event) => setBlockSearch(event.currentTarget.value)}
                placeholder="Search blocks"
              />
            </label>
          </div>

          {tabEditor.open ? (
            <form
              className="flex flex-wrap items-center gap-2 rounded-2xl border bg-muted/30 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                submitTabEditor();
              }}
            >
              <Input
                className="min-w-64 flex-1"
                value={tabEditor.title}
                onChange={(event) => setTabEditor((current) => ({ ...current, title: event.currentTarget.value }))}
                placeholder="Tab title"
              />
              <Button type="submit" size="sm">
                {tabEditor.mode === "create" ? "Create tab" : "Rename tab"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={closeTabEditor}>
                Cancel
              </Button>
            </form>
          ) : null}

          {activeTab && visibleBlocks.length > 0 ? (
            <div className="grid gap-4">
              {visibleBlocks.map((block) => (
                <WorkspaceNodeBlockRenderer
                  key={block.id}
                  tabId={activeTab.id}
                  block={block}
                  canEdit={contextValue.canEditNodeContent}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed bg-muted/20 p-8 text-center">
              <p className="text-sm font-bold">No blocks in this tab</p>
              <p className="mt-2 text-sm text-muted-foreground">Add a block or pack to start structuring this node.</p>
            </div>
          )}
        </main>
      </section>
    </WorkspaceNodeEditorProvider>
  );
}

function createBlockByType(type: WorkspaceBlock["type"], teamId: string | null): WorkspaceBlock | null {
  switch (type) {
    case "task-list": return createWorkspaceTaskListBlock();
    case "notes": return createWorkspaceNotesBlock();
    case "table": return createWorkspaceTableBlock();
    case "checklist": return createWorkspaceChecklistBlock();
    case "decision": return createWorkspaceDecisionBlock();
    case "pros-cons": return createWorkspaceProsConsBlock();
    case "swot": return createWorkspaceSwotBlock();
    case "tracker": return createWorkspaceTrackerBlock();
    case "ai-prompt": return createWorkspaceAiPromptBlock();
    case "habit-grid": return createWorkspaceHabitGridBlock();
    case "process": return createWorkspaceProcessBlock();
    case "2x2-matrix": return createWorkspace2x2MatrixBlock();
    case "course-roadmap": return createWorkspaceCourseRoadmapBlock();
    case "learning-outcomes-matrix": return createWorkspaceLearningOutcomesMatrixBlock();
    case "time-orchestrator": return createWorkspaceTimeOrchestratorBlock();
    case "cohort-health-dashboard": return createWorkspaceCohortHealthDashboardBlock();
    case "eisenhower-matrix": return createWorkspaceEisenhowerMatrixBlock();
    case "leadership-rhythm-planner": return createWorkspaceLeadershipRhythmPlannerBlock();
    case "kanban": return createWorkspaceKanbanBlock();
    case "timeline": return createWorkspaceTimelineBlock();
    case "skills-heat-map": return createWorkspaceSkillsHeatMapBlock();
    case "delegation-matrix": return createWorkspaceDelegationMatrixBlock();
    case "talent-grid": return createWorkspaceTalentGridBlock();
    case "seat-planner": return createWorkspaceSeatPlannerBlock();
    case "deal-scoring-matrix": return createWorkspaceDealScoringMatrixBlock();
    case "pipeline-funnel": return createWorkspacePipelineFunnelBlock();
    case "forecast-confidence-board": return createWorkspaceForecastConfidenceBoardBlock();
    case "content-pipeline": return createWorkspaceContentPipelineBlock();
    case "content-quality-radar": return createWorkspaceContentQualityRadarBlock();
    case "content-roi-tracker": return createWorkspaceContentRoiTrackerBlock();
    case "authority-scorecard": return createWorkspaceAuthorityScorecardBlock();
    case "hook-bank": return createWorkspaceHookBankBlock();
    case "message-house": return createWorkspaceMessageHouseBlock();
    case "scorecard": return createWorkspaceScorecardBlock();
    case "okr-tracker": return createWorkspaceOkrTrackerBlock();
    case "decision-matrix": return createWorkspaceDecisionMatrixBlock();
    case "business-model-canvas": return createWorkspaceBusinessModelCanvasBlock();
    case "assumption-tracker": return createWorkspaceAssumptionTrackerBlock();
    case "profitability-cash-flow": return createWorkspaceProfitabilityCashFlowBlock();
    case "pricing-simulator": return createWorkspacePricingSimulatorBlock();
    case "collections-tracker": return createWorkspaceCollectionsTrackerBlock();
    case "agency-project-manager": return createWorkspaceAgencyProjectManagerBlock({ teamId });
    case "agency-time-tracker": return createWorkspaceAgencyTimeTrackerBlock({ teamId });
    case "agency-time-entries-log": return createWorkspaceAgencyTimeEntriesLogBlock({ teamId });
    case "agency-time-summary": return createWorkspaceAgencyTimeSummaryBlock({ teamId });
    case "agency-billing-report": return createWorkspaceAgencyBillingReportBlock({ teamId });
    case "agency-settings": return createWorkspaceAgencySettingsBlock({ teamId });
    case "custom": return null;
  }
}

function createAgentContextNode(node: WorkspaceNode, tab: WorkspaceNodeTab, block: WorkspaceBlock) {
  return normalizeWorkspaceNode({
    ...node,
    title: `${node.title || "Untitled node"} / ${getDisplayTabTitle(tab)} / ${getDisplayBlockTitle(block)}`,
    tabs: [
      {
        ...tab,
        blocks: [block],
      },
    ],
  });
}

function getDisplayTabTitle(tab: WorkspaceNodeTab | null | undefined) {
  return tab?.title?.trim() || "Untitled tab";
}

function getDisplayBlockTitle(block: WorkspaceBlock) {
  return block.title?.trim() || getBlockTypeLabel(block.type);
}

function getBlockTypeLabel(type: WorkspaceBlock["type"]) {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getBlockSearchText(block: WorkspaceBlock) {
  return `${block.type} ${block.title} ${JSON.stringify(block)}`.toLowerCase();
}
