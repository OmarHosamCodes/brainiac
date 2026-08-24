import { describe, expect, test } from "bun:test";

import { computeAttendanceStreak } from "@/features/member-profile/member-profile-attendance-streak";

const schedule = { weekStartsOn: 1, weekendDurationDays: 2 };

describe("computeAttendanceStreak", () => {
  test("counts current streak across weekends", () => {
    const result = computeAttendanceStreak({
      anchorDate: "2026-08-10", // Mon
      schedule,
      heatDays: [
        { date: "2026-08-07", totalSeconds: 3600, off: null }, // Fri
        { date: "2026-08-06", totalSeconds: 3600, off: null }, // Thu
        { date: "2026-08-05", totalSeconds: 0, off: null }, // Wed
      ],
      calendarDays: [],
    });
    expect(result.currentStreak).toBe(2);
  });

  test("off day does not break streak", () => {
    const result = computeAttendanceStreak({
      anchorDate: "2026-08-10",
      schedule,
      heatDays: [
        { date: "2026-08-07", totalSeconds: 3600, off: null },
        {
          date: "2026-08-06",
          totalSeconds: 0,
          off: {
            leaveId: "1",
            type: "pto",
            reason: null,
            rangeStart: "2026-08-06",
            rangeEnd: "2026-08-06",
          },
        },
        { date: "2026-08-05", totalSeconds: 3600, off: null },
      ],
      calendarDays: [],
    });
    expect(result.currentStreak).toBe(2);
  });

  test("incomplete today does not break active streak", () => {
    const result = computeAttendanceStreak({
      anchorDate: "2026-08-10",
      schedule,
      heatDays: [
        { date: "2026-08-10", totalSeconds: 0, off: null },
        { date: "2026-08-07", totalSeconds: 3600, off: null },
      ],
      calendarDays: [],
    });
    expect(result.currentStreak).toBe(1);
  });

  test("best in month from calendar statuses", () => {
    const result = computeAttendanceStreak({
      anchorDate: "2026-08-24",
      schedule,
      heatDays: [],
      calendarDays: [
        { date: "2026-08-04", inMonth: true, status: "present" },
        { date: "2026-08-05", inMonth: true, status: "present" },
        { date: "2026-08-06", inMonth: true, status: "present" },
        { date: "2026-08-07", inMonth: true, status: "empty" },
        { date: "2026-08-08", inMonth: true, status: "weekend" },
        { date: "2026-08-11", inMonth: true, status: "present" },
      ],
    });
    expect(result.bestInMonth).toBe(3);
    expect(result.monthPresentDays).toBe(4);
  });

  test("segment chain returns seven working days", () => {
    const result = computeAttendanceStreak({
      anchorDate: "2026-08-10",
      schedule,
      heatDays: [
        { date: "2026-08-07", totalSeconds: 3600, off: null },
        { date: "2026-08-06", totalSeconds: 0, off: null },
      ],
      calendarDays: [],
    });
    expect(result.segments).toHaveLength(7);
    expect(result.segments.at(-1)).toBe("present");
    expect(result.segments.at(-2)).toBe("missed");
  });
});
