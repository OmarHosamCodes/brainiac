import type { WorkspaceNode } from "@orch/workspace";

let applyWorkspaceSnapshotHandler:
  | ((nodes: WorkspaceNode[], updatedAt: string | null) => void)
  | null = null;

export function bindApplyWorkspaceSnapshotHandler(
  handler: ((nodes: WorkspaceNode[], updatedAt: string | null) => void) | null,
) {
  applyWorkspaceSnapshotHandler = handler;
}

export function applyBoundWorkspaceSnapshot(nodes: WorkspaceNode[], updatedAt: string | null) {
  applyWorkspaceSnapshotHandler?.(nodes, updatedAt);
}
