import { describe, expect, test } from "bun:test";

import { mapAgencyMemberView, mapAgencyProjectView, mapAgencyTaskView } from "./knowledge-agency";

describe("agency knowledge views", () => {
  test("maps a project to a live knowledge view with Agency href", () => {
    const view = mapAgencyProjectView({
      id: "proj-1",
      name: "Launch",
      teamId: "team-1",
      clientId: "client-1",
    });
    expect(view.origin).toBe("agency");
    expect(view.objectType).toBe("agency.project");
    expect(view.href).toBe("/agency/projects/proj-1");
  });

  test("maps a task with project query href", () => {
    const view = mapAgencyTaskView({
      id: "task-1",
      title: "Ship",
      teamId: "team-1",
      projectId: "proj-1",
      status: "open",
    });
    expect(view.href).toContain("taskId=task-1");
  });

  test("maps a member to /agency/members/:userId", () => {
    const view = mapAgencyMemberView({
      userId: "user-1",
      userName: "Omar",
      teamId: "team-1",
    });
    expect(view.href).toBe("/agency/members/user-1");
  });
});
