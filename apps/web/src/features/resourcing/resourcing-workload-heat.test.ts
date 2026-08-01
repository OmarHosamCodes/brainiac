import { describe, expect, test } from "bun:test";

import {
  groupWeekStartsByMonth,
  periodAnchorUtc,
  shiftPeriodAnchor,
  teamWeekUtilizationPct,
  weeksForGrain,
  workloadDisplayHours,
  workloadHeatTone,
} from "@/features/resourcing/resourcing-workload-heat";

describe("resourcing-workload-heat", () => {
  test("quarter grain anchors to week of quarter start and spans 12 weeks", () => {
    const anchor = periodAnchorUtc(new Date("2026-08-01T12:00:00.000Z"), "quarter");
    expect(anchor.toISOString()).toBe("2026-06-29T00:00:00.000Z");
    expect(weeksForGrain("quarter")).toBe(12);
  });

  test("shiftPeriodAnchor moves quarters", () => {
    const q3 = periodAnchorUtc(new Date("2026-08-01T00:00:00.000Z"), "quarter");
    const q4 = shiftPeriodAnchor(q3, "quarter", 1);
    expect(q4.toISOString()).toBe("2026-09-28T00:00:00.000Z");
  });

  test("workloadDisplayHours prefers capacity when set", () => {
    expect(
      workloadDisplayHours({ capacitySeconds: 144000, loggedSeconds: 3600, bookedSeconds: 0 }),
    ).toBe(40);
    expect(
      workloadDisplayHours({ capacitySeconds: 0, loggedSeconds: 7200, bookedSeconds: 3600 }),
    ).toBe(3);
  });

  test("workloadHeatTone buckets hours for planner coloring", () => {
    expect(workloadHeatTone(0)).toBe("empty");
    expect(workloadHeatTone(10)).toBe("low");
    expect(workloadHeatTone(22)).toBe("mid");
    expect(workloadHeatTone(32)).toBe("high");
    expect(workloadHeatTone(40)).toBe("full");
  });

  test("groupWeekStartsByMonth groups consecutive weeks", () => {
    const groups = groupWeekStartsByMonth([
      "2026-06-29T00:00:00.000Z",
      "2026-07-06T00:00:00.000Z",
      "2026-08-03T00:00:00.000Z",
    ]);
    expect(groups).toHaveLength(3);
    expect(groups[0]?.weekStarts).toHaveLength(1);
    expect(groups[1]?.key).toBe("2026-07");
  });

  test("teamWeekUtilizationPct returns null without capacity", () => {
    expect(
      teamWeekUtilizationPct([{ capacitySeconds: 0, loggedSeconds: 3600, bookedSeconds: 0 }]),
    ).toBeNull();
    expect(
      teamWeekUtilizationPct([{ capacitySeconds: 144000, loggedSeconds: 72000, bookedSeconds: 0 }]),
    ).toBe(50);
  });
});
