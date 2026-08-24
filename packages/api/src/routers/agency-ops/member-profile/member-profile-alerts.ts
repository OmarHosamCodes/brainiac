import type { AgencyOpsMemberProfileAlertContext } from "@orch/db/schema";

import {
  getFiscalQuarterForDate,
  getFiscalQuarterRange,
  resolveProfilePeriodMonth,
  toFiscalCalendar,
  type FiscalCalendar,
} from "../resourcing/tenure-engine";
import {
  computeAdjustedExpectations,
  countOffDaysOnWeekdaysInRange,
  countWeekdaysInRange,
  countWorkingDaysInRange,
  type WorkSchedule,
} from "../resourcing/work-schedule";
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

export type MemberProfileAlertPolicy = {
  abnormalDayEnabled: boolean;
  abnormalDayExtraHours: number;
  monthPaceEnabled: boolean;
  monthPacePercent: number;
  quarterPaceEnabled: boolean;
  quarterPacePercent: number;
  wasteSpikeEnabled: boolean;
  wasteSpikePercent: number;
};

export const DEFAULT_ALERT_POLICY: MemberProfileAlertPolicy = {
  abnormalDayEnabled: true,
  abnormalDayExtraHours: 4,
  monthPaceEnabled: true,
  monthPacePercent: 85,
  quarterPaceEnabled: true,
  quarterPacePercent: 85,
  wasteSpikeEnabled: true,
  wasteSpikePercent: 20,
};

const ABNORMAL_DAY_LOOKBACK_DAYS = 30;
const PACE_ELAPSED_GATE = 0.5;

export function abnormalDayThresholdHours(
  requiredDailyHours: number,
  extraHours: number = DEFAULT_ALERT_POLICY.abnormalDayExtraHours,
): number {
  return requiredDailyHours + extraHours;
}


function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function offDayKeysFromLeaveByDate(leaveByDate: ReadonlyMap<string, unknown>): ReadonlySet<string> {
  return new Set(leaveByDate.keys());
}

