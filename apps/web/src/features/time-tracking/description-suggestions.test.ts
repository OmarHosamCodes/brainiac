import { describe, expect, test } from "bun:test";

import {
  bestTaskIdFromRankedSuggestions,
  buildDescriptionDatalistOptions,
  draftFromDescriptionSuggestion,
  existingTaskSuggestionFromRanked,
  normalizeSuggestionText,
  rankDescriptionDatalistOptions,
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
    startedAt: string;
  }>,
) {
  return {
    description: partial.description ?? "",
    taskId: partial.taskId ?? null,
    taskTitle: partial.taskTitle ?? null,
    projectId: partial.projectId ?? "p1",
    projectName: partial.projectName ?? "Project",
    clientName: partial.clientName ?? "Client",
    startedAt: partial.startedAt,
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
      entry({
        description: "Ship landing",
        projectName: "Alpha",
        clientName: "Acme",
        startedAt: "2026-07-28T12:00:00.000Z",
      }),
      entry({
        description: "Fix billing",
        projectName: "Beta",
        clientName: "Globex",
        startedAt: "2026-07-28T11:00:00.000Z",
      }),
    ]);

    expect(options).toEqual([
      {
        description: "Ship landing",
        taskId: null,
        taskTitle: null,
        projectId: "p1",
        projectName: "Alpha",
        clientName: "Acme",
        frequency: 1,
        lastUsedAtMs: Date.parse("2026-07-28T12:00:00.000Z"),
      },
      {
        description: "Fix billing",
        taskId: null,
        taskTitle: null,
        projectId: "p1",
        projectName: "Beta",
        clientName: "Globex",
        frequency: 1,
        lastUsedAtMs: Date.parse("2026-07-28T11:00:00.000Z"),
      },
    ]);
  });

  test("dedupes by normalized description and aggregates frequency", () => {
    const options = buildDescriptionDatalistOptions([
      entry({
        description: "Ship landing",
        taskId: "t1",
        taskTitle: "Landing",
        startedAt: "2026-07-28T12:00:00.000Z",
      }),
      entry({
        description: "  ship   landing ",
        taskId: "t2",
        taskTitle: "Older",
        startedAt: "2026-07-27T12:00:00.000Z",
      }),
    ]);

    expect(options).toHaveLength(1);
    expect(options[0]?.frequency).toBe(2);
    expect(options[0]?.taskId).toBe("t1");
  });
});

describe("rankDescriptionDatalistOptions", () => {
  const nowMs = Date.parse("2026-07-28T15:00:00.000Z");
  const options = buildDescriptionDatalistOptions([
    entry({
      description: "Homepage hero",
      taskId: "t-home",
      taskTitle: "Landing",
      projectId: "p-acme",
      projectName: "Acme Rebrand",
      startedAt: "2026-07-28T14:00:00.000Z",
    }),
    entry({
      description: "Brand guidelines",
      taskId: "t-brand",
      taskTitle: "Brand system",
      projectId: "p-other",
      projectName: "Other",
      startedAt: "2026-07-20T14:00:00.000Z",
    }),
    entry({
      description: "Homepage hero",
      taskId: "t-home",
      taskTitle: "Landing",
      projectId: "p-acme",
      projectName: "Acme Rebrand",
      startedAt: "2026-07-28T10:00:00.000Z",
    }),
  ]);

  test("ranks affinity + frequency ahead when query is empty", () => {
    const ranked = rankDescriptionDatalistOptions(options, {
      query: "",
      affinityProjectId: "p-acme",
      nowMs,
    });
    expect(ranked[0]?.description).toBe("Homepage hero");
    expect(ranked[0]?.frequency).toBe(2);
  });

  test("filters and prefers description prefix matches", () => {
    const ranked = rankDescriptionDatalistOptions(options, {
      query: "guidelines",
      nowMs,
    });
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.taskId).toBe("t-brand");
  });
});

describe("bestTaskIdFromRankedSuggestions", () => {
  test("returns the first compound with a task", () => {
    expect(
      bestTaskIdFromRankedSuggestions([
        {
          description: "Ad hoc",
          taskId: null,
          taskTitle: null,
          projectId: "p1",
          projectName: "P",
          clientName: "C",
          frequency: 1,
          lastUsedAtMs: 1,
        },
        {
          description: "Ship",
          taskId: "task-9",
          taskTitle: "Ship",
          projectId: "p1",
          projectName: "P",
          clientName: "C",
          frequency: 1,
          lastUsedAtMs: 2,
        },
      ]),
    ).toBe("task-9");
  });
});

describe("existingTaskSuggestionFromRanked", () => {
  test("returns the first ranked compound with a task different from current", () => {
    expect(
      existingTaskSuggestionFromRanked(
        [
          {
            description: "Landing",
            taskId: "t1",
            taskTitle: "Landing page",
            projectId: "p1",
            projectName: "Alpha",
            clientName: "Acme",
            frequency: 2,
            lastUsedAtMs: 1,
          },
        ],
        null,
      ),
    ).toEqual({ taskId: "t1", taskTitle: "Landing page", projectId: "p1" });
  });

  test("returns null when the ranked task is already selected", () => {
    expect(
      existingTaskSuggestionFromRanked(
        [
          {
            description: "Landing",
            taskId: "t1",
            taskTitle: "Landing page",
            projectId: "p1",
            projectName: "Alpha",
            clientName: "Acme",
            frequency: 2,
            lastUsedAtMs: 1,
          },
        ],
        "t1",
      ),
    ).toBeNull();
  });

  test("returns null when no ranked row has a task", () => {
    expect(
      existingTaskSuggestionFromRanked(
        [
          {
            description: "Misc",
            taskId: null,
            taskTitle: null,
            projectId: "p1",
            projectName: "Alpha",
            clientName: "Acme",
            frequency: 1,
            lastUsedAtMs: 1,
          },
        ],
        null,
      ),
    ).toBeNull();
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
        frequency: 1,
        lastUsedAtMs: 0,
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
        frequency: 1,
        lastUsedAtMs: 0,
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
      startedAt: "2026-07-28T12:00:00.000Z",
    }),
    entry({
      description: "Deploy",
      projectName: "Growth",
      clientName: "Design",
      startedAt: "2026-07-28T11:00:00.000Z",
    }),
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
