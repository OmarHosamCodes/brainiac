import type { AgencyOpsMemberProfileAlertContext } from "@orch/db/schema";

import {
  getFiscalQuarterForDate,
  getFiscalQuarterRange,
  toFiscalCalendar,
  type FiscalCalendar,
} from "../resourcing/tenure-engine";
import { isWeekendDateKey, type WorkSchedule } from "../resourcing/work-schedule";
import { addDaysToDateKey } from "../time-tracking/local-week-bounds";

export type DetectedAlert = {
  kind: "abnormal_day" | "month_pace" | "quarter_pace" | "waste_spike";
  fingerprint: string;
  title: string;
  body: string;
  context: AgencyOpsMemberProfileAlertContext;
  defaultSnoozeUntil: Date;
};

export type DaySeconds = {
  dateKey: string;
  totalSeconds: number;
  wasteSeconds: number;
};

export function abnormalDayThresholdHours(requiredDailyHours: number): number {
  return Math.max(requiredDailyHours * 1.5, requiredDailyHours + 4);
}

function yearMonthFromDateKey(dateKey: string): { year: number; month: number } {
  return {
    year: Number(dateKey.slice(0, 4)),
    month: Number(dateKey.slice(5, 7)),
  };
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function workingDaysInRange(fromKey: string, toKey: string, schedule: WorkSchedule): number {
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

function monthKeys(year: number, month: number): { start: string; end: string; key: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const end = addDaysToDateKey(next, -1);
  return { start, end, key: start.slice(0, 7) };
}

function secondsInRange(days: DaySeconds[], fromKey: string, toKey: string) {
  let total = 0;
  let waste = 0;
  for (const day of days) {
    if (day.dateKey < fromKey || day.dateKey > toKey) continue;
    total += day.totalSeconds;
    waste += day.wasteSeconds;
  }
  return { total, waste };
}

export function detectAbnormalDays(input: {
  days: DaySeconds[];
  requiredDailyHours: number;
  todayKey: string;
  now?: Date;
}): DetectedAlert[] {
  const threshold = abnormalDayThresholdHours(input.requiredDailyHours);
  const thresholdSeconds = threshold * 3600;
  const now = input.now ?? new Date();
  const windowStart = addDaysToDateKey(input.todayKey, -30);

  const alerts: DetectedAlert[] = [];
  for (const day of input.days) {
    if (day.dateKey < windowStart || day.dateKey > input.todayKey) continue;
    if (day.totalSeconds <= thresholdSeconds) continue;
    const hours = Math.round((day.totalSeconds / 3600) * 10) / 10;
    alerts.push({
      kind: "abnormal_day",
      fingerprint: `abnormal_day:${day.dateKey}`,
      title: "Abnormal hours in a day",
      body: `${hours}h logged on ${day.dateKey} (threshold ${threshold}h).`,
      context: {
        dateKey: day.dateKey,
        hours,
        requiredHours: input.requiredDailyHours,
        defaultSnoozeUntil: addUtcDays(now, 7).toISOString(),
      },
      defaultSnoozeUntil: addUtcDays(now, 7),
    });
  }
  return alerts;
}

export function detectMonthPace(input: {
  days: DaySeconds[];
  schedule: WorkSchedule;
  todayKey: string;
}): DetectedAlert | null {
  const { year, month } = yearMonthFromDateKey(input.todayKey);
  const { start, end, key } = monthKeys(year, month);
  const elapsedEnd = input.todayKey < end ? input.todayKey : end;

  const monthWorking = workingDaysInRange(start, end, input.schedule);
  const elapsedWorking = workingDaysInRange(start, elapsedEnd, input.schedule);
  if (monthWorking <= 0 || elapsedWorking / monthWorking < 0.5) return null;

  const monthMinHours = input.schedule.requiredDailyHours * monthWorking;
  const { total } = secondsInRange(input.days, start, elapsedEnd);
  const loggedHours = total / 3600;
  const pacePerDay = elapsedWorking > 0 ? loggedHours / elapsedWorking : 0;
  const projectedHours = pacePerDay * monthWorking;
  if (projectedHours >= monthMinHours * 0.85) return null;

  const defaultSnoozeUntil = new Date(`${end}T23:59:59.999Z`);
  return {
    kind: "month_pace",
    fingerprint: `month_pace:${key}`,
    title: "At risk of missing month minimum",
    body: `Projected ${Math.round(projectedHours)}h vs ${monthMinHours}h month minimum.`,
    context: {
      periodKey: key,
      loggedHours: Math.round(loggedHours * 10) / 10,
      projectedHours: Math.round(projectedHours * 10) / 10,
      requiredHours: monthMinHours,
      defaultSnoozeUntil: defaultSnoozeUntil.toISOString(),
    },
    defaultSnoozeUntil,
  };
}

export function detectQuarterPace(input: {
  days: DaySeconds[];
  schedule: WorkSchedule;
  calendar: FiscalCalendar;
  quarterlyMinHours: number;
  todayKey: string;
}): DetectedAlert | null {
  const refDate = new Date(`${input.todayKey}T12:00:00.000Z`);
  const ref = getFiscalQuarterForDate(refDate, input.calendar);
  const range = getFiscalQuarterRange(input.calendar, ref.fiscalYear, ref.fiscalQuarter);
  const startKey = range.start.toISOString().slice(0, 10);
  const endKey = addDaysToDateKey(range.end.toISOString().slice(0, 10), -1);
  const elapsedEnd = input.todayKey < endKey ? input.todayKey : endKey;

  const quarterWorking = workingDaysInRange(startKey, endKey, input.schedule);
  const elapsedWorking = workingDaysInRange(startKey, elapsedEnd, input.schedule);
  if (quarterWorking <= 0 || elapsedWorking / quarterWorking < 0.5) return null;

  const { total } = secondsInRange(input.days, startKey, elapsedEnd);
  const loggedHours = total / 3600;
  const pacePerDay = elapsedWorking > 0 ? loggedHours / elapsedWorking : 0;
  const projectedHours = pacePerDay * quarterWorking;
  if (projectedHours >= input.quarterlyMinHours * 0.85) return null;

  const periodKey = `${ref.fiscalYear}-Q${ref.fiscalQuarter}`;
  const defaultSnoozeUntil = new Date(range.end.getTime() - 1);
  return {
    kind: "quarter_pace",
    fingerprint: `quarter_pace:${periodKey}`,
    title: "At risk of missing quarter minimum",
    body: `Projected ${Math.round(projectedHours)}h vs ${input.quarterlyMinHours}h quarter minimum.`,
    context: {
      periodKey,
      loggedHours: Math.round(loggedHours * 10) / 10,
      projectedHours: Math.round(projectedHours * 10) / 10,
      requiredHours: input.quarterlyMinHours,
      defaultSnoozeUntil: defaultSnoozeUntil.toISOString(),
    },
    defaultSnoozeUntil,
  };
}

export function detectWasteSpike(input: {
  days: DaySeconds[];
  schedule: WorkSchedule;
  todayKey: string;
}): DetectedAlert | null {
  const { year, month } = yearMonthFromDateKey(input.todayKey);
  const { start, end, key } = monthKeys(year, month);
  const elapsedEnd = input.todayKey < end ? input.todayKey : end;
  const { total, waste } = secondsInRange(input.days, start, elapsedEnd);
  if (total <= 0) return null;
  const wasteRatio = waste / total;
  if (wasteRatio <= 0.2) return null;

  const defaultSnoozeUntil = new Date(`${end}T23:59:59.999Z`);
  return {
    kind: "waste_spike",
    fingerprint: `waste_spike:${key}`,
    title: "High waste this month",
    body: `${Math.round(wasteRatio * 100)}% of logged time marked waste.`,
    context: {
      periodKey: key,
      wasteRatio: Math.round(wasteRatio * 1000) / 1000,
      loggedHours: Math.round((total / 3600) * 10) / 10,
      defaultSnoozeUntil: defaultSnoozeUntil.toISOString(),
    },
    defaultSnoozeUntil,
  };
}

export function detectSystemAlerts(input: {
  days: DaySeconds[];
  schedule: WorkSchedule;
  calendar: FiscalCalendar;
  quarterlyMinHours: number;
  suppressedFingerprints: ReadonlySet<string>;
  todayKey: string;
  now?: Date;
}): DetectedAlert[] {
  const out: DetectedAlert[] = [];
  for (const alert of detectAbnormalDays({
    days: input.days,
    requiredDailyHours: input.schedule.requiredDailyHours,
    todayKey: input.todayKey,
    now: input.now,
  })) {
    if (!input.suppressedFingerprints.has(alert.fingerprint)) out.push(alert);
  }
  const month = detectMonthPace({
    days: input.days,
    schedule: input.schedule,
    todayKey: input.todayKey,
  });
  if (month && !input.suppressedFingerprints.has(month.fingerprint)) out.push(month);

  const quarter = detectQuarterPace({
    days: input.days,
    schedule: input.schedule,
    calendar: input.calendar,
    quarterlyMinHours: input.quarterlyMinHours,
    todayKey: input.todayKey,
  });
  if (quarter && !input.suppressedFingerprints.has(quarter.fingerprint)) out.push(quarter);

  const waste = detectWasteSpike({
    days: input.days,
    schedule: input.schedule,
    todayKey: input.todayKey,
  });
  if (waste && !input.suppressedFingerprints.has(waste.fingerprint)) out.push(waste);

  return out;
}

export { toFiscalCalendar };
