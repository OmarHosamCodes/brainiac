import { describe, expect, test } from "bun:test";

import {
  buildDescriptionDatalistOptions,
  draftFromDescriptionSuggestion,
  normalizeSuggestionText,
} from "./description-suggestions";
import { filterDescriptionDatalistOptions } from "./description-datalist";

function entry(
  partial: Partial<{
    description: string;
    taskId: string | null;
    taskTitle: string | null;
    projectId: string;
    projectName: string;
    clientName: string;
  }>,
) {
  return {
    description: partial.description ?? "",
    taskId: partial.taskId ?? null,
    taskTitle: partial.taskTitle ?? null,
    projectId: partial.projectId ?? "p1",
    projectName: partial.projectName ?? "Project",
    clientName: partial.clientName ?? "Client",
  };
}

describe("normalizeSuggestionText", () => {
  test("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeSuggestionText("  Hello   World  ")).toBe("hello world");
  });
});

describe("buildDescriptionDatalistOptions", () => {
  test("returns recent unique descriptions with project metadata", () => {
    const options = buildDescriptionDatalistOptions([
      entry({ description: "Ship landing", projectName: "Alpha", clientName: "Acme" }),
      entry({ description: "Fix billing", projectName: "Beta", clientName: "Globex" }),
    ]);

    expect(options).toEqual([
      {
        description: "Ship landing",
        taskId: null,
        taskTitle: null,
        projectId: "p1",
        projectName: "Alpha",
        clientName: "Acme",
      },
      {
        description: "Fix billing",
        taskId: null,
        taskTitle: null,
        projectId: "p1",
        projectName: "Beta",
        clientName: "Globex",
      },
    ]);
  });

  test("dedupes by normalized description", () => {
    const options = buildDescriptionDatalistOptions([
      entry({ description: "Ship landing" }),
      entry({ description: "  ship   landing " }),
    ]);

    expect(options).toHaveLength(1);
  });
});

describe("draftFromDescriptionSuggestion", () => {
  test("carries description, task, and project from an explicit pick", () => {
    expect(
      draftFromDescriptionSuggestion({
        description: "Ship landing",
        taskId: "task-1",
        taskTitle: "Landing",
        projectId: "proj-1",
        projectName: "Alpha",
        clientName: "Acme",
      }),
    ).toEqual({
      description: "Ship landing",
      taskId: "task-1",
      projectId: "proj-1",
    });
  });

  test("uses empty taskId when the suggestion has no task", () => {
    expect(
      draftFromDescriptionSuggestion({
        description: "Ad hoc",
        taskId: null,
        taskTitle: null,
        projectId: "proj-2",
        projectName: "Beta",
        clientName: "Globex",
      }),
    ).toEqual({
      description: "Ad hoc",
      taskId: "",
      projectId: "proj-2",
    });
  });
});

describe("filterDescriptionDatalistOptions", () => {
  const options = buildDescriptionDatalistOptions([
    entry({
      description: "Design review",
      taskTitle: "Mesh Madrasa",
      projectName: "Coaching",
      clientName: "Consultation",
    }),
    entry({ description: "Deploy", projectName: "Growth", clientName: "Design" }),
  ]);

  test("returns all options when query is empty", () => {
    expect(filterDescriptionDatalistOptions(options, "")).toHaveLength(2);
  });

  test("filters by description, task, project, or client", () => {
    expect(filterDescriptionDatalistOptions(options, "mesh")).toHaveLength(1);
    expect(filterDescriptionDatalistOptions(options, "consultation")).toHaveLength(1);
    expect(filterDescriptionDatalistOptions(options, "growth")).toHaveLength(1);
  });
});
