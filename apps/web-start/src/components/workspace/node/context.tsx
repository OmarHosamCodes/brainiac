import type {
  WorkspaceBlock,
  WorkspaceCollectedTask,
  WorkspaceCustomBlock,
  WorkspaceCustomBlockTemplate,
  WorkspaceNode,
  WorkspaceNodeTab,
  WorkspaceTask,
  WorkspaceTaskDomain,
  WorkspaceTaskPriority,
  WorkspaceTimeOrchestratorBlock,
  WorkspaceTimeOrchestratorSummary,
} from "@brainiac/workspace";
import * as React from "react";

import type { WorkspaceBlockPresetId } from "@/utils/workspace-block-presets";

export type WorkspaceBlockOperationState = {
  pending: boolean;
  label: string | null;
};

export type WorkspaceTabEditorMode = "create" | "rename";

export type WorkspaceTabEditorState = {
  open: boolean;
  mode: WorkspaceTabEditorMode;
  title: string;
};

type MaybePromise = void | Promise<void>;

export type WorkspaceNodeEditorContextValue = {
  currentNode: WorkspaceNode | null;
  canEditNodeContent: boolean;
  blockSearch: string;
  normalizedBlockSearch: string;
  tabEditor: WorkspaceTabEditorState;
  setBlockSearch(value: string): void;
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
  saveBlockToMarketplace(tabId: string, block: WorkspaceBlock): MaybePromise;
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
  mutateTypedBlock<TBlockType extends WorkspaceBlock["type"]>(
    tabId: string,
    blockId: string,
    type: TBlockType,
    mutator: (
      block: Extract<WorkspaceBlock, { type: TBlockType }>,
      tab: WorkspaceNodeTab,
      nodeEntry: WorkspaceNode,
      timestamp: string,
    ) => void,
  ): void;
  mutateCollectedTask(item: WorkspaceCollectedTask, mutator: (task: WorkspaceTask) => void): void;
  runPromptBlock(tabId: string, blockId: string): MaybePromise;
  runCustomPrompt(tabId: string, blockId: string): void;
  runBlockAgentPrompt(tabId: string, blockId: string, prompt: string): Promise<string>;
  getBlockOperationState(tabId: string, blockId: string): WorkspaceBlockOperationState;
  isBlockOperationPending(tabId: string, blockId: string): boolean;
  toggleNotePreview(blockId: string): void;
  isNotePreviewEnabled(blockId: string): boolean;
  getDisplayTabTitle(tab: WorkspaceNodeTab | null | undefined): string;
  getDisplayBlockTitle(block: WorkspaceBlock): string;
  getBlockSearchText(block: WorkspaceBlock): string;
  getCustomTemplate(definitionId: string): WorkspaceCustomBlockTemplate | null;
  getCustomFormulaResult(block: WorkspaceCustomBlock): number | null;
  getCustomPromptPreview(block: WorkspaceCustomBlock): string;
  getPriorityBadgeClass(priority: WorkspaceTaskPriority | null | undefined): string;
  getDomainLabel(domain: WorkspaceTaskDomain | null | undefined): string;
};

const WorkspaceNodeEditorContext = React.createContext<WorkspaceNodeEditorContextValue | null>(
  null,
);

export function WorkspaceNodeEditorProvider(props: {
  value: WorkspaceNodeEditorContextValue;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceNodeEditorContext.Provider value={props.value}>
      {props.children}
    </WorkspaceNodeEditorContext.Provider>
  );
}

export function useWorkspaceNodeEditor() {
  const context = React.useContext(WorkspaceNodeEditorContext);

  if (!context) {
    throw new Error("useWorkspaceNodeEditor must be used within WorkspaceNodeEditorProvider.");
  }

  return context;
}
