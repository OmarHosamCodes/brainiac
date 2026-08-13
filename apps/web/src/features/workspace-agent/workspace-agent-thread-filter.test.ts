import { describe, expect, test } from "bun:test";

import { filterWorkspaceAgentThreads } from "./workspace-agent-thread-filter";

const threads = [
  { id: "1", label: "August hours", preview: "Paid vs waste", stamp: "2026-08-14" },
  { id: "2", label: "Canvas brief", preview: "Hero block", stamp: "2026-08-13" },
];

describe("filterWorkspaceAgentThreads", () => {
  test("returns all threads for an empty query", () => {
    expect(filterWorkspaceAgentThreads(threads, "  ")).toEqual(threads);
  });

  test("matches title or preview case-insensitively", () => {
    expect(filterWorkspaceAgentThreads(threads, "waste").map((t) => t.id)).toEqual(["1"]);
    expect(filterWorkspaceAgentThreads(threads, "CANVAS").map((t) => t.id)).toEqual(["2"]);
  });

  test("still matches title when preview is empty", () => {
    expect(
      filterWorkspaceAgentThreads(
        [{ id: "3", label: "Gap fill", preview: "", stamp: "" }],
        "gap",
      ).map((t) => t.id),
    ).toEqual(["3"]);
  });
});
