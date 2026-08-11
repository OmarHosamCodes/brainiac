import type { WorkspaceNodeTint } from "@orch/workspace";
import type { Connection, Edge, Node, NodeChange } from "@xyflow/react";

import type { CanvasNodeModel } from "@/features/workspace/canvas/canvas-types";
import {
  getCanonicalConnectionPair,
  hasConnection,
} from "@/features/workspace/utils/workspace-node-connections";

export const WORKSPACE_FLOW_NODE_TYPE = "workspace" as const;
export const WORKSPACE_FLOW_EDGE_TYPE = "workspace" as const;

export const NODE_MIN_WIDTH = 260;
export const NODE_MIN_HEIGHT = 180;

export type WorkspaceFlowNodeData = {
  nodeType?: CanvasNodeModel["nodeType"];
  title?: string;
  tint?: WorkspaceNodeTint;
};

export type WorkspaceFlowEdgeData = {
  orchestratorNodeId: string;
  standardNodeId: string;
};

export function workspaceNodesToFlow(
  nodes: CanvasNodeModel[],
  selectedIds: string[],
): { flowNodes: Node<WorkspaceFlowNodeData>[]; flowEdges: Edge<WorkspaceFlowEdgeData>[] } {
  const selectedSet = new Set(selectedIds);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const flowNodes: Node<WorkspaceFlowNodeData>[] = nodes.map((node) => ({
    id: node.id,
    type: WORKSPACE_FLOW_NODE_TYPE,
    position: { x: node.x, y: node.y },
    width: node.width,
    height: node.height,
    selected: selectedSet.has(node.id),
    data: {
      nodeType: node.nodeType,
      title: node.title ?? node.label,
      tint: node.dashboard?.tint,
    },
    draggable: true,
    connectable: true,
  }));

  const flowEdges: Edge<WorkspaceFlowEdgeData>[] = [];

  for (const node of nodes) {
    if (node.nodeType !== "orchestrator" || !node.connections?.length) {
      continue;
    }

    for (const connection of node.connections) {
      if (!nodeById.has(connection.targetNodeId)) {
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

  for (const change of changes) {
    if (change.type === "position" && change.position && change.dragging !== undefined) {
      const index = nodes.findIndex((node) => node.id === change.id);
      if (index < 0) continue;
      const current = (next ?? nodes)[index];
      if (!current) continue;
      if (current.x === change.position.x && current.y === change.position.y) continue;
      next ??= nodes.slice();
      next[index] = { ...current, x: change.position.x, y: change.position.y };
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
      const width = Math.max(Math.round(change.dimensions.width), NODE_MIN_WIDTH);
      const height = Math.max(Math.round(change.dimensions.height), NODE_MIN_HEIGHT);
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
