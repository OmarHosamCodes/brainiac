import { describe, expect, test } from "bun:test";

import { rangePresetLabel, rangePresets } from "@/features/dashboard/agency-dashboard-command-bar";

describe("dashboard command bar shim", () => {
  test("re-exports range presets from shared time-range command bar", () => {
    expect(rangePresets(false)).toEqual(["today", "week", "month", "last30", "custom"]);
    expect(rangePresetLabel("week")).toBe("This week");
  });
});
