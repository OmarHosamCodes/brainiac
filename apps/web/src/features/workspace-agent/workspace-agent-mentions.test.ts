import { describe, expect, test } from "bun:test";

import {
  getActiveWorkspaceAgentTrigger,
  getWorkspaceAgentSlashSuggestions,
  stripActiveWorkspaceAgentTrigger,
} from "./workspace-agent-mentions";

describe("getActiveWorkspaceAgentTrigger", () => {
  test("detects an @ query at the end", () => {
    expect(getActiveWorkspaceAgentTrigger("see @lau")).toEqual({
      kind: "at",
      query: "lau",
      start: 4,
      end: 8,
    });
  });

  test("detects a / query at the end", () => {
    expect(getActiveWorkspaceAgentTrigger("track /land")).toEqual({
      kind: "slash",
      query: "land",
      start: 6,
      end: 11,
    });
  });

  test("returns null when the trigger is closed", () => {
    expect(getActiveWorkspaceAgentTrigger("see @launch now")).toBeNull();
  });
});

describe("stripActiveWorkspaceAgentTrigger", () => {
  test("removes the active trigger token", () => {
    expect(stripActiveWorkspaceAgentTrigger("see @lau")).toBe("see ");
  });
});

describe("getWorkspaceAgentSlashSuggestions", () => {
  test("slash suggestions match label substrings and skip selected ids", () => {
    const selected = getWorkspaceAgentSlashSuggestions(
      [
        { kind: "task", id: "t1", label: "Landing page" },
        { kind: "task", id: "t2", label: "Invoice export" },
      ],
      "land",
      new Set(["t1"]),
    );
    expect(selected.map((entry) => entry.id)).toEqual([]);

    const open = getWorkspaceAgentSlashSuggestions(
      [
        { kind: "task", id: "t1", label: "Landing page" },
        { kind: "task", id: "t2", label: "Invoice export" },
      ],
      "land",
      new Set(),
    );
    expect(open.map((entry) => entry.id)).toEqual(["t1"]);
  });
});
