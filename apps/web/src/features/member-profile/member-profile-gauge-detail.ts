import { addDaysToDateKey } from "@orch/api/routers/agency-ops/time-tracking/local-week-bounds";
import { isWeekendDateKey } from "@orch/api/routers/agency-ops/resourcing/work-schedule";

import type { StatPlateKey } from "@/features/member-profile/member-profile-instrument-plate";
import {
  gaugeToneToPlateTone,
  type InstrumentPlateTone,
  statPlateShortLabel,
} from "@/features/member-profile/member-profile-instrument-plate";
import type { StreakSegmentState } from "@/features/member-profile/member-profile-attendance-streak";

const ROW_CAP = 7;

export type GaugeDetailStat = {
  label: string;
  value: string;
};

export type GaugeDetailRow = {
  label: string;
  meta?: string;
  date?: string;
};

export type GaugeDetailPrimaryAction =
  | { kind: "add_off_day"; label: string }
  | { kind: "focus_day"; label: string; date: string };

export type GaugeMonthPaceVisual = {
  monthLabel: string;
  loggedHours: number;
  loggedHoursLabel: string;
  projectedHours: number;
  projectedHoursLabel: string;
  monthMinHours: number;
  monthTargetHours: number;
  elapsedWorkingDays: number;
  remainingWorkingDays: number;
  monthWorkingDays: number;
  paceToMinHoursPerDay: number;
  paceToTargetHoursPerDay: number;
  onTrackForMin: boolean;
  onTrackForTarget: boolean;
  scaleMaxHours: number;
};

export type GaugeStreakVisual = {
  calendarLabel: string;
  currentStreak: number;
  bestInMonth: number;
  monthPresentDays: number;
  monthWorkingDays: number;
  daysToBest: number;
  monthCoverageRatio: number;
  segments: StreakSegmentState[];
};

export type GaugeDetailModel = {
  key: StatPlateKey;
  title: string;
  explain: string;
  metric: string;
  shortLabel: string;
  tone: InstrumentPlateTone;
  ratio: number;
  stats: GaugeDetailStat[];
  weekBarRatios: number[];
  monthPaceVisual: GaugeMonthPaceVisual | null;
  streakVisual: GaugeStreakVisual | null;
  rowsHeading: string | null;
  rows: GaugeDetailRow[];
  rowOverflowLabel: string | null;
  emptyLabel: string | null;
  primaryAction: GaugeDetailPrimaryAction | null;
  streakSegments?: StreakSegmentState[];
};

export type GaugeLeaveEntry = {
  id: string;
  startDate: string;
  endDate: string;
  typeLabel: string;
  rangeLabel: string;
};

export type GaugeDayHours = {
  date: string;
  label: string;
  hoursLabel: string;
  totalSeconds: number;
};

export type GaugeCalendarDay = {
  date: string;
  inMonth: boolean;
  status: "present" | "leave" | "holiday" | "weekend" | "empty";
  dayLabel: string;
};

export type GaugeWasteDay = {
  date: string;
  label: string;
  hoursLabel: string;
  totalSeconds: number;
  entryCount: number;
};

export type GaugeHoursBreakdown = {
  paidSeconds: number;
  internalSeconds: number;
};

export type GaugeWorkSchedule = {
  weekStartsOn: number;
  weekendDurationDays: number;
  requiredDailyHours: number;
};

export type GaugeDetailContext = {
  canManageLeave: boolean;
  leavePeriodLabel: string;
  usedDays: number;
  allowanceDays: number;
  leaveEntries: GaugeLeaveEntry[];
  periodLabel: string;
  periodHoursLabel: string;
  periodTotalSeconds: number;
  periodWasteSeconds: number;
  periodWasteLabel: string;
  hoursBreakdown: GaugeHoursBreakdown;
  dayHours: GaugeDayHours[];
  calendarLabel: string;
  calendarDays: GaugeCalendarDay[];
  wasteDays: GaugeWasteDay[];
  monthPaceVisual: GaugeMonthPaceVisual | null;
  gauge: {
    key: StatPlateKey;
    valueLabel: string;
    ratio: number;
    tone: "success" | "warning" | "foreground";
  };
  attendanceStreak?: {
    currentStreak: number;
    bestInMonth: number;
    monthPresentDays: number;
    monthWorkingDays: number;
    segments: StreakSegmentState[];
  };
};

