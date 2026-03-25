import { z } from "zod";

export const WORKSPACE_NODE_LIMIT = 200;
export const DEFAULT_WORKSPACE_NODE_WIDTH = 320;
export const DEFAULT_WORKSPACE_NODE_HEIGHT = 220;
export const DEFAULT_WORKSPACE_NODE_MIN_WIDTH = 260;
export const DEFAULT_WORKSPACE_NODE_MIN_HEIGHT = 180;

export const workspaceNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  content: z.string().max(4000),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  label: z.string().max(120).optional(),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const workspaceSaveInputSchema = z.object({
  nodes: z.array(workspaceNodeSchema).max(WORKSPACE_NODE_LIMIT),
});

export type WorkspaceNode = z.infer<typeof workspaceNodeSchema>;
export type WorkspaceSaveInput = z.infer<typeof workspaceSaveInputSchema>;

export function normalizeWorkspaceNode(node: WorkspaceNode): WorkspaceNode {
  return {
    ...node,
    content: node.content ?? "",
    label: node.label ?? node.title,
    minWidth: node.minWidth ?? DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
    minHeight: node.minHeight ?? DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
  };
}

export function cloneWorkspaceNodes(nodes: WorkspaceNode[]) {
  return nodes.map((node) => ({ ...node }));
}
