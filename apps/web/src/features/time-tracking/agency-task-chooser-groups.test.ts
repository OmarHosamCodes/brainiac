import { describe, expect, test } from "bun:test";

import { buildAgencyTaskChooserSections } from "./agency-task-chooser-groups";

const projects = [
  { id: "p1", name: "Website", clientName: "Acme", clientId: "c1", colorHueId: 3 },
  { id: "p2", name: "Internal", clientName: "No client", clientId: "c2", colorHueId: null },
  { id: "p3", name: "Empty", clientName: "Acme", clientId: "c1", colorHueId: 1 },
];

const tasks = [
  { id: "t1", projectId: "p1", title: "Design", status: "open" },
  { id: "t2", projectId: "p1", title: "Build", status: "in_progress" },
  { id: "t3", projectId: "p2", title: "Ops", status: "open" },
];

describe("buildAgencyTaskChooserSections", () => {
  test("shows all projects including zero-task projects", () => {
    const sections = buildAgencyTaskChooserSections({
      projects,
      tasks,
      favoriteProjectIds: [],
      favoriteTaskIds: [],
      searchTerm: "",
    });

    const allProjectIds = sections.clientGroups.flatMap((group) =>
      group.projects.map((entry) => entry.project.id),
    );
    expect(allProjectIds).toContain("p3");
    expect(sections.favorites).toEqual([]);
  });

  test("puts favorite projects first and excludes them from client groups", () => {
    const sections = buildAgencyTaskChooserSections({
      projects,
      tasks,
      favoriteProjectIds: ["p1"],
      favoriteTaskIds: [],
      searchTerm: "",
    });

    expect(sections.favorites.map((entry) => entry.project.id)).toEqual(["p1"]);
    expect(
      sections.clientGroups.flatMap((group) => group.projects.map((entry) => entry.project.id)),
    ).not.toContain("p1");
  });

  test("filters by client or project name while keeping matching empty projects", () => {
    const sections = buildAgencyTaskChooserSections({
      projects,
      tasks,
      favoriteProjectIds: [],
      favoriteTaskIds: [],
      searchTerm: "Empty",
    });

    const allProjectIds = [
      ...sections.favorites.map((entry) => entry.project.id),
      ...sections.clientGroups.flatMap((group) => group.projects.map((entry) => entry.project.id)),
    ];
    expect(allProjectIds).toEqual(["p3"]);
  });

  test("pulls project into favorites when only a task is favorited", () => {
    const sections = buildAgencyTaskChooserSections({
      projects,
      tasks,
      favoriteProjectIds: [],
      favoriteTaskIds: ["t3"],
      searchTerm: "",
    });

    expect(sections.favorites.map((entry) => entry.project.id)).toEqual(["p2"]);
  });
});
