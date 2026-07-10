import type { WorkspaceBlock } from "@orch/workspace";

export type WorkspaceBlockEditorProps<TBlock extends WorkspaceBlock = WorkspaceBlock> = {
  block: TBlock;
  tabId: string;
};
