import { addDaysToDateKey } from "../time-tracking/local-week-bounds";

export type LeaveRangeInput = {
  id: string;
  startDate: string;
  endDate: string;
  type: "pto" | "sick" | "team_holiday" | "other";
  reason: string | null;
};

/** Expand inclusive YYYY-MM-DD leave ranges onto a date→leave map (later ranges win). */
export function expandLeaveDays(
  ranges: LeaveRangeInput[],
  windowStart: string,
  windowEnd: string,
): Map<string, LeaveRangeInput> {
  const byDate = new Map<string, LeaveRangeInput>();
  for (const range of ranges) {
    if (range.endDate < windowStart || range.startDate > windowEnd) continue;
    let cursor = range.startDate < windowStart ? windowStart : range.startDate;
    const last = range.endDate > windowEnd ? windowEnd : range.endDate;
    while (cursor <= last) {
      byDate.set(cursor, range);
      cursor = addDaysToDateKey(cursor, 1);
    }
  }
  return byDate;
}

/** Map seconds to a 0–4 intensity bucket (GitHub-style). */
export function intensityFromSeconds(totalSeconds: number, maxSeconds: number): number {
  if (totalSeconds <= 0 || maxSeconds <= 0) return 0;
  const ratio = totalSeconds / maxSeconds;
  if (ratio <= 0.15) return 1;
  if (ratio <= 0.35) return 2;
  if (ratio <= 0.65) return 3;
  return 4;
}

export function buildHeatDays(input: {
  windowStart: string;
  windowEnd: string;
  secondsByDate: Map<string, number>;
  leaveByDate: Map<string, LeaveRangeInput>;
}): Array<{
  date: string;
  totalSeconds: number;
  intensity: number;
  off: {
    leaveId: string;
    type: LeaveRangeInput["type"];
    reason: string | null;
    rangeStart: string;
    rangeEnd: string;
  } | null;
}> {
  let maxSeconds = 0;
  for (const seconds of input.secondsByDate.values()) {
    if (seconds > maxSeconds) maxSeconds = seconds;
  }

  const days: Array<{
    date: string;
    totalSeconds: number;
    intensity: number;
    off: {
      leaveId: string;
      type: LeaveRangeInput["type"];
      reason: string | null;
      rangeStart: string;
      rangeEnd: string;
    } | null;
  }> = [];

  let cursor = input.windowStart;
  while (cursor <= input.windowEnd) {
    const totalSeconds = input.secondsByDate.get(cursor) ?? 0;
    const leave = input.leaveByDate.get(cursor) ?? null;
    days.push({
      date: cursor,
      totalSeconds,
      intensity: intensityFromSeconds(totalSeconds, maxSeconds),
      off: leave
        ? {
            leaveId: leave.id,
            type: leave.type,
            reason: leave.reason,
            rangeStart: leave.startDate,
            rangeEnd: leave.endDate,
          }
        : null,
    });
    cursor = addDaysToDateKey(cursor, 1);
  }
  return days;
}
