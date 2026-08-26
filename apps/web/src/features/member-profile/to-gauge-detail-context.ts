import type { memberProfileSchema } from "@orch/api/routers/agency-ops/member-profile/schemas";
import type { FiscalCalendar } from "@orch/api/routers/agency-ops/resourcing/tenure-engine";
import { DEFAULT_WORK_SCHEDULE } from "@orch/api/routers/agency-ops/resourcing/work-schedule";
import type { z } from "zod";

import type { MemberProfileViewData } from "@/features/member-profile/agency-member-profile-types";
import type { AttendanceStreakModel } from "@/features/member-profile/member-profile-attendance-streak";
import {
  leaveRangeLabel,
  leaveTypeLabel,
  shortHours,
} from "@/features/member-profile/member-profile-format";
import {
  buildGaugeDetail,
  computeMonthPaceVisual,
  type GaugeDetailModel,
} from "@/features/member-profile/member-profile-gauge-detail";
import { isSingleMonthProfilePeriod, resolveProfilePaceParams } from "@/features/member-profile/member-profile-period";
import type { StatPlateKey } from "@/features/member-profile/member-profile-instrument-plate";
import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";
import type { TenureQuarterMonth } from "@/features/resourcing/tenure-utils";

type MemberProfileRecord = z.infer<typeof memberProfileSchema>;

export type BuildMemberProfileGaugeDetailInput = {
  openGaugeKey: StatPlateKey;
  data: MemberProfileRecord;
  profile: MemberProfileViewData;
  attendanceStreak: AttendanceStreakModel;
  periodLabel: string;
  today: string;
  weekStartsOn: number;
  weekendDurationDays: number;
  monthlyMinHours: number;
  quarterlyMinHours: number;
  offDayReduceHours: number;
  requiredDailyHours: number;
  effectiveRangePreset: RangePreset;
  effectiveTenureMonthIndexes: number[];
  tenureQuarterMonths: TenureQuarterMonth[];
  rangeStartKey: string;
  rangeEndKey: string;
  tenureEnabled: boolean;
  fiscalCalendar: FiscalCalendar;
};

