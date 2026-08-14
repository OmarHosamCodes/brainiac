import { describe, expect, test } from "bun:test";

import { createWorkspaceNode } from "./index";
import {
  agencyRefFromRelations,
  knowledgeFolderPropertiesSchema,
  knowledgeObjectHref,
  knowledgeSourcePropertiesSchema,
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

  test("documents open node pages and knowledge cards open object pages", () => {
    expect(knowledgeObjectHref("document", "node-1")).toBe("/node/node-1");
    expect(knowledgeObjectHref("note", "kobj-1")).toBe("/object/kobj-1");
    expect(knowledgeObjectHref("folder", "kobj-2")).toBe("/object/kobj-2");
  });

  test("does not project notes into workspace document nodes", () => {
    expect(() =>
      knowledgeToWorkspaceNode(
        {
          id: "kobj-note",
          objectType: "note",
          title: "Remember",
          ownerUserId: "user-1",
          visibility: "private",
          teamId: null,
          properties: { body: "hello" },
          content: null,
          createdAt: "2026-08-14T07:00:00.000Z",
          updatedAt: "2026-08-14T07:00:00.000Z",
        },
        null,
        [],
      ),
    ).toThrow(/document objects project/);
  });

  test("folder in relations never become board noodles", () => {
    const folder = {
      id: "kobj-folder",
      objectType: "folder" as const,
      title: "Launch",
      ownerUserId: "user-1",
      visibility: "private" as const,
      teamId: null,
      properties: { title: "Launch" },
      content: null,
      createdAt: "2026-08-14T07:00:00.000Z",
      updatedAt: "2026-08-14T07:00:00.000Z",
    };
    const note = {
      id: "kobj-note",
      objectType: "note" as const,
      title: "Remember",
      ownerUserId: "user-1",
      visibility: "private" as const,
      teamId: null,
      properties: { body: "hello" },
      content: null,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
    const inRelation = {
      id: "krel-in",
      fromObjectId: note.id,
      fromObjectType: "note" as const,
      toObjectType: "folder" as const,
      toObjectId: folder.id,
      relationType: "in" as const,
      ownerUserId: "user-1",
      teamId: null,
      properties: {},
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
    const orchestrator = createWorkspaceNode({
      id: "node-orch",
      title: "Orch",
      ownerUserId: "user-1",
      nodeType: "orchestrator",
      connections: [{ targetNodeId: "node-target" }],
    });
    const projected = workspaceNodeToKnowledge(orchestrator);
    const restored = knowledgeToWorkspaceNode(projected.object, projected.placement, [
      ...projected.relations,
      inRelation,
    ]);
    expect(restored.connections).toEqual([{ targetNodeId: "node-target" }]);
    expect(inRelation.relationType).toBe("in");
  });

  test("parses source upload properties and folder title-only properties", () => {
    expect(
      knowledgeSourcePropertiesSchema.parse({
        kind: "upload",
        uploadId: "upload-1",
        filename: "brief.pdf",
        mediaType: "application/pdf",
      }).uploadId,
    ).toBe("upload-1");
    expect(knowledgeFolderPropertiesSchema.parse({ title: "Research" }).title).toBe("Research");
  });
});
