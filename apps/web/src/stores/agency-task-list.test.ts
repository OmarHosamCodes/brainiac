import { describe, expect, test } from "bun:test";

import { resolveDefaultCreateProjectId } from "@/stores/agency-task-list";

describe("resolveDefaultCreateProjectId", () => {
  const projects = [{ id: "a" }, { id: "b" }];

  test("prefers last-used when still valid", () => {
    expect(resolveDefaultCreateProjectId({ projects, lastUsedProjectId: "b" })).toBe("b");
  });

  test("falls back to sole project", () => {
    expect(
      resolveDefaultCreateProjectId({
        projects: [{ id: "only" }],
        lastUsedProjectId: "stale",
      }),
    ).toBe("only");
  });

  test("returns empty when ambiguous", () => {
    expect(resolveDefaultCreateProjectId({ projects, lastUsedProjectId: "stale" })).toBe("");
  });
});
