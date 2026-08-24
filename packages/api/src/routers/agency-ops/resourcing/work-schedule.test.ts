import { describe, expect, test } from "bun:test";

import {
  computeAdjustedExpectations,
  countOffDaysOnWeekdaysInRange,
  countWeekdaysInRange,
  countWorkingDaysInRange,
} from "./work-schedule";

const schedule = { weekStartsOn: 1, weekendDurationDays: 2, requiredDailyHours: 8 };

describe("work-schedule leave-aware counts", () => {
  test("countWeekdaysInRange excludes weekends only", () => {
    expect(countWeekdaysInRange("2026-08-01", "2026-08-07", schedule)).toBe(5);
  });

  test("countWorkingDaysInRange excludes weekday off days", () => {
    const offDayKeys = new Set(["2026-08-04", "2026-08-05"]);
    expect(
      countWorkingDaysInRange("2026-08-03", "2026-08-07", schedule, offDayKeys),
    ).toBe(3);
  });

  test("countOffDaysOnWeekdaysInRange ignores weekend leave", () => {
    const offDayKeys = new Set(["2026-08-01", "2026-08-04"]);
    expect(
      countOffDaysOnWeekdaysInRange("2026-08-01", "2026-08-07", schedule, offDayKeys),
    ).toBe(1);
  });

  test("computeAdjustedExpectations lowers min and target", () => {
    const result = computeAdjustedExpectations({
      weekdaysInRange: 22,
      offDaysOnWeekdays: 3,
      baseMinHours: 175,
      requiredDailyHours: 8,
      offDayReduceHours: 8,
    });
    expect(result.adjustedMinHours).toBe(151);
    expect(result.adjustedTargetHours).toBe(152);
  });
});
