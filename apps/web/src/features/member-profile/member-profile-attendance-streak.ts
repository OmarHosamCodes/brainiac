import { addDaysToDateKey } from "@orch/api/routers/agency-ops/time-tracking/local-week-bounds";
import { isWeekendDateKey } from "@orch/api/routers/agency-ops/resourcing/work-schedule";

export type StreakSegmentState = "present" | "missed" | "off" | "future";

export type AttendanceStreakModel = {
  currentStreak: number;
  bestInMonth: number;
  monthPresentDays: number;
  monthWorkingDays: number;
  segments: StreakSegmentState[];
};

type HeatDay = {
  date: string;
  totalSeconds: number;
  off: {
    leaveId: string;
    type: string;
    reason: string | null;
    rangeStart: string;
    rangeEnd: string;
  } | null;
};

type CalendarDay = {
  date: string;
  inMonth: boolean;
  status: "present" | "leave" | "holiday" | "weekend" | "empty";
};

type WorkSchedule = {
  weekStartsOn: number;
  weekendDurationDays: number;
};

export function computeAttendanceStreak(input: {
  anchorDate: string;
  schedule: WorkSchedule;
  heatDays: HeatDay[];
  calendarDays: CalendarDay[];
  periodRange: { startKey: string; endKey: string };
}): AttendanceStreakModel {
  const heatByDate = new Map(input.heatDays.map((day) => [day.date, day]));
  const calendarByDate = new Map(input.calendarDays.map((day) => [day.date, day]));
  const streakAnchor = resolveStreakAnchor(
    input.anchorDate,
    input.schedule,
    heatByDate,
    calendarByDate,
  );

  let currentStreak = 0;
  let cursor = streakAnchor;
  for (;;) {
    if (isWeekendDateKey(cursor, input.schedule.weekStartsOn, input.schedule.weekendDurationDays)) {
      cursor = addDaysToDateKey(cursor, -1);
      continue;
    }
    const dayState = resolveDayState(cursor, heatByDate, calendarByDate);
    if (dayState.off) {
      cursor = addDaysToDateKey(cursor, -1);
      continue;
    }
    if (dayState.present) {
      currentStreak += 1;
      cursor = addDaysToDateKey(cursor, -1);
      continue;
    }
    break;
  }

  const coverageStats = computePeriodCoverageStats(
    input.periodRange,
    input.schedule,
    heatByDate,
    calendarByDate,
  );

  const segments: StreakSegmentState[] = [];
  let segCursor = streakAnchor;
  while (segments.length < 7) {
    if (
      isWeekendDateKey(segCursor, input.schedule.weekStartsOn, input.schedule.weekendDurationDays)
    ) {
      segCursor = addDaysToDateKey(segCursor, -1);
      continue;
    }
    if (segCursor > input.anchorDate) {
      segments.unshift("future");
    } else {
      const dayState = resolveDayState(segCursor, heatByDate, calendarByDate);
      segments.unshift(dayState.off ? "off" : dayState.present ? "present" : "missed");
    }
    segCursor = addDaysToDateKey(segCursor, -1);
  }

  return {
    currentStreak,
    bestInMonth: coverageStats.bestPresentRun,
    monthPresentDays: coverageStats.presentDays,
    monthWorkingDays: coverageStats.workingDays,
    segments,
  };
}

function computePeriodCoverageStats(
  periodRange: { startKey: string; endKey: string },
  schedule: WorkSchedule,
  heatByDate: Map<string, HeatDay>,
  calendarByDate: Map<string, CalendarDay>,
): { bestPresentRun: number; presentDays: number; workingDays: number } {
  const flags: boolean[] = [];
  let cursor = periodRange.startKey;
  while (cursor <= periodRange.endKey) {
    if (!isWeekendDateKey(cursor, schedule.weekStartsOn, schedule.weekendDurationDays)) {
      const dayState = resolveDayState(cursor, heatByDate, calendarByDate);
      if (!dayState.off) {
        flags.push(dayState.present);
      }
    }
    cursor = addDaysToDateKey(cursor, 1);
  }
  const presentDays = flags.filter(Boolean).length;
  return {
    bestPresentRun: longestPresentRun(flags),
    presentDays,
    workingDays: flags.length,
  };
}

function resolveDayState(
  dateKey: string,
  heatByDate: Map<string, HeatDay>,
  calendarByDate: Map<string, CalendarDay>,
): { present: boolean; off: boolean } {
  const heat = heatByDate.get(dateKey);
  const cal = calendarByDate.get(dateKey);
  const off = Boolean(heat?.off ?? (cal?.status === "leave" || cal?.status === "holiday"));
  const seconds = heat?.totalSeconds ?? (cal?.status === "present" ? 1 : 0);
  return { present: seconds > 0, off };
}

function resolveStreakAnchor(
  anchorDate: string,
  schedule: WorkSchedule,
  heatByDate: Map<string, HeatDay>,
  calendarByDate: Map<string, CalendarDay>,
): string {
  let cursor = anchorDate;
  while (isWeekendDateKey(cursor, schedule.weekStartsOn, schedule.weekendDurationDays)) {
    cursor = addDaysToDateKey(cursor, -1);
  }
  const anchorHeat = heatByDate.get(cursor);
  const cal = calendarByDate.get(cursor);
  const anchorOff = Boolean(
    anchorHeat?.off ?? (cal?.status === "leave" || cal?.status === "holiday"),
  );
  if ((anchorHeat?.totalSeconds ?? 0) <= 0 && !anchorOff) {
    cursor = addDaysToDateKey(cursor, -1);
    while (isWeekendDateKey(cursor, schedule.weekStartsOn, schedule.weekendDurationDays)) {
      cursor = addDaysToDateKey(cursor, -1);
    }
  }
  return cursor;
}

function longestPresentRun(flags: boolean[]): number {
  let best = 0;
  let run = 0;
  for (const present of flags) {
    if (present) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}