function titleForKey(key: StatPlateKey): string {
  switch (key) {
    case "leaves":
      return "Off days";
    case "period":
      return "Period hours";
    case "present":
      return "Attendance streak";
    case "waste":
      return "Waste";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

function inclusiveDayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T12:00:00.000Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function busiestDay(days: GaugeDayHours[]): GaugeDayHours | null {
  let best: GaugeDayHours | null = null;
  for (const day of days) {
    if (day.totalSeconds <= 0) continue;
    if (!best || day.totalSeconds > best.totalSeconds) best = day;
  }
  return best;
}

function capRows<T>(items: T[], cap: number): { visible: T[]; overflow: number } {
  if (items.length <= cap) return { visible: items, overflow: 0 };
  return { visible: items.slice(0, cap), overflow: items.length - cap };
}

function overflowLabel(count: number, noun: string): string {
  return `+${count} more ${noun} in this period`;
}

function weekBarRatiosFromDays(days: GaugeDayHours[]): number[] {
  const withHours = days.filter((day) => day.totalSeconds > 0);
  if (withHours.length === 0) return [];
  const recent = [...withHours].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const max = Math.max(...recent.map((day) => day.totalSeconds), 1);
  return recent.map((day) => day.totalSeconds / max);
}

function shortHoursFromSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function workingDaysInRange(
  fromKey: string,
  toKey: string,
  schedule: GaugeWorkSchedule,
): number {
  let count = 0;
  let cursor = fromKey;
  while (cursor <= toKey) {
    if (!isWeekendDateKey(cursor, schedule.weekStartsOn, schedule.weekendDurationDays)) {
      count += 1;
    }
    cursor = addDaysToDateKey(cursor, 1);
  }
  return count;
}

function monthKeysFromDateKey(dateKey: string): { start: string; end: string; key: string } {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const end = addDaysToDateKey(next, -1);
  return { start, end, key: start.slice(0, 7) };
}

/** Month pace dossier (mirrors alert month_pace math; target = required daily × working days). */
export function computeMonthPaceVisual(input: {
  dayHours: GaugeDayHours[];
  schedule: GaugeWorkSchedule;
  monthlyMinHours: number;
  todayKey: string;
}): GaugeMonthPaceVisual | null {
  const { start, end, key } = monthKeysFromDateKey(input.todayKey);
  const elapsedEnd = input.todayKey < end ? input.todayKey : end;
  const monthWorking = workingDaysInRange(start, end, input.schedule);
  const elapsedWorking = workingDaysInRange(start, elapsedEnd, input.schedule);
  const remainingWorking = workingDaysInRange(input.todayKey, end, input.schedule);
  if (monthWorking <= 0 || elapsedWorking <= 0) return null;

  let loggedSeconds = 0;
  for (const day of input.dayHours) {
    if (day.date < start || day.date > elapsedEnd) continue;
    loggedSeconds += day.totalSeconds;
  }
  const loggedHours = loggedSeconds / 3600;
  const pacePerDay = loggedHours / elapsedWorking;
  const projectedHours = pacePerDay * monthWorking;
  const monthTargetHours = monthWorking * input.schedule.requiredDailyHours;
  const monthMinHours = input.monthlyMinHours;

  const paceToMinHoursPerDay =
    remainingWorking > 0 ? Math.max(0, monthMinHours - loggedHours) / remainingWorking : 0;
  const paceToTargetHoursPerDay =
    remainingWorking > 0 ? Math.max(0, monthTargetHours - loggedHours) / remainingWorking : 0;

  const monthDate = new Date(`${key}-01T12:00:00.000Z`);
  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const scaleMaxHours =
    Math.max(monthTargetHours, monthMinHours, projectedHours, loggedHours, 1) * 1.08;

  return {
    monthLabel,
    loggedHours,
    loggedHoursLabel: shortHoursFromSeconds(Math.round(loggedHours * 3600)),
    projectedHours,
    projectedHoursLabel: shortHoursFromSeconds(Math.round(projectedHours * 3600)),
    monthMinHours,
    monthTargetHours,
    elapsedWorkingDays: elapsedWorking,
    remainingWorkingDays: remainingWorking,
    monthWorkingDays: monthWorking,
    paceToMinHoursPerDay,
    paceToTargetHoursPerDay,
    onTrackForMin: projectedHours >= monthMinHours,
    onTrackForTarget: projectedHours >= monthTargetHours,
    scaleMaxHours,
  };
}

export function buildStreakVisual(input: {
  calendarLabel: string;
  streak: {
    currentStreak: number;
    bestInMonth: number;
    monthPresentDays: number;
    monthWorkingDays: number;
    segments: StreakSegmentState[];
  };
}): GaugeStreakVisual {
  const daysToBest = Math.max(0, input.streak.bestInMonth - input.streak.currentStreak);
  return {
    calendarLabel: input.calendarLabel,
    currentStreak: input.streak.currentStreak,
    bestInMonth: input.streak.bestInMonth,
    monthPresentDays: input.streak.monthPresentDays,
    monthWorkingDays: input.streak.monthWorkingDays,
    daysToBest,
    monthCoverageRatio:
      input.streak.monthWorkingDays > 0
        ? input.streak.monthPresentDays / input.streak.monthWorkingDays
        : 0,
    segments: input.streak.segments,
  };
}

export function buildGaugeDetail(context: GaugeDetailContext): GaugeDetailModel {
  const { gauge } = context;
  const key = gauge.key;
  const tone = gaugeToneToPlateTone(gauge.tone);
  const shortLabel = statPlateShortLabel(key);
  const metric = gauge.valueLabel;
  const title = titleForKey(key);

  switch (key) {
    case "leaves": {
      const remaining = Math.max(0, context.allowanceDays - context.usedDays);
      const sortedEntries = [...context.leaveEntries].sort((a, b) =>
        b.startDate.localeCompare(a.startDate),
      );
      const allRows = sortedEntries.map((entry) => {
        const dayCount = inclusiveDayCount(entry.startDate, entry.endDate);
        const dayWord = dayCount === 1 ? "day" : "days";
        return {
          label: entry.rangeLabel,
          meta: `${entry.typeLabel} · ${dayCount} ${dayWord}`,
        };
      });
      const { visible, overflow } = capRows(allRows, ROW_CAP);
      const primaryAction: GaugeDetailPrimaryAction | null = context.canManageLeave
        ? { kind: "add_off_day", label: "Add off day" }
        : null;
      return {
        key,
        title,
        explain: `${context.leavePeriodLabel} allowance. Recorded off days reduce the remaining balance for this period.`,
        metric,
        shortLabel,
        tone,
        ratio: gauge.ratio,
        stats: [
          { label: "Used", value: String(context.usedDays) },
          { label: "Allowance", value: String(context.allowanceDays) },
          { label: "Remaining", value: String(remaining) },
        ],
        weekBarRatios: [],
        rowsHeading: visible.length > 0 ? "Recorded ranges" : null,
        rows: visible,
        rowOverflowLabel: overflow > 0 ? overflowLabel(overflow, "ranges") : null,
        emptyLabel: visible.length === 0 ? "No off days recorded for this allowance period." : null,
        primaryAction,
        monthPaceVisual: null,
        streakVisual: null,
      };
    }
    case "period": {
      const monthPaceVisual = context.monthPaceVisual;
      if (monthPaceVisual) {
        return {
          key,
          title,
          explain: `${monthPaceVisual.monthLabel} pace against team minimum and target. Target is required daily hours times working days in the month.`,
          metric,
          shortLabel,
          tone: gaugeToneToPlateTone(
            monthPaceVisual.onTrackForTarget
              ? "success"
              : monthPaceVisual.onTrackForMin
                ? gauge.tone
                : "warning",
          ),
          ratio: Math.min(1, monthPaceVisual.loggedHours / Math.max(monthPaceVisual.monthTargetHours, 1)),
          stats: [],
          weekBarRatios: [],
          monthPaceVisual,
          rowsHeading: null,
          rows: [],
          rowOverflowLabel: null,
          emptyLabel: null,
          primaryAction: null,
          streakVisual: null,
        };
      }

      const sortedDays = [...context.dayHours]
        .filter((day) => day.totalSeconds > 0)
        .sort((a, b) => b.totalSeconds - a.totalSeconds);
      const allRows = sortedDays.map((day) => ({
        label: day.label,
        meta: day.hoursLabel,
        date: day.date,
      }));
      const { visible, overflow } = capRows(allRows, ROW_CAP);
      const focus = busiestDay(context.dayHours);
      const { paidSeconds, internalSeconds } = context.hoursBreakdown;
      return {
        key,
        title,
        explain: `Hours logged in ${context.periodLabel}. Paid and internal split excludes waste marks.`,
        metric,
        shortLabel,
        tone,
        ratio: gauge.ratio,
        stats: [
          { label: "Logged", value: context.periodHoursLabel },
          { label: "Waste", value: context.periodWasteLabel },
          { label: "Paid", value: shortHoursFromSeconds(paidSeconds) },
          { label: "Internal", value: shortHoursFromSeconds(internalSeconds) },
        ],
        weekBarRatios: weekBarRatiosFromDays(context.dayHours),
        monthPaceVisual: null,
        rowsHeading: visible.length > 0 ? "Top days by hours" : null,
        rows: visible,
        rowOverflowLabel: overflow > 0 ? overflowLabel(overflow, "days") : null,
        emptyLabel: visible.length === 0 ? "No time logged in this period yet." : null,
        primaryAction: focus
          ? { kind: "focus_day", label: "View busiest day", date: focus.date }
          : null,
        streakVisual: null,
      };
    }
    case "present": {
      const present = context.calendarDays
        .filter((day) => day.inMonth && day.status === "present")
        .sort((a, b) => b.date.localeCompare(a.date));
      const streak = context.attendanceStreak;
      const latest = present[0] ?? null;

      if (streak) {
        const streakVisual = buildStreakVisual({
          calendarLabel: context.calendarLabel,
          streak,
        });
        return {
          key,
          title,
          explain:
            "Consecutive working days with logged time. Weekends, off days, and zero-hour days break the run.",
          metric,
          shortLabel,
          tone,
          ratio: gauge.ratio,
          stats: [],
          weekBarRatios: [],
          monthPaceVisual: null,
          streakVisual,
          rowsHeading: null,
          rows: [],
          rowOverflowLabel: null,
          streakSegments: streak.segments,
          emptyLabel:
            streak.monthPresentDays === 0
              ? "No streak yet. Log time on a working day to start one."
              : null,
          primaryAction: latest
            ? { kind: "focus_day", label: "View latest logged day", date: latest.date }
            : null,
        };
      }

      return {
        key,
        title,
        explain: `Days with logged time in ${context.calendarLabel}.`,
        metric,
        shortLabel,
        tone,
        ratio: gauge.ratio,
        stats: [{ label: "Present", value: String(present.length) }],
        weekBarRatios: [],
        monthPaceVisual: null,
        streakVisual: null,
        rowsHeading: null,
        rows: [],
        rowOverflowLabel: null,
        emptyLabel:
          present.length === 0 ? "No streak yet. Log time on a working day to start one." : null,
        primaryAction: latest
          ? { kind: "focus_day", label: "View latest logged day", date: latest.date }
          : null,
      };
    }
    case "waste": {
      const sortedWaste = [...context.wasteDays].sort(
        (a, b) => b.totalSeconds - a.totalSeconds,
      );
      const allRows = sortedWaste.map((day) => ({
        label: day.label,
        meta:
          day.entryCount > 1
            ? `${day.hoursLabel} · ${day.entryCount} entries`
            : day.hoursLabel,
        date: day.date,
      }));
      const { visible, overflow } = capRows(allRows, ROW_CAP);
      const share =
        context.periodTotalSeconds <= 0
          ? 0
          : Math.round((context.periodWasteSeconds / context.periodTotalSeconds) * 100);
      const top = sortedWaste[0] ?? null;
      return {
        key,
        title,
        explain: `Waste marked in ${context.periodLabel}. Share is waste hours divided by all logged hours in the range.`,
        metric,
        shortLabel,
        tone,
        ratio: gauge.ratio,
        stats: [
          { label: "Waste", value: context.periodWasteLabel },
          { label: "Share", value: `${share}%` },
          { label: "Logged", value: context.periodHoursLabel },
        ],
        weekBarRatios: sortedWaste.length > 0
          ? weekBarRatiosFromDays(
              sortedWaste.map((day) => ({
                date: day.date,
                label: day.label,
                hoursLabel: day.hoursLabel,
                totalSeconds: day.totalSeconds,
              })),
            )
          : [],
        rowsHeading: visible.length > 0 ? "Waste days" : null,
        rows: visible,
        rowOverflowLabel: overflow > 0 ? overflowLabel(overflow, "days") : null,
        emptyLabel: visible.length === 0 ? "No waste marked in this period." : null,
        primaryAction: top
          ? { kind: "focus_day", label: "View top waste day", date: top.date }
          : null,
        monthPaceVisual: null,
        streakVisual: null,
      };
    }
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
