import { describe, expect, test } from "bun:test";

import { rangePresets } from "@/components/agency/agency-dashboard-command-bar";

describe("rangePresets", () => {
  test("includes Today and This month when tenure is unavailable", () => {
    expect(rangePresets(false)).toEqual(["today", "week", "month", "last30", "custom"]);
  });

  test("replaces This month with Tenure period when tenure is available", () => {
    expect(rangePresets(true)).toEqual(["tenure", "today", "week", "last30", "custom"]);
    expect(rangePresets(true)).not.toContain("month");
  });
});
