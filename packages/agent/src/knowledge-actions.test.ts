import { describe, expect, test } from "bun:test";

import { knowledgeActionSchema } from "./knowledge-actions";

describe("knowledgeActionSchema", () => {
  test("parses object.create note about an agency project", () => {
    const action = knowledgeActionSchema.parse({
      type: "object.create",
      objectType: "note",
      title: "Scope cut",
      about: { objectType: "agency.project", id: "proj-1" },
    });
    expect(action.type).toBe("object.create");
    if (action.type === "object.create") {
      expect(action.about?.objectType).toBe("agency.project");
    }
  });

  test("rejects object.update on an agency task", () => {
    expect(() =>
      knowledgeActionSchema.parse({
        type: "object.update",
        objectId: "task-1",
        objectType: "agency.task",
        title: "Nope",
      }),
    ).toThrow(/Agency/);
  });

  test("parses relation.create about a project", () => {
    const action = knowledgeActionSchema.parse({
      type: "relation.create",
      fromObjectId: "kobj-1",
      to: { objectType: "agency.project", id: "proj-1" },
      relationType: "about",
    });
    expect(action.type).toBe("relation.create");
  });

  test("parses object.delete for canvas objects", () => {
    expect(
      knowledgeActionSchema.parse({
        type: "object.delete",
        objectId: "kobj-1",
      }).type,
    ).toBe("object.delete");
  });

  test("rejects object.delete on an agency project", () => {
    expect(() =>
      knowledgeActionSchema.parse({
        type: "object.delete",
        objectId: "proj-1",
        objectType: "agency.project",
      }),
    ).toThrow(/Agency/);
  });

  test("parses folder create and in relation", () => {
    expect(
      knowledgeActionSchema.parse({
        type: "object.create",
        objectType: "folder",
        title: "Research",
      }).type,
    ).toBe("object.create");
    const relation = knowledgeActionSchema.parse({
      type: "relation.create",
      fromObjectId: "kobj-note",
      to: { objectType: "folder", id: "kobj-folder" },
      relationType: "in",
    });
    expect(relation.type).toBe("relation.create");
    if (relation.type === "relation.create") {
      expect(relation.relationType).toBe("in");
    }
  });

  test("parses agency pin placement with teamId", () => {
    const action = knowledgeActionSchema.parse({
      type: "placement.upsert",
      objectId: "proj-1",
      objectType: "agency.project",
      teamId: "team-1",
      x: 12,
      y: 24,
    });
    expect(action.type).toBe("placement.upsert");
  });

  test("rejects agency pin placement without teamId", () => {
    expect(() =>
      knowledgeActionSchema.parse({
        type: "placement.upsert",
        objectId: "proj-1",
        objectType: "agency.project",
        x: 12,
        y: 24,
      }),
    ).toThrow(/teamId/);
  });
});
