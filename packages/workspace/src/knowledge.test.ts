import { describe, expect, test } from "bun:test";

import { createWorkspaceNode } from "./index";
import {
  agencyRefFromRelations,
  knowledgeToWorkspaceNode,
  workspaceNodeToKnowledge,
} from "./knowledge";

describe("workspace knowledge projectors", () => {
  test("round-trips orchestrator layout and connections without leaking about onto edges", () => {
    const target = createWorkspaceNode({
      id: "node-target",
      title: "Target",
      ownerUserId: "user-1",
      x: 40,
      y: 80,
    });
    const orchestrator = createWorkspaceNode({
      id: "node-orch",
      title: "Orch",
      ownerUserId: "user-1",
      nodeType: "orchestrator",
      x: 10,
      y: 20,
      width: 400,
      height: 240,
      connections: [{ targetNodeId: target.id }],
    });

    const projected = workspaceNodeToKnowledge(orchestrator);
    const extraAbout = {
      ...projected.relations[0]!,
      id: "krel-extra-about",
      relationType: "about" as const,
      toObjectType: "agency.project" as const,
      toObjectId: "proj-1",
    };
    const restored = knowledgeToWorkspaceNode(projected.object, projected.placement, [
      ...projected.relations,
      extraAbout,
    ]);

    expect(restored.x).toBe(10);
    expect(restored.y).toBe(20);
    expect(restored.width).toBe(400);
    expect(restored.height).toBe(240);
    expect(restored.nodeType).toBe("orchestrator");
    expect(restored.connections).toEqual([{ targetNodeId: target.id }]);
    expect(projected.relations.some((relation) => relation.relationType === "related")).toBe(true);
  });

  test("maps team agencyRef to about relations and back onto the node", () => {
    const node = createWorkspaceNode({
      id: "node-launch",
      title: "Launch",
      ownerUserId: "user-1",
      visibility: "team",
      teamId: "team-1",
      agencyRef: { teamId: "team-1", projectId: "proj-1", taskId: "task-1" },
    });

    const projected = workspaceNodeToKnowledge(node);
    expect(projected.object.objectType).toBe("document");
    expect(
      projected.relations.map((relation) => `${relation.toObjectType}:${relation.toObjectId}`),
    ).toEqual(["agency.project:proj-1", "agency.task:task-1"]);
    expect(projected.relations.every((relation) => relation.relationType === "about")).toBe(true);

    const restored = knowledgeToWorkspaceNode(
      projected.object,
      projected.placement,
      projected.relations,
    );
    expect(restored.agencyRef).toEqual({
      teamId: "team-1",
      projectId: "proj-1",
      taskId: "task-1",
    });
    expect(restored.connections).toEqual([]);
    expect(agencyRefFromRelations(projected.object, projected.relations)?.projectId).toBe("proj-1");
  });

  test("does not put related edges on a standard note projection", () => {
    const note = {
      id: "kobj-note",
      objectType: "note" as const,
      title: "Remember",
      ownerUserId: "user-1",
      visibility: "private" as const,
      teamId: null,
      properties: { body: "hello" },
      content: null,
      createdAt: "2026-08-14T07:00:00.000Z",
      updatedAt: "2026-08-14T07:00:00.000Z",
    };
    const restored = knowledgeToWorkspaceNode(note, null, [
      {
        id: "krel-1",
        fromObjectId: note.id,
        fromObjectType: "note",
        toObjectType: "document",
        toObjectId: "node-other",
        relationType: "related",
        ownerUserId: "user-1",
        teamId: null,
        properties: {},
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    ]);
    expect(restored.connections).toEqual([]);
    expect(restored.tabs[0]?.blocks[0]?.type).toBe("notes");
  });
});
