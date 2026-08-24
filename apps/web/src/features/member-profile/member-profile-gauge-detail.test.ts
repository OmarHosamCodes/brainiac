import { describe, expect, test } from "bun:test";

import {
  buildGaugeDetail,
  type GaugeDetailContext,
} from "@/features/member-profile/member-profile-gauge-detail";

function baseContext(patch: Partial<GaugeDetailContext> = {}): GaugeDetailContext {
  return {
    canManageLeave: true,
    leavePeriodLabel: "2026",
    usedDays: 1,
    allowanceDays: 15,
    leaveEntries: [],
    periodLabel: "Aug 2026",
    periodHoursLabel: "95h 42m",
    periodTotalSeconds: 344_520,
    periodWasteSeconds: 0,
    periodWasteLabel: "0m",
    dayHours: [],
    calendarLabel: "August 2026",
    calendarDays: [],
    wasteDays: [],
    gauge: {
      key: "leaves",
      valueLabel: "1/15",
      ratio: 1 / 15,
      tone: "success",
    },
    ...patch,
  };
}

describe("buildGaugeDetail", () => {
  test("leaves explains allowance and offers add when manager", () => {
    const detail = buildGaugeDetail(
      baseContext({
        leaveEntries: [
          {
            id: "l1",
            startDate: "2026-08-01",
            endDate: "2026-08-01",
            typeLabel: "PTO",
            rangeLabel: "Aug 1, 2026",
          },
        ],
        gauge: { key: "leaves", valueLabel: "1/15", ratio: 1 / 15, tone: "success" },
      }),
    );
    expect(detail.title).toBe("Off days");
    expect(detail.explain).toContain("1 of 15");
    expect(detail.rows).toHaveLength(1);
    expect(detail.rows[0]?.meta).toBe("PTO");
    expect(detail.primaryAction).toEqual({ kind: "add_off_day", label: "Add off day" });
    expect(detail.emptyLabel).toBeNull();
  });

  test("leaves hides add when cannot manage leave", () => {
    const detail = buildGaugeDetail(
      baseContext({
        canManageLeave: false,
        gauge: { key: "leaves", valueLabel: "0/15", ratio: 0, tone: "success" },
      }),
    );
    expect(detail.primaryAction).toBeNull();
    expect(detail.emptyLabel).toMatch(/No off days/);
  });

  test("period lists day hours and focuses busiest day", () => {
    const detail = buildGaugeDetail(
      baseContext({
        dayHours: [
          {
            date: "2026-08-01",
            label: "Fri, Aug 1",
            hoursLabel: "2h",
            totalSeconds: 7200,
          },
          {
            date: "2026-08-02",
            label: "Sat, Aug 2",
            hoursLabel: "8h",
            totalSeconds: 28_800,
          },
        ],
        gauge: { key: "period", valueLabel: "10h", ratio: 0.5, tone: "foreground" },
      }),
    );
    expect(detail.title).toBe("Period hours");
    expect(detail.rows).toHaveLength(2);
    expect(detail.primaryAction).toEqual({
      kind: "focus_day",
      label: "View busiest day",
      date: "2026-08-02",
    });
  });

  test("period empty has no focus action", () => {
    const detail = buildGaugeDetail(
      baseContext({
        dayHours: [],
        gauge: { key: "period", valueLabel: "0m", ratio: 0.08, tone: "foreground" },
      }),
    );
    expect(detail.emptyLabel).toMatch(/No time logged/);
    expect(detail.primaryAction).toBeNull();
  });

  test("present lists calendar present days with streak summary", () => {
    const detail = buildGaugeDetail(
      baseContext({
        calendarDays: [
          {
            date: "2026-08-03",
            inMonth: true,
            status: "present",
            dayLabel: "Mon 3",
          },
          {
            date: "2026-08-04",
            inMonth: true,
            status: "empty",
            dayLabel: "Tue 4",
          },
        ],
        attendanceStreak: {
          currentStreak: 3,
          bestInMonth: 5,
          monthPresentDays: 9,
          segments: ["present", "present", "present", "missed", "missed", "missed", "missed"],
        },
        gauge: { key: "present", valueLabel: "3", ratio: 3 / 7, tone: "success" },
      }),
    );
    expect(detail.title).toBe("Attendance streak");
    expect(detail.explain).toContain("Best run in August 2026: 5 days");
    expect(detail.rows[0]).toEqual({ label: "This month", meta: "9 days" });
    expect(detail.rows[1]).toEqual({ label: "Best this month", meta: "5 days" });
    expect(detail.rows).toHaveLength(3);
    expect(detail.primaryAction).toEqual({
      kind: "focus_day",
      label: "View latest logged day",
      date: "2026-08-03",
    });
  });

  test("waste empty still explains share", () => {
    const detail = buildGaugeDetail(
      baseContext({
        periodWasteSeconds: 0,
        periodWasteLabel: "0m",
        wasteDays: [],
        gauge: { key: "waste", valueLabel: "0m", ratio: 0, tone: "warning" },
      }),
    );
    expect(detail.explain).toContain("0%");
    expect(detail.emptyLabel).toMatch(/No waste/);
    expect(detail.primaryAction).toBeNull();
  });

  test("waste lists days and focuses first", () => {
    const detail = buildGaugeDetail(
      baseContext({
        periodWasteSeconds: 3600,
        periodTotalSeconds: 36_000,
        periodWasteLabel: "1h",
        wasteDays: [
          { date: "2026-08-05", label: "Tue, Aug 5", hoursLabel: "1h" },
          { date: "2026-08-06", label: "Wed, Aug 6", hoursLabel: "30m" },
        ],
        gauge: { key: "waste", valueLabel: "1h", ratio: 0.1, tone: "warning" },
      }),
    );
    expect(detail.explain).toContain("10%");
    expect(detail.rows).toHaveLength(2);
    expect(detail.primaryAction).toEqual({
      kind: "focus_day",
      label: "View waste in activity",
      date: "2026-08-05",
    });
  });
});
