import type {
  WorkspaceNodeConnection,
  WorkspaceNodeTint,
  WorkspaceNodeType,
} from "@orch/workspace";

export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasNodeModel extends CanvasRect {
  id: string;
  label?: string;
  title?: string;
  content?: string;
  nodeType?: WorkspaceNodeType;
  connections?: WorkspaceNodeConnection[];
  minWidth?: number;
  minHeight?: number;
  dashboard?: {
    tint?: WorkspaceNodeTint;
  };
}
