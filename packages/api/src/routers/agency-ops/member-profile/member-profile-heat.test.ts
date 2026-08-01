import { describe, expect, test } from "bun:test";

import { buildHeatDays, expandLeaveDays, intensityFromSeconds } from "./member-profile-heat";

describe("expandLeaveDays", () => {
  test("paints connected inclusive ranges inside the window", () => {
    const map = expandLeaveDays(
      [
        {
          id: "leave_1",
          startDate: "2026-07-30",
          endDate: "2026-08-02",
          type: "pto",
          reason: "Long weekend",
        },
      ],
      "2026-08-01",
      "2026-08-31",
    );
    expect([...map.keys()].sort()).toEqual(["2026-08-01", "2026-08-02"]);
    expect(map.get("2026-08-01")?.id).toBe("leave_1");
  });
});

describe("intensityFromSeconds", () => {
  test("returns 0 for empty days", () => {
    expect(intensityFromSeconds(0, 28_800)).toBe(0);
  });

  test("scales into 1–4 buckets", () => {
    expect(intensityFromSeconds(1_000, 10_000)).toBe(1);
    expect(intensityFromSeconds(3_000, 10_000)).toBe(2);
    expect(intensityFromSeconds(5_000, 10_000)).toBe(3);
    expect(intensityFromSeconds(9_000, 10_000)).toBe(4);
  });
});

describe("buildHeatDays", () => {
  test("merges hours and off overlay", () => {
    const secondsByDate = new Map([
      ["2026-08-01", 7200],
      ["2026-08-02", 0],
    ]);
    const leaveByDate = expandLeaveDays(
      [
        {
          id: "leave_1",
          startDate: "2026-08-02",
          endDate: "2026-08-03",
          type: "sick",
          reason: null,
        },
      ],
      "2026-08-01",
      "2026-08-03",
    );
    const days = buildHeatDays({
      windowStart: "2026-08-01",
      windowEnd: "2026-08-03",
      secondsByDate,
      leaveByDate,
    });
    expect(days).toHaveLength(3);
    expect(days[0]?.intensity).toBeGreaterThan(0);
    expect(days[0]?.off).toBeNull();
    expect(days[1]?.off?.leaveId).toBe("leave_1");
    expect(days[2]?.off?.rangeEnd).toBe("2026-08-03");
  });
});
