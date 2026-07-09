import { describe, expect, test } from "bun:test";

import type { AgencyProjectTask } from "@/features/task-management/agency-work";

import {
  buildTaskSuggestionQueryFilters,
  selectTaskSuggestions,
  TASK_SUGGESTION_ACTIVE_STATUSES,
} from "./agency-task-suggestion-query";

function makeTask(
  overrides: Partial<AgencyProjectTask> & Pick<AgencyProjectTask, "id" | "projectId" | "title">,
): AgencyProjectTask {
  return {
    teamId: "team-1",
    status: "open",
    assignedToTeam: false,
    assignees: [],
    dueDate: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildTaskSuggestionQueryFilters", () => {
  test("disables query when suggestions are inactive", () => {
    expect(
      buildTaskSuggestionQueryFilters({
        suggestionsActive: false,
        selectedProjectId: "",
      }),
    ).toEqual({ enabled: false });
  });

  test("loads active tasks without assignee scoping for cross-project search", () => {
    expect(
      buildTaskSuggestionQueryFilters({
        suggestionsActive: true,
        selectedProjectId: "",
      }),
    ).toEqual({
      enabled: true,
      filters: {
        statuses: TASK_SUGGESTION_ACTIVE_STATUSES,
        pageSize: 50,
      },
    });
  });

  test("includes projectId when a project is selected", () => {
    expect(
      buildTaskSuggestionQueryFilters({
        suggestionsActive: true,
        selectedProjectId: "project-1",
      }),
    ).toEqual({
      enabled: true,
      filters: {
        projectId: "project-1",
        statuses: TASK_SUGGESTION_ACTIVE_STATUSES,
        pageSize: 50,
      },
    });
  });
});

describe("selectTaskSuggestions", () => {
  test('short query "AI" matches exact title "AI"', () => {
    const learningTask = makeTask({
      id: "ai-task",
      projectId: "learning",
      title: "AI",
    });
    const otherTask = makeTask({
      id: "other",
      projectId: "learning",
      title: "Design review",
    });

    expect(selectTaskSuggestions([learningTask, otherTask], "AI").map((task) => task.id)).toEqual([
      "ai-task",
    ]);
  });
});
