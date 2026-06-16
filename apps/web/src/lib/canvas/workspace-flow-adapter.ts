import type { WorkspaceNodeTint } from "@brainiac/workspace";
import type { Connection, Edge, Node, NodeChange } from "@xyflow/react";

import type { CanvasNodeModel } from "@/lib/canvas/canvas-types";
import {
  getCanonicalConnectionPair,
  hasConnection,
} from "@/lib/utils/workspace-node-connections";

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
    measured: { width: node.width, height: node.height },
    style: { width: node.width, height: node.height },
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
  let updated = false;
  const nodeById = new Map(nodes.map((node) => [node.id, { ...node }]));

  for (const change of changes) {
    if (change.type === "position" && change.position) {
      const node = nodeById.get(change.id);
      if (!node) {
        continue;
      }
      node.x = change.position.x;
      node.y = change.position.y;
      updated = true;
    }

    if (change.type === "dimensions" && change.dimensions) {
      const node = nodeById.get(change.id);
      if (!node) {
        continue;
      }
      node.width = Math.max(change.dimensions.width, NODE_MIN_WIDTH);
      node.height = Math.max(change.dimensions.height, NODE_MIN_HEIGHT);
      updated = true;
    }
  }

  if (!updated) {
    return null;
  }

  return nodes.map((node) => nodeById.get(node.id)!);
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
