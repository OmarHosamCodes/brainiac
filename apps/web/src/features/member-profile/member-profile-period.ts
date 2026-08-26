import {
  getFiscalQuarterForDate,
  getFiscalQuarterRange,
  type FiscalCalendar,
} from "@orch/api/routers/agency-ops/resourcing/tenure-engine";
import { addDaysToDateKey } from "@orch/api/routers/agency-ops/time-tracking/local-week-bounds";
import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";
import {
  normalizeTenureMonthIndexes,
  resolveProfilePeriodMonth,
  shiftProfilePeriodMonth,
  type TenureQuarterMonth,
} from "@/features/resourcing/tenure-utils";

export type ProfilePeriodMonthBounds = {
  firstStartKey: string;
  lastStartKey: string;
};

export type ProfilePaceParams = {
  paceStartKey: string;
  paceEndKey: string;
  baseMinHours: number;
  isSingleMonth: boolean;
};

export function clampDateKeyToRange(
  dateKey: string,
  rangeStartKey: string,
  rangeEndKey: string,
): string {
  if (dateKey < rangeStartKey) return rangeStartKey;
  if (dateKey > rangeEndKey) return rangeEndKey;
  return dateKey;
}

export function resolveProfilePeriodMonthBounds(
  rangeStartKey: string,
  rangeEndKey: string,
  tenureEnabled: boolean,
  calendar: FiscalCalendar,
): ProfilePeriodMonthBounds {
  const first = resolveProfilePeriodMonth({
    tenureEnabled,
    calendar,
    anchorDateKey: rangeStartKey,
  });
  const last = resolveProfilePeriodMonth({
    tenureEnabled,
    calendar,
    anchorDateKey: rangeEndKey,
  });
  return { firstStartKey: first.startKey, lastStartKey: last.startKey };
}

export function canShiftProfilePeriodMonth(
  currentStartKey: string,
  delta: -1 | 1,
  bounds: ProfilePeriodMonthBounds,
): boolean {
  if (delta === -1) {
    return currentStartKey > bounds.firstStartKey;
  }
  return currentStartKey < bounds.lastStartKey;
}

export function shiftProfilePeriodMonthWithinBounds(
  currentStartKey: string,
  delta: -1 | 1,
  bounds: ProfilePeriodMonthBounds,
  tenureEnabled: boolean,
  calendar: FiscalCalendar,
): string | null {
  if (!canShiftProfilePeriodMonth(currentStartKey, delta, bounds)) {
    return null;
  }
  const shifted = shiftProfilePeriodMonth(currentStartKey, delta, {
    tenureEnabled,
    calendar,
  });
  if (shifted.startKey < bounds.firstStartKey || shifted.startKey > bounds.lastStartKey) {
    return null;
  }
  return shifted.startKey;
}

export function resolveDefaultProfilePeriodMonthStart(
  rangeStartKey: string,
  rangeEndKey: string,
  anchorDateKey: string,
  tenureEnabled: boolean,
  calendar: FiscalCalendar,
): string {
  const clamped = clampDateKeyToRange(anchorDateKey, rangeStartKey, rangeEndKey);
  return resolveProfilePeriodMonth({
    tenureEnabled,
    calendar,
    anchorDateKey: clamped,
  }).startKey;
}

function fiscalQuarterInclusiveKeys(
  anchorDateKey: string,
  calendar: FiscalCalendar,
): { paceStartKey: string; paceEndKey: string } {
  const ref = getFiscalQuarterForDate(new Date(`${anchorDateKey}T12:00:00.000Z`), calendar);
  const range = getFiscalQuarterRange(calendar, ref.fiscalYear, ref.fiscalQuarter);
  return {
    paceStartKey: range.start.toISOString().slice(0, 10),
    paceEndKey: addDaysToDateKey(range.end.toISOString().slice(0, 10), -1),
  };
}

function selectedTenureMonthsSpan(
  tenureQuarterMonths: TenureQuarterMonth[],
  monthIndexes: number[],
): { paceStartKey: string; paceEndKey: string; monthCount: number } | null {
  const unique = normalizeTenureMonthIndexes(monthIndexes);
  if (unique.length === 0 || unique.length === 3) return null;
  const selected = tenureQuarterMonths
    .filter((month) => unique.includes(month.index))
    .sort((left, right) => left.index - right.index);
  if (selected.length === 0) return null;
  const first = selected[0]!;
  const last = selected[selected.length - 1]!;
  return {
    paceStartKey: first.from.slice(0, 10),
    paceEndKey: addDaysToDateKey(last.toExclusive.slice(0, 10), -1),
    monthCount: selected.length,
  };
}

function rangePace(startKey: string, endKey: string, monthlyMinHours: number): ProfilePaceParams {
  return {
    paceStartKey: startKey,
    paceEndKey: endKey,
    baseMinHours: monthlyMinHours,
    isSingleMonth: false,
  };
}

export function resolveProfilePaceParams(input: {
  rangeStartKey: string;
  rangeEndKey: string;
  tenureEnabled: boolean;
  fiscalCalendar: FiscalCalendar;
  monthlyMinHours: number;
  quarterlyMinHours: number;
  effectiveRangePreset: RangePreset;
  effectiveTenureMonthIndexes: number[];
  tenureQuarterMonths: TenureQuarterMonth[];
  anchorDateKey: string;
}): ProfilePaceParams {
  switch (input.effectiveRangePreset) {
    case "tenure": {
      if (!input.tenureEnabled) {
        return rangePace(input.rangeStartKey, input.rangeEndKey, input.monthlyMinHours);
      }
      const unique = normalizeTenureMonthIndexes(input.effectiveTenureMonthIndexes);
      if (unique.length === 0 || unique.length === 3) {
        const quarter = fiscalQuarterInclusiveKeys(input.anchorDateKey, input.fiscalCalendar);
        return {
          paceStartKey: quarter.paceStartKey,
          paceEndKey: quarter.paceEndKey,
          baseMinHours: input.quarterlyMinHours,
          isSingleMonth: false,
        };
      }
      const selectedSpan = selectedTenureMonthsSpan(
        input.tenureQuarterMonths,
        input.effectiveTenureMonthIndexes,
      );
      if (!selectedSpan) {
        return rangePace(input.rangeStartKey, input.rangeEndKey, input.monthlyMinHours);
      }
      return {
        paceStartKey: selectedSpan.paceStartKey,
        paceEndKey: selectedSpan.paceEndKey,
        baseMinHours: input.monthlyMinHours * selectedSpan.monthCount,
        isSingleMonth: selectedSpan.monthCount === 1,
      };
    }
    case "month": {
      const month = resolveProfilePeriodMonth({
        tenureEnabled: input.tenureEnabled,
        calendar: input.fiscalCalendar,
        anchorDateKey: input.rangeStartKey,
      });
      return {
        paceStartKey: month.startKey,
        paceEndKey: month.endKey,
        baseMinHours: input.monthlyMinHours,
        isSingleMonth: true,
      };
    }
    case "today":
    case "week":
    case "last30":
    case "custom":
      return rangePace(input.rangeStartKey, input.rangeEndKey, input.monthlyMinHours);
    default: {
      const _exhaustive: never = input.effectiveRangePreset;
      return _exhaustive;
    }
  }
}
