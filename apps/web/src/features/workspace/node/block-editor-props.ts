import type { WorkspaceBlock } from "@brainiac/workspace";

export type WorkspaceBlockEditorProps<TBlock extends WorkspaceBlock = WorkspaceBlock> = {
  block: TBlock;
  tabId: string;
};
