import { describe, expect, it } from "bun:test";

import type { AgencyProjectTask, AgencyTaskProject } from "@/lib/schemas/agency-work";
import {
  buildAgencyTaskRailGroups,
  countClientDisplayRows,
  summarizeAgencyTaskRailGroups,
} from "@/lib/utils/agency-task-rail-grouping";

const baseTask = {
  teamId: "team-1",
  status: "open" as const,
  assignedToTeam: false,
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function task(
  overrides: Partial<AgencyProjectTask> &
    Pick<AgencyProjectTask, "id" | "projectId" | "title" | "taskKind">,
): AgencyProjectTask {
  return { ...baseTask, assignees: [], ...overrides };
}

const projects: AgencyTaskProject[] = [
  {
    id: "proj-1",
    clientId: "client-1",
    clientName: "Acme",
    name: "Website",
  },
  {
    id: "proj-2",
    clientId: "client-1",
    clientName: "Acme",
    name: "Mobile",
  },
];

describe("buildAgencyTaskRailGroups", () => {
  it("groups client → project → journey cluster + standalone tasks", () => {
    const tasks = [
      task({ id: "anchor", projectId: "proj-1", title: "Launch", taskKind: "journey_anchor" }),
      task({
        id: "ms-1",
        projectId: "proj-1",
        title: "Design",
        taskKind: "journey_milestone",
        assignees: [{ userId: "u1", userName: "Me", userAvatar: null, status: "open" }],
      }),
      task({ id: "std-1", projectId: "proj-1", title: "Fix bug", taskKind: "standard" }),
      task({ id: "std-2", projectId: "proj-2", title: "QA pass", taskKind: "standard" }),
    ];

    const groups = buildAgencyTaskRailGroups({
      tasks,
      projects,
      expandOptions: { currentUserId: "u1", allTasks: tasks },
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.clientName).toBe("Acme");
    expect(groups[0]?.projectGroups).toHaveLength(2);

    const website = groups[0]?.projectGroups.find((group) => group.projectId === "proj-1");
    expect(website?.journeyCluster?.anchorRow.task.id).toBe("anchor");
    expect(website?.journeyCluster?.milestoneRows).toHaveLength(1);
    expect(website?.standaloneRows).toHaveLength(1);
    expect(website?.standaloneRows[0]?.task.id).toBe("std-1");

    const mobile = groups[0]?.projectGroups.find((group) => group.projectId === "proj-2");
    expect(mobile?.journeyCluster).toBeNull();
    expect(mobile?.standaloneRows).toHaveLength(1);
  });

  it("puts milestones in standalone when anchor is hidden for viewer", () => {
    const tasks = [
      task({ id: "anchor", projectId: "proj-1", title: "Launch", taskKind: "journey_anchor" }),
      task({
        id: "ms-1",
        projectId: "proj-1",
        title: "Design",
        taskKind: "journey_milestone",
        assignees: [{ userId: "u2", userName: "Alex", userAvatar: null, status: "open" }],
      }),
    ];

    const groups = buildAgencyTaskRailGroups({
      tasks,
      projects,
      expandOptions: { currentUserId: "u1", allTasks: tasks },
    });

    const website = groups[0]?.projectGroups[0];
    expect(website?.journeyCluster).toBeNull();
    expect(website?.standaloneRows).toHaveLength(1);
    expect(website?.standaloneRows[0]?.rowKind).toBe("journey_milestone");
  });

  it("omits empty project groups", () => {
    const tasks = [
      task({ id: "std-1", projectId: "proj-1", title: "Only task", taskKind: "standard" }),
    ];

    const groups = buildAgencyTaskRailGroups({ tasks, projects: [projects[0]!] });
    expect(groups[0]?.projectGroups).toHaveLength(1);
    expect(groups[0]?.projectGroups[0]?.standaloneRows).toHaveLength(1);
  });
});

describe("summarizeAgencyTaskRailGroups", () => {
  it("counts journeys and standalone tasks separately", () => {
    const tasks = [
      task({ id: "anchor", projectId: "proj-1", title: "Launch", taskKind: "journey_anchor" }),
      task({
        id: "ms-1",
        projectId: "proj-1",
        title: "Design",
        taskKind: "journey_milestone",
        assignees: [{ userId: "u1", userName: "Me", userAvatar: null, status: "open" }],
      }),
      task({ id: "std-1", projectId: "proj-1", title: "Fix bug", taskKind: "standard" }),
    ];

    const groups = buildAgencyTaskRailGroups({
      tasks,
      projects: [projects[0]!],
      expandOptions: { currentUserId: "u1", allTasks: tasks },
    });

    expect(summarizeAgencyTaskRailGroups(groups)).toEqual({ journeyCount: 1, taskCount: 1 });
    expect(countClientDisplayRows(groups[0]!)).toBe(2);
  });
});
