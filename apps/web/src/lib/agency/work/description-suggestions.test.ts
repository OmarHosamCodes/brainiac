import { describe, expect, test } from "bun:test";

import { buildDescriptionSuggestions, normalizeSuggestionText } from "./description-suggestions";

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

describe("buildDescriptionSuggestions", () => {
  test("shows recent suggestions when query is empty", () => {
    const suggestions = buildDescriptionSuggestions(
      [
        entry({ description: "Ship landing", projectId: "p1" }),
        entry({ description: "Fix billing", projectId: "p2" }),
      ],
      "",
    );
    expect(suggestions.map((s) => s.description)).toEqual(["Ship landing", "Fix billing"]);
  });

  test("filters by project when projectId is set", () => {
    const suggestions = buildDescriptionSuggestions(
      [
        entry({ description: "Ship landing", projectId: "p1" }),
        entry({ description: "Fix billing", projectId: "p2" }),
      ],
      "",
      { projectId: "p2" },
    );
    expect(suggestions.map((s) => s.description)).toEqual(["Fix billing"]);
  });

  test("ranks startsWith above includes when typed", () => {
    const suggestions = buildDescriptionSuggestions(
      [entry({ description: "later ship notes" }), entry({ description: "Ship landing" })],
      "ship",
    );
    expect(suggestions.map((s) => s.description)).toEqual(["Ship landing", "later ship notes"]);
  });

  test("dedupes by normalized description + projectId", () => {
    const suggestions = buildDescriptionSuggestions(
      [
        entry({ description: "Ship landing", projectId: "p1" }),
        entry({ description: "  ship   landing ", projectId: "p1" }),
        entry({ description: "Ship landing", projectId: "p2" }),
      ],
      "",
    );
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.projectId).toBe("p1");
    expect(suggestions[1]?.projectId).toBe("p2");
  });

  test("falls back to taskTitle when description is empty", () => {
    const suggestions = buildDescriptionSuggestions(
      [entry({ description: "  ", taskTitle: "Write brief" })],
      "",
    );
    expect(suggestions[0]?.description).toBe("Write brief");
  });
});
