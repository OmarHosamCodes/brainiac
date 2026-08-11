import { describe, expect, test } from "bun:test";

import type { ChooserClientGroup, ChooserProjectGroup } from "./agency-task-chooser-groups";
import {
  buildTaskChooserKeyboardItems,
  indexOfTaskChooserItem,
  taskChooserCreatePriority,
  taskChooserOptionDomId,
} from "./agency-task-chooser-keyboard";

function projectGroup(
  projectId: string,
  clientName: string,
  taskIds: string[],
): ChooserProjectGroup {
  return {
    project: {
      id: projectId,
      name: `Project ${projectId}`,
      clientName,
    },
    tasks: taskIds.map((taskId) => ({
      id: taskId,
      projectId,
      title: `Task ${taskId}`,
      status: "todo",
    })),
    isFavorite: false,
  };
}

describe("buildTaskChooserKeyboardItems", () => {
  test("includes projects and only tasks under expanded projects", () => {
    const favorites: ChooserProjectGroup[] = [projectGroup("p1", "Acme", ["t1", "t2"])];
    const clientGroups: ChooserClientGroup[] = [
      {
        clientName: "Beta",
        projects: [projectGroup("p2", "Beta", ["t3"])],
      },
    ];

    const collapsed = buildTaskChooserKeyboardItems({
      favorites,
      clientGroups,
      isProjectExpanded: () => false,
      isClientExpanded: () => true,
    });
    expect(collapsed.map((item) => item.kind)).toEqual(["project", "project"]);
    expect(collapsed.every((item) => item.kind === "project")).toBe(true);

    const expanded = buildTaskChooserKeyboardItems({
      favorites,
      clientGroups,
      isProjectExpanded: (id) => id === "p1",
      isClientExpanded: () => true,
    });
    expect(expanded.map((item) => ("taskId" in item ? item.taskId : item.projectId))).toEqual([
      "p1",
      "t1",
      "t2",
      "p2",
    ]);
  });

  test("skips projects under collapsed clients", () => {
    const clientGroups: ChooserClientGroup[] = [
      {
        clientName: "Hidden",
        projects: [projectGroup("p9", "Hidden", ["t9"])],
      },
    ];
    const items = buildTaskChooserKeyboardItems({
      favorites: [],
      clientGroups,
      isProjectExpanded: () => true,
      isClientExpanded: () => false,
    });
    expect(items).toEqual([]);
  });

  test("search mode can omit project rows so Enter always hits tasks", () => {
    const items = buildTaskChooserKeyboardItems({
      favorites: [projectGroup("p1", "Acme", ["t1"])],
      clientGroups: [],
      isProjectExpanded: () => true,
      isClientExpanded: () => true,
      includeProjects: false,
    });
    expect(items).toEqual([
      {
        kind: "task",
        key: "fav-task-t1",
        taskId: "t1",
        projectId: "p1",
      },
    ]);
  });

  test("pickProject search keeps project rows as keyboard targets", () => {
    const items = buildTaskChooserKeyboardItems({
      favorites: [projectGroup("p1", "Acme", ["t1"])],
      clientGroups: [],
      isProjectExpanded: () => true,
      isClientExpanded: () => true,
      includeProjects: true,
    });
    expect(items.map((item) => item.kind)).toEqual(["project", "task"]);
  });
});

describe("indexOfTaskChooserItem", () => {
  test("prefers task then project then first item", () => {
    const items = buildTaskChooserKeyboardItems({
      favorites: [projectGroup("p1", "Acme", ["t1"])],
      clientGroups: [],
      isProjectExpanded: () => true,
      isClientExpanded: () => true,
    });
    expect(indexOfTaskChooserItem(items, { taskId: "t1" })).toBe(1);
    expect(indexOfTaskChooserItem(items, { projectId: "p1" })).toBe(0);
    expect(indexOfTaskChooserItem([], {})).toBe(-1);
  });
});

describe("taskChooserCreatePriority", () => {
  test("demotes create when query has matches; elevates when empty", () => {
    expect(taskChooserCreatePriority({ searchTerm: "", hasVisibleResults: true })).toBe("default");
    expect(taskChooserCreatePriority({ searchTerm: "track", hasVisibleResults: true })).toBe(
      "demoted",
    );
    expect(taskChooserCreatePriority({ searchTerm: "zzz", hasVisibleResults: false })).toBe(
      "elevated",
    );
  });
});

describe("taskChooserOptionDomId", () => {
  test("prefixes option keys for aria-activedescendant", () => {
    expect(taskChooserOptionDomId("fav-task-1")).toBe("agency-task-chooser-option-fav-task-1");
  });
});
