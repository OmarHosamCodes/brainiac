import { describe, expect, test } from "bun:test";
import { createWorkspaceNode, type WorkspaceNode } from "@orch/workspace";

import {
  getCanonicalConnectionPair,
  getEligibleConnectionTargetIds,
  hasConnection,
  sanitizeConnections,
} from "@/features/workspace/utils/workspace-node-connections";

function createNode(
  partial: Partial<WorkspaceNode> & {
    id: string;
    title: string;
  },
) {
  return createWorkspaceNode({
    x: 0,
    y: 0,
    ...partial,
  });
}

describe("workspace-node-connections", () => {
  test("canonicalizes connection direction between standard and orchestrator nodes", () => {
    const orchestratorNode = createNode({
      id: "orch-1",
      title: "Hub",
      nodeType: "orchestrator",
    });
    const standardNode = createNode({
      id: "std-1",
      title: "Leaf",
      nodeType: "standard",
    });

    expect(getCanonicalConnectionPair(standardNode, orchestratorNode)).toEqual({
      orchestratorNodeId: "orch-1",
      standardNodeId: "std-1",
    });
    expect(getCanonicalConnectionPair(orchestratorNode, standardNode)).toEqual({
      orchestratorNodeId: "orch-1",
      standardNodeId: "std-1",
    });
    expect(getCanonicalConnectionPair(orchestratorNode, orchestratorNode)).toBeNull();
    expect(
      getCanonicalConnectionPair(
        standardNode,
        createNode({
          id: "std-2",
          title: "Another leaf",
          nodeType: "standard",
        }),
      ),
    ).toBeNull();
  });

  test("returns only opposite-type unconnected targets", () => {
    const orchestratorA = createNode({
      id: "orch-a",
      title: "Alpha",
      nodeType: "orchestrator",
      connections: [{ targetNodeId: "std-a" }],
    });
    const orchestratorB = createNode({
      id: "orch-b",
      title: "Beta",
      nodeType: "orchestrator",
    });
    const standardA = createNode({
      id: "std-a",
      title: "Design",
      nodeType: "standard",
    });
    const standardB = createNode({
      id: "std-b",
      title: "Ops",
      nodeType: "standard",
    });
    const nodes = [orchestratorA, orchestratorB, standardA, standardB];

    expect(getEligibleConnectionTargetIds(nodes, "std-a")).toEqual(["orch-b"]);
    expect(getEligibleConnectionTargetIds(nodes, "orch-a")).toEqual(["std-b"]);
    expect(getEligibleConnectionTargetIds(nodes, "missing")).toEqual([]);
    expect(hasConnection(nodes, "orch-a", "std-a")).toBeTrue();
    expect(hasConnection(nodes, "orch-b", "std-a")).toBeFalse();
  });

  test("sanitizes duplicates, invalid targets, and standard-owned connections", () => {
    const orchestratorNode = {
      ...createNode({
        id: "orch-1",
        title: "Hub",
        nodeType: "orchestrator",
      }),
      connections: [
        { targetNodeId: "std-1" },
        { targetNodeId: "std-1" },
        { targetNodeId: "orch-2" },
        { targetNodeId: "missing" },
        { targetNodeId: "orch-1" },
      ],
    } satisfies WorkspaceNode;
    const secondOrchestrator = createNode({
      id: "orch-2",
      title: "Second hub",
      nodeType: "orchestrator",
    });
    const standardNode = {
      ...createNode({
        id: "std-1",
        title: "Leaf",
        nodeType: "standard",
      }),
      connections: [{ targetNodeId: "orch-1" }],
    } satisfies WorkspaceNode;

    const sanitizedNodes = sanitizeConnections([
      orchestratorNode,
      secondOrchestrator,
      standardNode,
    ]);

    expect(sanitizedNodes[0]?.connections).toEqual([{ targetNodeId: "std-1" }]);
    expect(sanitizedNodes[1]?.connections).toEqual([]);
    expect(sanitizedNodes[2]?.connections).toEqual([]);
  });
});
