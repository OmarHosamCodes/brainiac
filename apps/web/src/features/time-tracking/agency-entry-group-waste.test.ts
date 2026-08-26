import { describe, expect, test } from "bun:test";

import {
  resolveWasteTogglePatch,
  summarizeEntryGroupWaste,
} from "@/features/time-tracking/agency-entry-group-waste";

function entry(
  id: string,
  patch: {
    isWaste?: boolean;
    taskIsWaste?: boolean;
    taskTitle?: string;
    projectName?: string;
  } = {},
) {
  return {
    id,
    isWaste: patch.isWaste ?? false,
    taskIsWaste: patch.taskIsWaste ?? false,
    taskTitle: patch.taskTitle ?? "Design",
    projectName: patch.projectName ?? "Client",
  };
}

describe("summarizeEntryGroupWaste", () => {
  test("all entry-flagged waste is dismissible", () => {
    const summary = summarizeEntryGroupWaste([
      entry("a", { isWaste: true }),
      entry("b", { isWaste: true }),
    ]);
    expect(summary.isAllWaste).toBe(true);
    expect(summary.isPartialWaste).toBe(false);
    expect(summary.canDismissEntryWaste).toBe(true);
    expect(summary.entryFlagIds).toEqual(["a", "b"]);
  });

  test("mixed resolved waste is partial", () => {
    const summary = summarizeEntryGroupWaste([
      entry("a", { isWaste: true }),
      entry("b", { isWaste: false }),
      entry("c", { isWaste: false }),
    ]);
    expect(summary.resolvedCount).toBe(1);
    expect(summary.isPartialWaste).toBe(true);
    expect(summary.isAllWaste).toBe(false);
    expect(summary.canDismissEntryWaste).toBe(true);
  });

  test("task-only waste is not dismissible via entry flag", () => {
    const summary = summarizeEntryGroupWaste([
      entry("a", { taskIsWaste: true }),
      entry("b", { taskIsWaste: true }),
    ]);
    expect(summary.isAllWaste).toBe(true);
    expect(summary.canDismissEntryWaste).toBe(false);
    expect(summary.entryFlagCount).toBe(0);
  });
});

describe("resolveWasteTogglePatch", () => {
  test("unmarks only entry-flagged rows in a mixed set", () => {
    expect(
      resolveWasteTogglePatch([entry("a", { isWaste: true }), entry("b", { isWaste: false })]),
    ).toEqual({ entryIds: ["a"], nextIsWaste: false });
  });

  test("marks all when none are entry-flagged", () => {
    expect(resolveWasteTogglePatch([entry("a"), entry("b", { taskIsWaste: true })])).toEqual({
      entryIds: ["a", "b"],
      nextIsWaste: true,
    });
  });

  test("unmarks all when every target is entry-flagged", () => {
    expect(
      resolveWasteTogglePatch([entry("a", { isWaste: true }), entry("b", { isWaste: true })]),
    ).toEqual({ entryIds: ["a", "b"], nextIsWaste: false });
  });
});
