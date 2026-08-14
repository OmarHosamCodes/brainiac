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
});
