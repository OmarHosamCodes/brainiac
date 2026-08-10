import { describe, expect, test } from "bun:test";

import { createWorkspaceNode } from "./index";
import { workspaceNodeSchema } from "./schemas";

describe("workspaceNode agencyRef", () => {
  test("accepts a team-shared node with matching agencyRef", () => {
    const node = createWorkspaceNode({
      title: "Launch",
      visibility: "team",
      teamId: "team-1",
      agencyRef: { teamId: "team-1", projectId: "proj-1", taskId: "task-1" },
    });
    expect(workspaceNodeSchema.parse(node).agencyRef?.taskId).toBe("task-1");
  });

  test("rejects agencyRef on a private node", () => {
    expect(() =>
      workspaceNodeSchema.parse(
        createWorkspaceNode({
          title: "Private",
          agencyRef: { teamId: "team-1", projectId: "proj-1" },
        }),
      ),
    ).toThrow(/team-visible/);
  });

  test("rejects agencyRef team mismatch", () => {
    expect(() =>
      workspaceNodeSchema.parse(
        createWorkspaceNode({
          title: "Launch",
          visibility: "team",
          teamId: "team-1",
          agencyRef: { teamId: "team-2", projectId: "proj-1" },
        }),
      ),
    ).toThrow(/teamId/);
  });

  test("keeps a tombstone ref after the linked ids stay on the node", () => {
    const node = createWorkspaceNode({
      title: "Launch",
      visibility: "team",
      teamId: "team-1",
      agencyRef: { teamId: "team-1", projectId: "deleted-project" },
    });
    expect(node.agencyRef?.projectId).toBe("deleted-project");
  });
});
