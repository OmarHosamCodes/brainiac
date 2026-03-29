import type { DropdownMenuItem } from "@nuxt/ui";
import type {
  WorkspaceBlock,
  WorkspaceCollectedTask,
  WorkspaceCustomBlock,
  WorkspaceCustomBlockTemplate,
  WorkspaceKanbanBlock,
  WorkspaceNode,
  WorkspaceNodeTab,
  WorkspaceScorecardBlock,
  WorkspaceTask,
  WorkspaceTaskDomain,
  WorkspaceTaskPriority,
  WorkspaceTimeOrchestratorBlock,
  WorkspaceTimeOrchestratorSummary,
  WorkspaceTimelineBlock,
} from "@brainiac/workspace";
import type { ComputedRef, InjectionKey, Ref } from "vue";
import { inject } from "vue";
import type { WorkspaceBlockPresetId } from "~/utils/workspace-block-presets";

export type WorkspaceNodePriorityOption = {
  label: string;
  value: "" | WorkspaceTaskPriority;
};

export type WorkspaceNodeDomainOption = {
  label: string;
  value: "" | WorkspaceTaskDomain;
};

export type WorkspaceSaveBadge = {
  label: string;
  className: string;
};

export type WorkspaceTabEditorMode = "create" | "rename";

export type WorkspaceTabEditorState = {
  open: boolean;
  mode: WorkspaceTabEditorMode;
  title: string;
};

type MaybePromise = void | Promise<void>;

export type WorkspaceNodeEditorContext = {
  currentNode: ComputedRef<WorkspaceNode | null>;
  blockSearch: Ref<string>;
  normalizedBlockSearch: ComputedRef<string>;
  addBlockMenuItems: ComputedRef<DropdownMenuItem[][]>;
  blockPresetMenuItems: ComputedRef<DropdownMenuItem[][]>;
  tabEditor: WorkspaceTabEditorState;
  priorityOptions: WorkspaceNodePriorityOption[];
  domainOptions: WorkspaceNodeDomainOption[];
  setActiveTab(tabId: string): void;
  openTabEditor(mode: WorkspaceTabEditorMode): void;
  closeTabEditor(): void;
  submitTabEditor(): void;
  deleteActiveTab(): void;
  saveNodeToMarketplace(): MaybePromise;
  saveActiveTabToMarketplace(): MaybePromise;
  addBlockToActiveTab(type: WorkspaceBlock["type"]): void;
  addBlockPresetToActiveTab(presetId: WorkspaceBlockPresetId): void;
  removeBlock(tabId: string, blockId: string): void;
  updateBlockTitle(tabId: string, blockId: string, value: string): void;
  toggleAgentContextBlock(tabId: string, blockId: string): void;
  clearAgentContextBlock(): void;
  isAgentContextBlock(tabId: string, blockId: string): boolean;
  saveBlockToMarketplace(block: WorkspaceBlock): MaybePromise;
  getTimeOrchestratorSummaryForBlock(
    block: WorkspaceTimeOrchestratorBlock,
  ): WorkspaceTimeOrchestratorSummary | null;
  mutateBlock(
    tabId: string,
    blockId: string,
    mutator: (
      block: WorkspaceBlock,
      tab: WorkspaceNodeTab,
      nodeEntry: WorkspaceNode,
      timestamp: string,
    ) => void,
  ): void;
  addTask(tabId: string, blockId: string): void;
  mutateTask(
    tabId: string,
    blockId: string,
    taskId: string,
    mutator: (task: WorkspaceTask) => void,
  ): void;
  removeTask(tabId: string, blockId: string, taskId: string): void;
  addDecisionItem(tabId: string, blockId: string, list: "pros" | "cons"): void;
  mutateDecisionItem(
    tabId: string,
    blockId: string,
    itemId: string,
    list: "pros" | "cons",
    mutator: (item: { id: string; text: string; weight: number }) => void,
  ): void;
  removeDecisionItem(tabId: string, blockId: string, itemId: string, list: "pros" | "cons"): void;
  addTrackerEntry(tabId: string, blockId: string): void;
  mutateTrackerEntry(
    tabId: string,
    blockId: string,
    entryId: string,
    mutator: (entry: { id: string; label: string; value: number; createdAt: string }) => void,
  ): void;
  removeTrackerEntry(tabId: string, blockId: string, entryId: string): void;
  addKanbanColumn(tabId: string, blockId: string): void;
  mutateKanbanColumn(
    tabId: string,
    blockId: string,
    columnId: string,
    mutator: (column: WorkspaceKanbanBlock["columns"][number]) => void,
  ): void;
  removeKanbanColumn(tabId: string, blockId: string, columnId: string): void;
  addKanbanCard(tabId: string, blockId: string, columnId: string): void;
  mutateKanbanCard(
    tabId: string,
    blockId: string,
    cardId: string,
    mutator: (card: WorkspaceKanbanBlock["cards"][number]) => void,
  ): void;
  moveKanbanCard(tabId: string, blockId: string, cardId: string, targetColumnId: string): void;
  removeKanbanCard(tabId: string, blockId: string, cardId: string): void;
  addTimelineMilestone(tabId: string, blockId: string): void;
  mutateTimelineMilestone(
    tabId: string,
    blockId: string,
    milestoneId: string,
    mutator: (milestone: WorkspaceTimelineBlock["milestones"][number]) => void,
  ): void;
  removeTimelineMilestone(tabId: string, blockId: string, milestoneId: string): void;
  moveTimelineMilestone(
    tabId: string,
    blockId: string,
    milestoneId: string,
    direction: "up" | "down",
  ): void;
  addScorecardMetric(tabId: string, blockId: string): void;
  mutateScorecardMetric(
    tabId: string,
    blockId: string,
    metricId: string,
    mutator: (metric: WorkspaceScorecardBlock["metrics"][number]) => void,
  ): void;
  removeScorecardMetric(tabId: string, blockId: string, metricId: string): void;
  runPromptBlock(tabId: string, blockId: string): void;
  runCustomPrompt(tabId: string, blockId: string): void;
  runBlockAgentPrompt(tabId: string, blockId: string, prompt: string): Promise<string>;
  toggleNotePreview(blockId: string): void;
  isNotePreviewEnabled(blockId: string): boolean;
  getDisplayTabTitle(tab: WorkspaceNodeTab | null | undefined): string;
  getDisplayBlockTitle(block: WorkspaceBlock): string;
  getBlockSearchMatches(block: WorkspaceBlock): string[];
  highlightSearchMatch(value: string): string;
  getCustomTemplate(definitionId: string): WorkspaceCustomBlockTemplate | null;
  getCustomFormulaResult(block: WorkspaceCustomBlock): number | null;
  getCustomPromptPreview(block: WorkspaceCustomBlock): string;
  getPriorityBadgeClass(priority: WorkspaceTaskPriority | null | undefined): string;
  formatRelativeTaskMeta(item: WorkspaceCollectedTask): string;
  formatFormulaResult(value: number | null): string;
  renderNotesPreview(input: string): string;
};

export const workspaceNodeEditorContextKey = Symbol(
  "workspace-node-editor-context",
) as InjectionKey<WorkspaceNodeEditorContext>;

export function useWorkspaceNodeEditorContext() {
  const context = inject(workspaceNodeEditorContextKey);

  if (!context) {
    throw new Error("Workspace node editor context is not available.");
  }

  return context;
}
