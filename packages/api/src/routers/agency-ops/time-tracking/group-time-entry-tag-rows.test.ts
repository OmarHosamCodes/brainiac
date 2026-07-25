import { describe, expect, test } from "bun:test";

import { groupTimeEntryTagRows } from "./group-time-entry-tag-rows";

describe("groupTimeEntryTagRows", () => {
  test("groups tags per entry preserving row order", () => {
    const grouped = groupTimeEntryTagRows([
      { timeEntryId: "entry-1", tag: "alpha" },
      { timeEntryId: "entry-2", tag: "beta" },
      { timeEntryId: "entry-1", tag: "gamma" },
    ]);

    expect(grouped.get("entry-1")).toEqual(["alpha", "gamma"]);
    expect(grouped.get("entry-2")).toEqual(["beta"]);
  });

  test("returns empty map for no rows and no key for untagged entries", () => {
    const grouped = groupTimeEntryTagRows<string>([]);

    expect(grouped.size).toBe(0);
    expect(grouped.get("entry-1")).toBeUndefined();
  });
});
