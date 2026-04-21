import type { WorkspaceNode } from "@brainiac/workspace";

export type WorkspaceCanonicalConnectionPair = {
  orchestratorNodeId: string;
  standardNodeId: string;
};

type WorkspaceConnectionNode = Pick<WorkspaceNode, "id" | "nodeType" | "connections">;

export function getCanonicalConnectionPair(
  sourceNode: WorkspaceConnectionNode | null | undefined,
  targetNode: WorkspaceConnectionNode | null | undefined,
): WorkspaceCanonicalConnectionPair | null {
  if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) {
    return null;
  }

  // Agency-operator nodes are standalone — never participate in canvas connections.
  if (
    sourceNode.nodeType === "agency-operator" ||
    targetNode.nodeType === "agency-operator"
  ) {
    return null;
  }

  if (sourceNode.nodeType === targetNode.nodeType) {
    return null;
  }

  if (sourceNode.nodeType === "orchestrator") {
    return {
      orchestratorNodeId: sourceNode.id,
      standardNodeId: targetNode.id,
    };
  }

  return {
    orchestratorNodeId: targetNode.id,
    standardNodeId: sourceNode.id,
  };
}

export function hasConnection(
  nodes: WorkspaceConnectionNode[],
  orchestratorNodeId: string,
  standardNodeId: string,
) {
  const orchestratorNode = nodes.find((node) => node.id === orchestratorNodeId);

  if (!orchestratorNode || orchestratorNode.nodeType !== "orchestrator") {
    return false;
  }

  return orchestratorNode.connections.some((connection) => connection.targetNodeId === standardNodeId);
}

export function getEligibleConnectionTargetIds(
  nodes: WorkspaceConnectionNode[],
  sourceNodeId: string,
) {
  const sourceNode = nodes.find((node) => node.id === sourceNodeId);

  if (!sourceNode) {
    return [];
  }

  return nodes.flatMap((targetNode) => {
    const pair = getCanonicalConnectionPair(sourceNode, targetNode);

    if (!pair || hasConnection(nodes, pair.orchestratorNodeId, pair.standardNodeId)) {
      return [];
    }

    return [targetNode.id];
  });
}

export function sanitizeConnections(nodes: WorkspaceNode[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return nodes.map((node) => {
    if (node.nodeType !== "orchestrator") {
      return {
        ...node,
        connections: [],
      } satisfies WorkspaceNode;
    }

    const seenTargetIds = new Set<string>();
    const connections = node.connections.flatMap((connection) => {
      const targetNode = nodeById.get(connection.targetNodeId);

      if (
        !targetNode ||
        targetNode.id === node.id ||
        targetNode.nodeType !== "standard" ||
        seenTargetIds.has(targetNode.id)
      ) {
        return [];
      }

      seenTargetIds.add(targetNode.id);

      return [{ targetNodeId: targetNode.id }];
    });

    return {
      ...node,
      connections,
    } satisfies WorkspaceNode;
  });
}
