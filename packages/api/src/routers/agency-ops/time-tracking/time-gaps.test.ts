import { describe, expect, test } from "bun:test";

import { carveAgencyTimeGaps } from "./time-gaps";

describe("carveAgencyTimeGaps", () => {
  test("returns the full window when there are no entries", () => {
    const gaps = carveAgencyTimeGaps({
      fromMs: Date.parse("2026-08-14T06:00:00.000Z"),
      toMs: Date.parse("2026-08-14T08:00:00.000Z"),
      entries: [],
    });
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.durationSeconds).toBe(7200);
    expect(gaps[0]?.projectId).toBeNull();
  });

  test("ignores gaps under 60 seconds", () => {
    const gaps = carveAgencyTimeGaps({
      fromMs: Date.parse("2026-08-14T06:00:00.000Z"),
      toMs: Date.parse("2026-08-14T06:10:00.000Z"),
      entries: [
        {
          startedAt: "2026-08-14T06:00:00.000Z",
          endedAt: "2026-08-14T06:09:30.000Z",
          projectId: "p1",
          taskId: "t1",
        },
      ],
    });
    expect(gaps).toEqual([]);
  });

  test("inherits project and task from the previous neighbor", () => {
    const gaps = carveAgencyTimeGaps({
      fromMs: Date.parse("2026-08-14T06:00:00.000Z"),
      toMs: Date.parse("2026-08-14T09:00:00.000Z"),
      entries: [
        {
          startedAt: "2026-08-14T06:00:00.000Z",
          endedAt: "2026-08-14T07:00:00.000Z",
          projectId: "p1",
          taskId: "t1",
        },
      ],
    });
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.projectId).toBe("p1");
    expect(gaps[0]?.taskId).toBe("t1");
    expect(gaps[0]?.durationSeconds).toBe(7200);
  });
});
