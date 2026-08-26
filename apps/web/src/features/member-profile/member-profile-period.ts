import type { FiscalCalendar } from "@orch/api/routers/agency-ops/resourcing/tenure-engine";
import {
  getFiscalQuarterForDate,
  getFiscalQuarterRange,
} from "@orch/api/routers/agency-ops/resourcing/tenure-engine";
import { addDaysToDateKey } from "@orch/api/routers/agency-ops/time-tracking/local-week-bounds";
import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";
import {
  resolveProfilePeriodMonth,
  shiftProfilePeriodMonth,
} from "@/features/resourcing/tenure-utils";
import type { TenureQuarterMonth } from "@/features/resourcing/tenure-utils";

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

export function isFullTenureQuarterSelection(monthIndexes: number[]): boolean {
  const unique = [...new Set(monthIndexes)].filter(
    (index): index is 0 | 1 | 2 => index === 0 || index === 1 || index === 2,
  );
  return unique.length === 0 || unique.length === 3;
}

export function clampDateKeyToRange(dateKey: string, rangeStartKey: string, rangeEndKey: string): string {
  if (dateKey < rangeStartKey) return rangeStartKey;
  if (dateKey > rangeEndKey) return rangeEndKey;
  return dateKey;
}

export function isSingleMonthProfilePeriod(
  rangeStartKey: string,
  rangeEndKey: string,
  tenureEnabled: boolean,
  calendar: FiscalCalendar,
): boolean {
  const start = resolveProfilePeriodMonth({
    tenureEnabled,
    calendar,
    anchorDateKey: rangeStartKey,
  });
  const end = resolveProfilePeriodMonth({
    tenureEnabled,
    calendar,
    anchorDateKey: rangeEndKey,
  });
  if (tenureEnabled) {
    return start.fingerprint === end.fingerprint;
  }
  return start.startKey.slice(0, 7) === end.startKey.slice(0, 7);
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

function countTenureMonthsBetween(
  rangeStartKey: string,
  rangeEndKey: string,
  calendar: FiscalCalendar,
): number {
  const lastMonth = resolveProfilePeriodMonth({
    tenureEnabled: true,
    calendar,
    anchorDateKey: rangeEndKey,
  });
  let count = 0;
  let cursor = resolveProfilePeriodMonth({
    tenureEnabled: true,
    calendar,
    anchorDateKey: rangeStartKey,
  }).startKey;
  while (cursor <= lastMonth.startKey) {
    count += 1;
    const next = shiftProfilePeriodMonth(cursor, 1, { tenureEnabled: true, calendar }).startKey;
    if (next === cursor) break;
    cursor = next;
    if (count > 12) break;
  }
  return Math.max(1, count);
}

function countCalendarMonthsBetween(rangeStartKey: string, rangeEndKey: string): number {
  const startYear = Number(rangeStartKey.slice(0, 4));
  const startMonth = Number(rangeStartKey.slice(5, 7));
  const endYear = Number(rangeEndKey.slice(0, 4));
  const endMonth = Number(rangeEndKey.slice(5, 7));
  return Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
}

function fiscalQuarterEndKey(anchorDateKey: string, calendar: FiscalCalendar): {
  paceStartKey: string;
  paceEndKey: string;
} {
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
  const unique = [...new Set(monthIndexes)].filter(
    (index): index is 0 | 1 | 2 => index === 0 || index === 1 || index === 2,
  );
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

/** Pace window + minimum hours for profile period-hours gauge (may extend past logged range end). */
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
  const singleMonth = isSingleMonthProfilePeriod(
    input.rangeStartKey,
    input.rangeEndKey,
    input.tenureEnabled,
    input.fiscalCalendar,
  );

  if (singleMonth) {
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

  if (input.tenureEnabled && input.effectiveRangePreset === "tenure") {
    if (isFullTenureQuarterSelection(input.effectiveTenureMonthIndexes)) {
      const quarter = fiscalQuarterEndKey(input.anchorDateKey, input.fiscalCalendar);
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
    if (selectedSpan) {
      return {
        paceStartKey: selectedSpan.paceStartKey,
        paceEndKey: selectedSpan.paceEndKey,
        baseMinHours: input.monthlyMinHours * selectedSpan.monthCount,
        isSingleMonth: selectedSpan.monthCount === 1,
      };
    }
  }

  const monthSpan = input.tenureEnabled
    ? countTenureMonthsBetween(input.rangeStartKey, input.rangeEndKey, input.fiscalCalendar)
    : countCalendarMonthsBetween(input.rangeStartKey, input.rangeEndKey);

  return {
    paceStartKey: input.rangeStartKey,
    paceEndKey: input.rangeEndKey,
    baseMinHours: input.monthlyMinHours * monthSpan,
    isSingleMonth: false,
  };
}