export function buildMemberProfileGaugeDetail(
  input: BuildMemberProfileGaugeDetailInput,
): GaugeDetailModel | null {
  const gauge = input.profile.leaveGauges.find((item) => item.key === input.openGaugeKey);
  if (!gauge) return null;

  const dayHours = input.data.timeline.map((day) => {
    let totalSeconds = 0;
    for (const item of day.items) {
      if (item.kind === "activity" && item.durationSeconds != null) {
        totalSeconds += item.durationSeconds;
      }
    }
    const date = new Date(`${day.date}T12:00:00.000Z`);
    const label = date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return {
      date: day.date,
      label,
      hoursLabel: shortHours(totalSeconds),
      totalSeconds,
    };
  });

  const wasteDays: Array<{
    date: string;
    label: string;
    hoursLabel: string;
    totalSeconds: number;
    entryCount: number;
  }> = [];
  for (const day of input.data.timeline) {
    let wasteSeconds = 0;
    let entryCount = 0;
    for (const item of day.items) {
      if (item.kind === "activity" && item.isWaste && item.durationSeconds != null) {
        wasteSeconds += item.durationSeconds;
        entryCount += 1;
      }
    }
    if (wasteSeconds <= 0) continue;
    const date = new Date(`${day.date}T12:00:00.000Z`);
    wasteDays.push({
      date: day.date,
      label: date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      hoursLabel: shortHours(wasteSeconds),
      totalSeconds: wasteSeconds,
      entryCount,
    });
  }

  let paidSeconds = 0;
  let internalSeconds = 0;
  for (const day of input.data.timeline) {
    for (const item of day.items) {
      if (item.kind !== "activity" || item.isWaste || item.durationSeconds == null) continue;
      if (item.isBillable) paidSeconds += item.durationSeconds;
      else internalSeconds += item.durationSeconds;
    }
  }

  const singleMonthPeriod = isSingleMonthProfilePeriod(
    input.rangeStartKey,
    input.rangeEndKey,
    input.tenureEnabled,
    input.fiscalCalendar,
  );
  const paceParams = resolveProfilePaceParams({
    rangeStartKey: input.rangeStartKey,
    rangeEndKey: input.rangeEndKey,
    tenureEnabled: input.tenureEnabled,
    fiscalCalendar: input.fiscalCalendar,
    monthlyMinHours: input.monthlyMinHours,
    quarterlyMinHours: input.quarterlyMinHours,
    effectiveRangePreset: input.effectiveRangePreset,
    effectiveTenureMonthIndexes: input.effectiveTenureMonthIndexes,
    tenureQuarterMonths: input.tenureQuarterMonths,
    anchorDateKey: input.today,
  });
  const coverageLabel = singleMonthPeriod ? input.profile.calendar.label : input.periodLabel;
  const periodStartKey = paceParams.paceStartKey;
  const periodEndKey = paceParams.paceEndKey;
  const offDayKeys = new Set(
    singleMonthPeriod
      ? input.data.calendarMonth.days
          .filter(
            (day) =>
              day.inMonth && (day.status === "leave" || day.status === "holiday") && day.leaveId,
          )
          .map((day) => day.date)
      : input.data.heatMap.days.filter((day) => day.off).map((day) => day.date),
  );

  const paceDayHours = (singleMonthPeriod
    ? input.data.calendarMonth.days.filter((day) => day.inMonth)
    : input.data.heatMap.days
  ).map((day) => {
    const date = new Date(`${day.date}T12:00:00.000Z`);
    const label = date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return {
      date: day.date,
      label,
      hoursLabel: shortHours(day.totalSeconds),
      totalSeconds: day.totalSeconds,
    };
  });

  const monthPaceVisual =
    input.openGaugeKey === "period"
      ? computeMonthPaceVisual({
          dayHours: paceDayHours,
          schedule: {
            weekStartsOn: input.weekStartsOn,
            weekendDurationDays: input.weekendDurationDays,
            requiredDailyHours: input.requiredDailyHours,
          },
          monthlyMinHours: input.monthlyMinHours,
          baseMinHours: paceParams.baseMinHours,
          offDayReduceHours: input.offDayReduceHours,
          offDayKeys,
          todayKey: input.today,
          periodStartKey,
          periodEndKey,
          periodLabel: coverageLabel,
          isSingleMonthScope: paceParams.isSingleMonth,
        })
      : null;

  return buildGaugeDetail({
    canManageLeave: input.profile.canManageLeave,
    leavePeriodLabel: input.data.leaveBalances.period.label,
    usedDays: input.data.leaveBalances.all.usedDays,
    allowanceDays: input.data.leaveBalances.all.allowanceDays,
    leaveEntries: input.data.leave.map((entry) => ({
      id: entry.id,
      startDate: entry.startDate,
      endDate: entry.endDate,
      typeLabel: leaveTypeLabel(entry.type),
      rangeLabel: leaveRangeLabel(entry.startDate, entry.endDate),
    })),
    periodLabel: input.periodLabel,
    periodHoursLabel: shortHours(input.data.periodTotalSeconds),
    periodTotalSeconds: input.data.periodTotalSeconds,
    periodWasteSeconds: input.data.periodWasteSeconds,
    periodWasteLabel: shortHours(input.data.periodWasteSeconds),
    hoursBreakdown: { paidSeconds, internalSeconds },
    dayHours,
    monthPaceVisual,
    calendarLabel: coverageLabel,
    calendarDays: input.profile.calendar.days.map((day) => {
      const date = new Date(`${day.date}T12:00:00.000Z`);
      return {
        date: day.date,
        inMonth: day.inMonth,
        status: day.status,
        dayLabel: date.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
      };
    }),
    wasteDays,
    gauge: {
      key: gauge.key,
      valueLabel: gauge.valueLabel,
      ratio: gauge.ratio,
      tone: gauge.tone,
    },
    attendanceStreak: input.openGaugeKey === "present" ? input.attendanceStreak : undefined,
  });
}

export { DEFAULT_WORK_SCHEDULE };
