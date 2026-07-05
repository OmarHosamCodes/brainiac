import { describe, expect, test } from "bun:test";
import {
  parseBeforeDate,
  resolveTaskConflicts,
  type ImportCatalog,
} from "./clockify-import";

describe("parseBeforeDate", () => {
  test("parses YYYY-MM-DD as UTC midnight", () => {
    expect(parseBeforeDate("2026-06-25").toISOString()).toBe("2026-06-25T00:00:00.000Z");
  });

  test("rejects invalid format", () => {
    expect(() => parseBeforeDate("25-06-2026")).toThrow();
  });
});

describe("resolveTaskConflicts", () => {
  test("remaps incoming task id when title exists on same project", () => {
    const catalog: ImportCatalog = {
      clients: new Map(),
      projects: new Map(),
      tasks: new Map([
        [
          "name-design",
          {
            id: "clockify-task-name-design",
            title: "Design",
            projectId: "clockify-project-abc",
          },
        ],
      ]),
      timeEntries: [],
      skipped: [],
      skippedByBefore: 0,
      duplicateEntryIds: 0,
      taskConflicts: [],
    };

    const existing = new Map([
      ["clockify-project-abc|design", "manual-task-id"],
    ]);

    const remapped = resolveTaskConflicts(catalog, existing);
    expect(remapped.get("clockify-task-name-design")).toBe("manual-task-id");
    expect(catalog.taskConflicts).toHaveLength(1);
  });
});