function resolveMonthPacePeriod(input: {
  todayKey: string;
  tenureEnabled: boolean;
  fiscalCalendar: FiscalCalendar;
}): { start: string; end: string; key: string } {
  const period = resolveProfilePeriodMonth({
    tenureEnabled: input.tenureEnabled,
    calendar: input.fiscalCalendar,
    anchorDateKey: input.todayKey,
  });
  return { start: period.startKey, end: period.endKey, key: period.fingerprint };
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
  policy?: MemberProfileAlertPolicy;
}): DetectedAlert[] {
  const policy = input.policy ?? DEFAULT_ALERT_POLICY;
  if (!policy.abnormalDayEnabled) return [];
  const threshold = abnormalDayThresholdHours(
    input.requiredDailyHours,
    policy.abnormalDayExtraHours,
  );
  const thresholdSeconds = threshold * 3600;
  const now = input.now ?? new Date();
  const windowStart = addDaysToDateKey(input.todayKey, -ABNORMAL_DAY_LOOKBACK_DAYS);

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
  monthlyMinHours: number;
  offDayReduceHours: number;
  leaveByDate?: ReadonlyMap<string, unknown>;
  todayKey: string;
  tenureEnabled?: boolean;
  fiscalCalendar?: FiscalCalendar;
  policy?: MemberProfileAlertPolicy;
}): DetectedAlert | null {
  const policy = input.policy ?? DEFAULT_ALERT_POLICY;
  if (!policy.monthPaceEnabled) return null;
  const fiscalCalendar = input.fiscalCalendar ?? toFiscalCalendar({
    fiscalYearStartMonth: 1,
    fiscalYearStartDay: 1,
  });
  const { start, end, key } = resolveMonthPacePeriod({
    todayKey: input.todayKey,
    tenureEnabled: input.tenureEnabled ?? false,
    fiscalCalendar,
  });
  const elapsedEnd = input.todayKey < end ? input.todayKey : end;
  const offDayKeys = offDayKeysFromLeaveByDate(input.leaveByDate ?? new Map());

  const monthWorking = countWorkingDaysInRange(start, end, input.schedule, offDayKeys);
  const elapsedWorking = countWorkingDaysInRange(start, elapsedEnd, input.schedule, offDayKeys);
  if (monthWorking <= 0 || elapsedWorking / monthWorking < PACE_ELAPSED_GATE) return null;

  const weekdaysInMonth = countWeekdaysInRange(start, end, input.schedule);
  const offDaysInMonth = countOffDaysOnWeekdaysInRange(start, end, input.schedule, offDayKeys);
  const { adjustedMinHours } = computeAdjustedExpectations({
    weekdaysInRange: weekdaysInMonth,
    offDaysOnWeekdays: offDaysInMonth,
    baseMinHours: input.monthlyMinHours,
    requiredDailyHours: input.schedule.requiredDailyHours,
    offDayReduceHours: input.offDayReduceHours,
  });
  const monthMinHours = adjustedMinHours;
  const { total } = secondsInRange(input.days, start, elapsedEnd);
  const loggedHours = total / 3600;
  const pacePerDay = elapsedWorking > 0 ? loggedHours / elapsedWorking : 0;
  const projectedHours = pacePerDay * monthWorking;
  if (projectedHours >= monthMinHours * (policy.monthPacePercent / 100)) return null;

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
  offDayReduceHours: number;
  leaveByDate?: ReadonlyMap<string, unknown>;
  todayKey: string;
  policy?: MemberProfileAlertPolicy;
}): DetectedAlert | null {
  const policy = input.policy ?? DEFAULT_ALERT_POLICY;
  if (!policy.quarterPaceEnabled) return null;
  const refDate = new Date(`${input.todayKey}T12:00:00.000Z`);
  const ref = getFiscalQuarterForDate(refDate, input.calendar);
  const range = getFiscalQuarterRange(input.calendar, ref.fiscalYear, ref.fiscalQuarter);
  const startKey = range.start.toISOString().slice(0, 10);
  const endKey = addDaysToDateKey(range.end.toISOString().slice(0, 10), -1);
  const elapsedEnd = input.todayKey < endKey ? input.todayKey : endKey;
  const offDayKeys = offDayKeysFromLeaveByDate(input.leaveByDate ?? new Map());

  const quarterWorking = countWorkingDaysInRange(startKey, endKey, input.schedule, offDayKeys);
  const elapsedWorking = countWorkingDaysInRange(startKey, elapsedEnd, input.schedule, offDayKeys);
  if (quarterWorking <= 0 || elapsedWorking / quarterWorking < PACE_ELAPSED_GATE) return null;

  const weekdaysInQuarter = countWeekdaysInRange(startKey, endKey, input.schedule);
  const offDaysInQuarter = countOffDaysOnWeekdaysInRange(
    startKey,
    endKey,
    input.schedule,
    offDayKeys,
  );
  const { adjustedMinHours: quarterMinHours } = computeAdjustedExpectations({
    weekdaysInRange: weekdaysInQuarter,
    offDaysOnWeekdays: offDaysInQuarter,
    baseMinHours: input.quarterlyMinHours,
    requiredDailyHours: input.schedule.requiredDailyHours,
    offDayReduceHours: input.offDayReduceHours,
  });

  const { total } = secondsInRange(input.days, startKey, elapsedEnd);
  const loggedHours = total / 3600;
  const pacePerDay = elapsedWorking > 0 ? loggedHours / elapsedWorking : 0;
  const projectedHours = pacePerDay * quarterWorking;
  if (projectedHours >= quarterMinHours * (policy.quarterPacePercent / 100)) return null;

  const periodKey = `${ref.fiscalYear}-Q${ref.fiscalQuarter}`;
  const defaultSnoozeUntil = new Date(range.end.getTime() - 1);
  return {
    kind: "quarter_pace",
    fingerprint: `quarter_pace:${periodKey}`,
    title: "At risk of missing quarter minimum",
    body: `Projected ${Math.round(projectedHours)}h vs ${quarterMinHours}h quarter minimum.`,
    context: {
      periodKey,
      loggedHours: Math.round(loggedHours * 10) / 10,
      projectedHours: Math.round(projectedHours * 10) / 10,
      requiredHours: quarterMinHours,
      defaultSnoozeUntil: defaultSnoozeUntil.toISOString(),
    },
    defaultSnoozeUntil,
  };
}

