import {
  addDaysToDateKey,
  getLocalWeekStartKeyFromDateKey,
} from "../time-tracking/local-week-bounds";
import { expandLeaveDays, type LeaveRangeInput } from "./member-profile-heat";

export const DEFAULT_PTO_ALLOWANCE_DAYS = 15;
export const DEFAULT_SICK_ALLOWANCE_DAYS = 10;
export const DEFAULT_OTHER_ALLOWANCE_DAYS = 5;

export type LeaveBalanceBucket = {
  usedDays: number;
  allowanceDays: number;
};

export type LeaveBalances = {
  year: number;
  all: LeaveBalanceBucket;
  pto: LeaveBalanceBucket;
  sick: LeaveBalanceBucket;
  other: LeaveBalanceBucket;
};

export type WeekHourDay = {
  date: string;
  weekdayLabel: string;
  totalSeconds: number;
};

export type CalendarDayStatus = "present" | "leave" | "empty";

export type CalendarMonthDay = {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
  status: CalendarDayStatus;
};

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function countInclusiveDays(startDate: string, endDate: string): number {
  if (endDate < startDate) return 0;
  let count = 0;
  let cursor = startDate;
  while (cursor <= endDate) {
    count += 1;
    cursor = addDaysToDateKey(cursor, 1);
  }
  return count;
}

/** Count leave days in [yearStart, yearEnd] by personal leave type. */
export function buildLeaveBalances(input: {
  year: number;
  leave: Array<{
    startDate: string;
    endDate: string;
    type: LeaveRangeInput["type"];
  }>;
  ptoAllowanceDays: number;
  sickAllowanceDays: number;
  otherAllowanceDays: number;
}): LeaveBalances {
  const yearStart = `${input.year}-01-01`;
  const yearEnd = `${input.year}-12-31`;
  let pto = 0;
  let sick = 0;
  let other = 0;

  for (const row of input.leave) {
    if (row.endDate < yearStart || row.startDate > yearEnd) continue;
    const start = row.startDate < yearStart ? yearStart : row.startDate;
    const end = row.endDate > yearEnd ? yearEnd : row.endDate;
    const days = countInclusiveDays(start, end);
    switch (row.type) {
      case "pto":
        pto += days;
        break;
      case "sick":
        sick += days;
        break;
      case "other":
      case "team_holiday":
        other += days;
        break;
      default: {
        const _exhaustive: never = row.type;
        void _exhaustive;
      }
    }
  }

  const allUsed = pto + sick + other;
  const allAllowance = input.ptoAllowanceDays + input.sickAllowanceDays + input.otherAllowanceDays;

  return {
    year: input.year,
    all: { usedDays: allUsed, allowanceDays: allAllowance },
    pto: { usedDays: pto, allowanceDays: input.ptoAllowanceDays },
    sick: { usedDays: sick, allowanceDays: input.sickAllowanceDays },
    other: { usedDays: other, allowanceDays: input.otherAllowanceDays },
  };
}

/** Seven Mon–Sun days for the week containing `anchorDate`, with seconds from the map. */
export function buildWeekHours(
  anchorDate: string,
  secondsByDate: Map<string, number>,
): WeekHourDay[] {
  const weekStart = getLocalWeekStartKeyFromDateKey(anchorDate);
  return WEEKDAY_LABELS.map((weekdayLabel, index) => {
    const date = addDaysToDateKey(weekStart, index);
    return {
      date,
      weekdayLabel,
      totalSeconds: secondsByDate.get(date) ?? 0,
    };
  });
}

/** Month grid (Mon-start) for the month of `monthDate`, with derived present/leave/empty. */
export function buildCalendarMonth(input: {
  monthDate: string;
  secondsByDate: Map<string, number>;
  leave: LeaveRangeInput[];
}): {
  year: number;
  month: number;
  label: string;
  days: CalendarMonthDay[];
} {
  const [yearStr, monthStr] = input.monthDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const monthStart = `${yearStr}-${monthStr}-01`;
  const nextMonthStart =
    month === 12 ? `${year + 1}-01-01` : `${yearStr}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = addDaysToDateKey(nextMonthStart, -1);

  const leaveByDate = expandLeaveDays(input.leave, monthStart, monthEnd);
  const gridStart = getLocalWeekStartKeyFromDateKey(monthStart);
  const monthEndWeekStart = getLocalWeekStartKeyFromDateKey(monthEnd);
  const gridEnd = addDaysToDateKey(monthEndWeekStart, 6);

  const days: CalendarMonthDay[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const inMonth = cursor >= monthStart && cursor <= monthEnd;
    const leave = leaveByDate.get(cursor);
    const seconds = input.secondsByDate.get(cursor) ?? 0;
    let status: CalendarDayStatus = "empty";
    if (leave) status = "leave";
    else if (seconds > 0) status = "present";

    days.push({
      date: cursor,
      dayOfMonth: Number(cursor.slice(8, 10)),
      inMonth,
      status,
    });
    cursor = addDaysToDateKey(cursor, 1);
  }

  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return { year, month, label, days };
}
