import { describe, expect, test } from "bun:test";

import {
  buildGaugeDetail,
  buildStreakVisual,
  computeMonthPaceVisual,
  type GaugeDetailContext,
  type GaugeMonthPaceVisual,
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
    hoursBreakdown: { paidSeconds: 300_000, internalSeconds: 44_520 },
    dayHours: [],
    calendarLabel: "August 2026",
    calendarDays: [],
    wasteDays: [],
    monthPaceVisual: null,
    gauge: {
      key: "leaves",
      valueLabel: "1/15",
      ratio: 1 / 15,
      tone: "success",
    },
    ...patch,
  };
}

function sampleMonthPace(): GaugeMonthPaceVisual {
  return {
    monthLabel: "August 2026",
    loggedHours: 120,
    loggedHoursLabel: "120h",
    projectedHours: 168.5,
    projectedHoursLabel: "168h 30m",
    monthMinHours: 175,
    monthTargetHours: 200,
    elapsedWorkingDays: 12,
    remainingWorkingDays: 10,
    monthWorkingDays: 22,
    paceToMinHoursPerDay: 5.5,
    paceToTargetHoursPerDay: 8,
    onTrackForMin: false,
    onTrackForTarget: false,
    scaleMaxHours: 216,
  };
}

describe("buildGaugeDetail", () => {
  test("period with month pace visual replaces list body", () => {
    const pace = sampleMonthPace();
    const detail = buildGaugeDetail(
      baseContext({
        monthPaceVisual: pace,
        gauge: { key: "period", valueLabel: "120h", ratio: 0.6, tone: "foreground" },
      }),
    );
    expect(detail.monthPaceVisual).toEqual(pace);
    expect(detail.stats).toHaveLength(0);
    expect(detail.rows).toHaveLength(0);
  });

  test("present streak visual replaces day list", () => {
    const detail = buildGaugeDetail(
      baseContext({
        attendanceStreak: {
          currentStreak: 2,
          bestInMonth: 13,
          monthPresentDays: 21,
          monthWorkingDays: 22,
          segments: ["present", "present", "missed", "missed", "missed", "missed", "missed"],
        },
        gauge: { key: "present", valueLabel: "2", ratio: 2 / 7, tone: "success" },
      }),
    );
    expect(detail.streakVisual).toEqual(
      buildStreakVisual({
        calendarLabel: "August 2026",
        streak: {
          currentStreak: 2,
          bestInMonth: 13,
          monthPresentDays: 21,
          monthWorkingDays: 22,
          segments: ["present", "present", "missed", "missed", "missed", "missed", "missed"],
        },
      }),
    );
    expect(detail.rows).toHaveLength(0);
    expect(detail.rowsHeading).toBeNull();
    expect(detail.stats).toHaveLength(0);
  });
});

describe("buildStreakVisual", () => {
  test("computes days to best and coverage", () => {
    const visual = buildStreakVisual({
      calendarLabel: "August 2026",
      streak: {
        currentStreak: 2,
        bestInMonth: 13,
        monthPresentDays: 21,
        monthWorkingDays: 22,
        segments: [],
      },
    });
    expect(visual.daysToBest).toBe(11);
    expect(visual.monthCoverageRatio).toBeCloseTo(21 / 22);
  });
});

describe("computeMonthPaceVisual", () => {
  test("computes target from required daily hours and pace needed", () => {
    const pace = computeMonthPaceVisual({
      dayHours: [
        { date: "2026-08-04", label: "Mon", hoursLabel: "8h", totalSeconds: 28_800 },
        { date: "2026-08-05", label: "Tue", hoursLabel: "8h", totalSeconds: 28_800 },
      ],
      schedule: { weekStartsOn: 1, weekendDurationDays: 2, requiredDailyHours: 8 },
      monthlyMinHours: 150,
      todayKey: "2026-08-05",
    });
    expect(pace?.monthTargetHours).toBe(pace!.monthWorkingDays * 8);
    expect(pace?.paceToTargetHoursPerDay).toBeGreaterThan(pace!.paceToMinHoursPerDay);
  });
});
