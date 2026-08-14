import { createWorkspaceNode } from "@orch/workspace";
import { describe, expect, test } from "bun:test";

import {
  agencyProjectHref,
  agencyRefFromKnowledgeTargets,
  agencyRefHref,
  canvasNodeHref,
  findCanvasNodeForAgencyProject,
} from "./workspace-agency-links";

describe("workspace-agency-links", () => {
  test("builds agency and canvas hrefs", () => {
    expect(agencyProjectHref("proj-1")).toBe("/agency/projects/proj-1");
    expect(canvasNodeHref("node-1")).toBe("/node/node-1");
  });

  test("finds a team-shared node by project ref", () => {
    const linked = createWorkspaceNode({
      title: "Launch",
      visibility: "team",
      teamId: "team-1",
      agencyRef: { teamId: "team-1", projectId: "proj-1" },
    });
    const other = createWorkspaceNode({ title: "Notes" });
    expect(findCanvasNodeForAgencyProject([other, linked], "proj-1")?.id).toBe(linked.id);
  });

  test("agencyRefHref prefers task then project", () => {
    expect(agencyRefHref({ teamId: "t1", projectId: "p1", taskId: "task-9" })).toBe(
      "/agency/projects/p1?taskId=task-9",
    );
    expect(agencyRefHref({ teamId: "t1" })).toBeNull();
  });

  test("agencyRefFromKnowledgeTargets requires a project id", () => {
    expect(agencyRefFromKnowledgeTargets({ teamId: "t1" })).toBeNull();
    expect(
      agencyRefFromKnowledgeTargets({ teamId: "t1", projectId: "p1", taskId: "task-9" }),
    ).toEqual({
      teamId: "t1",
      projectId: "p1",
      taskId: "task-9",
    });
  });
});
