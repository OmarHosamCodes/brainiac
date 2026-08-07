import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_WORK_SCHEDULE } from "@orch/api/routers/agency-ops/resourcing/work-schedule";

import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";
import { rangePresetLabel } from "@/features/shared/command-bar/range-preset-chooser";
import {
  getCurrentTenurePeriodRange,
  getCurrentTenureQuarterMonths,
  resolveDefaultDashboardRangePreset,
  resolveDefaultTenureMonthIndexes,
  type TenureQuarterMonth,
} from "@/features/resourcing/tenure-utils";
import {
  resolveAgencyRangeFromPreset,
  startOfWeekUtc,
  toDateInputValue,
} from "@/features/shared/use-agency-time-range-filters";
import { orpc } from "@/lib/orpc";

export type AgencyPeriodState = {
  rangePreset: RangePreset;
  onRangePresetChange: (preset: RangePreset) => void;
  customFromDate: string;
  onCustomFromChange: (value: string) => void;
  customToDate: string;
  onCustomToChange: (value: string) => void;
  tenureAvailable: boolean;
  tenurePeriodLabel: string | null;
  tenureQuarterLabel: string | null;
  tenureQuarterMonths: TenureQuarterMonth[];
  tenureMonthIndexes: number[];
  onTenureMonthIndexesChange: (monthIndexes: number[]) => void;
  weekStartsOn: number;
  label: string;
  range: { from: string; to: string };
  isLoading: boolean;
  setCustomRange: (from: string, to: string) => void;
};

type UseAgencyPeriodStateOptions = {
  teamId: string;
  initialCustomRange?: { from: string; to: string } | null;
};

/**
 * Shared period state for Money / Profile (no Apply draft layer).
 * Dashboard / Reports keep useAgencyTimeRangeFilters for Apply + filters.
 */
export function useAgencyPeriodState({
  teamId,
  initialCustomRange = null,
}: UseAgencyPeriodStateOptions): AgencyPeriodState {
  const now = useMemo(() => new Date(), []);
  const tenurePolicyQuery = useQuery({
    ...orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const tenurePolicy = tenurePolicyQuery.data?.policy ?? null;

  const defaultRangePreset = useMemo(
    () => resolveDefaultDashboardRangePreset(tenurePolicy),
    [tenurePolicy],
  );
  const defaultTenureMonthIndexes = useMemo(
    () => resolveDefaultTenureMonthIndexes(tenurePolicy, now),
    [now, tenurePolicy],
  );
  const tenureQuarterMonths = useMemo(
    () => getCurrentTenureQuarterMonths(tenurePolicy, now) ?? [],
    [now, tenurePolicy],
  );

  const [rangePreset, setRangePreset] = useState<RangePreset | null>(
    initialCustomRange ? "custom" : null,
  );
  const effectiveRangePreset = rangePreset ?? defaultRangePreset;
  const weekStartsOn = tenurePolicy?.weekStartsOn ?? DEFAULT_WORK_SCHEDULE.weekStartsOn;
  const [customFromDate, setCustomFromDate] = useState(
    initialCustomRange?.from ?? toDateInputValue(startOfWeekUtc(weekStartsOn)),
  );
  const [customToDate, setCustomToDate] = useState(initialCustomRange?.to ?? toDateInputValue(now));
  const [tenureMonthIndexes, setTenureMonthIndexes] = useState<number[] | null>(null);
  const effectiveTenureMonthIndexes = tenureMonthIndexes ?? defaultTenureMonthIndexes;

  const tenurePeriodLabel = useMemo(
    () =>
      getCurrentTenurePeriodRange(tenurePolicy, now, effectiveTenureMonthIndexes)?.simpleLabel ??
      null,
    [effectiveTenureMonthIndexes, now, tenurePolicy],
  );
  const tenureQuarterLabel = useMemo(
    () => getCurrentTenurePeriodRange(tenurePolicy, now)?.simpleLabel ?? null,
    [now, tenurePolicy],
  );

  const range = useMemo(
    () =>
      resolveAgencyRangeFromPreset(
        effectiveRangePreset,
        customFromDate,
        customToDate,
        tenurePolicy,
        now,
        effectiveTenureMonthIndexes,
        weekStartsOn,
      ),
    [
      customFromDate,
      customToDate,
      effectiveRangePreset,
      effectiveTenureMonthIndexes,
      now,
      tenurePolicy,
      weekStartsOn,
    ],
  );

  return {
    rangePreset: effectiveRangePreset,
    onRangePresetChange: setRangePreset,
    customFromDate,
    onCustomFromChange: setCustomFromDate,
    customToDate,
    onCustomToChange: setCustomToDate,
    tenureAvailable: Boolean(tenurePolicy?.enabled),
    tenurePeriodLabel,
    tenureQuarterLabel,
    tenureQuarterMonths,
    tenureMonthIndexes: effectiveTenureMonthIndexes,
    onTenureMonthIndexesChange: setTenureMonthIndexes,
    weekStartsOn,
    label: rangePresetLabel(effectiveRangePreset, tenurePeriodLabel),
    range,
    isLoading: tenurePolicyQuery.isPending,
    setCustomRange(from, to) {
      setRangePreset("custom");
      setCustomFromDate(from);
      setCustomToDate(to);
    },
  };
}