export function detectWasteSpike(input: {
  days: DaySeconds[];
  schedule: WorkSchedule;
  todayKey: string;
  tenureEnabled?: boolean;
  fiscalCalendar?: FiscalCalendar;
  policy?: MemberProfileAlertPolicy;
}): DetectedAlert | null {
  const policy = input.policy ?? DEFAULT_ALERT_POLICY;
  if (!policy.wasteSpikeEnabled) return null;
  const fiscalCalendar = input.fiscalCalendar ?? toFiscalCalendar({
    fiscalYearStartMonth: 1,
    fiscalYearStartDay: 1,
  });
  const { start, end, key } = resolveMonthPacePeriod({
    todayKey: input.todayKey,
    tenureEnabled: input.tenureEnabled ?? false,
    fiscalCalendar,
  });
  const elapsedEnd = input.todayKey < end ? input.todayKey : end;
  const { total, waste } = secondsInRange(input.days, start, elapsedEnd);
  if (total <= 0) return null;
  const wasteRatio = waste / total;
  if (wasteRatio <= policy.wasteSpikePercent / 100) return null;

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
  monthlyMinHours: number;
  quarterlyMinHours: number;
  offDayReduceHours: number;
  leaveByDate?: ReadonlyMap<string, unknown>;
  tenureEnabled?: boolean;
  suppressedFingerprints: ReadonlySet<string>;
  todayKey: string;
  now?: Date;
  policy?: MemberProfileAlertPolicy;
}): DetectedAlert[] {
  const policy = input.policy ?? DEFAULT_ALERT_POLICY;
  const out: DetectedAlert[] = [];
  for (const alert of detectAbnormalDays({
    days: input.days,
    requiredDailyHours: input.schedule.requiredDailyHours,
    todayKey: input.todayKey,
    now: input.now,
    policy,
  })) {
    if (!input.suppressedFingerprints.has(alert.fingerprint)) out.push(alert);
  }
  const month = detectMonthPace({
    days: input.days,
    schedule: input.schedule,
    monthlyMinHours: input.monthlyMinHours,
    offDayReduceHours: input.offDayReduceHours,
    leaveByDate: input.leaveByDate,
    todayKey: input.todayKey,
    tenureEnabled: input.tenureEnabled,
    fiscalCalendar: input.calendar,
    policy,
  });
  if (month && !input.suppressedFingerprints.has(month.fingerprint)) out.push(month);

  const quarter = detectQuarterPace({
    days: input.days,
    schedule: input.schedule,
    calendar: input.calendar,
    quarterlyMinHours: input.quarterlyMinHours,
    offDayReduceHours: input.offDayReduceHours,
    leaveByDate: input.leaveByDate,
    todayKey: input.todayKey,
    policy,
  });
  if (quarter && !input.suppressedFingerprints.has(quarter.fingerprint)) out.push(quarter);

  const waste = detectWasteSpike({
    days: input.days,
    schedule: input.schedule,
    todayKey: input.todayKey,
    tenureEnabled: input.tenureEnabled,
    fiscalCalendar: input.calendar,
    policy,
  });
  if (waste && !input.suppressedFingerprints.has(waste.fingerprint)) out.push(waste);

  return out;
}

export { toFiscalCalendar };
