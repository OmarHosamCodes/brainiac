import type { KnowledgeBoardCardKind, WorkspaceNodeTint } from "@orch/workspace";
import type { Connection, Edge, Node, NodeChange } from "@xyflow/react";

import type { CanvasNodeModel } from "@/features/workspace/canvas/canvas-types";
import { isDocumentBoardCard } from "@/features/workspace-knowledge/board-cards";
import {
  getCanonicalConnectionPair,
  hasConnection,
} from "@/features/workspace/utils/workspace-node-connections";

export const WORKSPACE_FLOW_NODE_TYPE = "workspace" as const;
export const WORKSPACE_FLOW_EDGE_TYPE = "workspace" as const;

export const NODE_MIN_WIDTH = 260;
export const NODE_MIN_HEIGHT = 180;

export type WorkspaceFlowNodeData = {
  kind?: KnowledgeBoardCardKind;
  nodeType?: CanvasNodeModel["nodeType"];
  title?: string;
  tint?: WorkspaceNodeTint;
  chip?: string;
  readOnly?: boolean;
};

export type WorkspaceFlowEdgeData = {
  orchestratorNodeId: string;
  standardNodeId: string;
};

function isParentFrame(node: CanvasNodeModel): boolean {
  return node.kind === "folder" || node.kind === "inbox";
}

export function workspaceNodesToFlow(
  nodes: CanvasNodeModel[],
  selectedIds: string[],
): { flowNodes: Node<WorkspaceFlowNodeData>[]; flowEdges: Edge<WorkspaceFlowEdgeData>[] } {
  const selectedSet = new Set(selectedIds);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const flowNodes: Node<WorkspaceFlowNodeData>[] = nodes.map((node) => {
    const parent = node.parentId ? nodeById.get(node.parentId) : undefined;
    const isDocument = isDocumentBoardCard(node);
    const position = parent
      ? { x: node.x - parent.x, y: node.y - parent.y }
      : { x: node.x, y: node.y };
    return {
      id: node.id,
      type: WORKSPACE_FLOW_NODE_TYPE,
      position,
      width: node.width,
      height: node.height,
      style: isParentFrame(node) ? { width: node.width, height: node.height } : undefined,
      selected: selectedSet.has(node.id),
      parentId: parent ? node.parentId ?? undefined : undefined,
      extent: parent ? "parent" : undefined,
      zIndex: isParentFrame(node) ? -1 : undefined,
      data: {
        kind: node.kind,
        nodeType: node.nodeType,
        title: node.title ?? node.label,
        tint: node.dashboard?.tint,
        chip: node.chip,
        readOnly: node.readOnly,
      },
      draggable: node.kind !== "inbox",
      connectable: isDocument,
    };
  });

  const flowEdges: Edge<WorkspaceFlowEdgeData>[] = [];

  for (const node of nodes) {
    if (!isDocumentBoardCard(node) || node.nodeType !== "orchestrator" || !node.connections?.length) {
      continue;
    }

    for (const connection of node.connections) {
      const target = nodeById.get(connection.targetNodeId);
      if (!target || !isDocumentBoardCard(target)) {
        continue;
      }

      flowEdges.push({
        id: `${node.id}->${connection.targetNodeId}`,
        type: WORKSPACE_FLOW_EDGE_TYPE,
        source: node.id,
        target: connection.targetNodeId,
        sourceHandle: "source",
        targetHandle: "target",
        data: {
          orchestratorNodeId: node.id,
          standardNodeId: connection.targetNodeId,
        },
      });
    }
  }

  return { flowNodes, flowEdges };
}

export function applyFlowChangesToWorkspaceNodes(
  nodes: CanvasNodeModel[],
  changes: NodeChange<Node<WorkspaceFlowNodeData>>[],
): CanvasNodeModel[] | null {
  let next: CanvasNodeModel[] | null = null;
  const nodeById = () => new Map((next ?? nodes).map((node) => [node.id, node]));

  for (const change of changes) {
    if (change.type === "position" && change.position && change.dragging !== undefined) {
      const index = nodes.findIndex((node) => node.id === change.id);
      if (index < 0) continue;
      const current = (next ?? nodes)[index];
      if (!current) continue;
      const parent = current.parentId ? nodeById().get(current.parentId) : undefined;
      const nextX = parent ? parent.x + change.position.x : change.position.x;
      const nextY = parent ? parent.y + change.position.y : change.position.y;
      if (current.x === nextX && current.y === nextY) continue;
      next ??= nodes.slice();
      const dx = nextX - current.x;
      const dy = nextY - current.y;
      next[index] = { ...current, x: nextX, y: nextY };
      if (isParentFrame(current) && (dx !== 0 || dy !== 0)) {
        for (let childIndex = 0; childIndex < next.length; childIndex += 1) {
          const child = next[childIndex];
          if (!child || child.parentId !== current.id) continue;
          next[childIndex] = { ...child, x: child.x + dx, y: child.y + dy };
        }
      }
      continue;
    }

    if (
      change.type === "dimensions" &&
      change.dimensions &&
      (change.resizing === true || Boolean(change.setAttributes))
    ) {
      const index = nodes.findIndex((node) => node.id === change.id);
      if (index < 0) continue;
      const current = (next ?? nodes)[index];
      if (!current) continue;
      const minWidth = isParentFrame(current) ? 320 : NODE_MIN_WIDTH;
      const minHeight = isParentFrame(current) ? 240 : NODE_MIN_HEIGHT;
      const width = Math.max(Math.round(change.dimensions.width), minWidth);
      const height = Math.max(Math.round(change.dimensions.height), minHeight);
      if (current.width === width && current.height === height) continue;
      next ??= nodes.slice();
      next[index] = { ...current, width, height };
    }
  }

  return next;
}

export function flowConnectToPair(
  connection: Connection,
  nodes: CanvasNodeModel[],
): { orchestratorNodeId: string; standardNodeId: string } | null {
  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);
  if (!sourceNode || !targetNode) return null;
  if (!isDocumentBoardCard(sourceNode) || !isDocumentBoardCard(targetNode)) return null;
  return getCanonicalConnectionPair(sourceNode, targetNode);
}

export function isValidWorkspaceConnection(
  connection: Connection,
  nodes: CanvasNodeModel[],
): boolean {
  const pair = flowConnectToPair(connection, nodes);
  if (!pair) {
    return false;
  }

  return !hasConnection(nodes, pair.orchestratorNodeId, pair.standardNodeId);
}
