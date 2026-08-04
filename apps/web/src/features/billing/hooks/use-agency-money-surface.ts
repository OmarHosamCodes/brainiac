import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { RangePreset } from "@/features/dashboard/agency-dashboard-command-bar";
import { rangePresetLabel } from "@/features/dashboard/agency-dashboard-command-bar";
import {
  agencyManagementPaneLabel,
  agencyManagementPaneSubtitle,
} from "@/features/shared/agency-management-sections";
import { startOfWeekUtc, toDateInputValue } from "@/features/shared/use-agency-time-range-filters";
import {
  getCurrentTenurePeriodRange,
  getCurrentTenureQuarterMonths,
  resolveDefaultDashboardRangePreset,
  resolveDefaultTenureMonthIndexes,
} from "@/features/resourcing/tenure-utils";
import { orpc } from "@/lib/orpc";

import {
  moneyBillsActiveFilterSummary,
  moneyBillsEmptyCopy,
  moneyBillsStatusAllowed,
  moneyBillsStatusOptionsForParty,
  MONEY_BILLS_PARTY_OPTIONS,
  type MoneyBillsPartyFilter,
  type MoneyBillsStatusFilter,
} from "../money-bills-filters";
import {
  MONEY_STATS_CARDS_FIXTURE,
  MONEY_STATS_FIXTURE_CURRENCY,
  type MoneyStatsCardFixture,
  type MoneyStatsCardId,
  type MoneyStatsMetricFixture,
  type MoneyStatsMetricId,
} from "../money-stats-fixtures";

export type AgencyMoneySurfaceViewModel = ReturnType<typeof useAgencyMoneySurface>;

export type MoneyStatsMetricSelection = {
  cardId: MoneyStatsCardId;
  metricId: MoneyStatsMetricId;
};

export type MoneyStatsCardViewModel = {
  id: MoneyStatsCardId;
  title: string;
  currency: string;
  featured: boolean;
  primary: MoneyStatsMetricFixture;
  secondary: MoneyStatsMetricFixture[];
  collectedRatio: number | null;
  collectedLabel: string | null;
};

function buildCardViewModel(card: MoneyStatsCardFixture): MoneyStatsCardViewModel {
  const primary =
    card.metrics.find((metric) => metric.id === card.primaryMetricId) ?? card.metrics[0]!;
  const secondary = card.metrics.filter((metric) => metric.id !== primary.id);

  let collectedRatio: number | null = null;
  let collectedLabel: string | null = null;
  if (card.id === "income-cash") {
    const total = card.metrics.find((metric) => metric.id === "total-income")?.amount ?? 0;
    const received = card.metrics.find((metric) => metric.id === "received")?.amount ?? 0;
    collectedRatio = total > 0 ? Math.min(1, Math.max(0, received / total)) : 0;
    collectedLabel = `${new Intl.NumberFormat(undefined, {
      style: "percent",
      maximumFractionDigits: 0,
    }).format(collectedRatio)} collected`;
  }

  return {
    id: card.id,
    title: card.title,
    currency: MONEY_STATS_FIXTURE_CURRENCY,
    featured: card.id === "income-cash",
    primary,
    secondary,
    collectedRatio,
    collectedLabel,
  };
}

export function useAgencyMoneySurface(teamId: string) {
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

  const [rangePreset, setRangePreset] = useState<RangePreset | null>(null);
  const effectiveRangePreset = rangePreset ?? defaultRangePreset;
  const [customFromDate, setCustomFromDate] = useState(toDateInputValue(startOfWeekUtc()));
  const [customToDate, setCustomToDate] = useState(toDateInputValue(now));
  const [tenureMonthIndexes, setTenureMonthIndexes] = useState<number[] | null>(null);
  const effectiveTenureMonthIndexes = tenureMonthIndexes ?? defaultTenureMonthIndexes;

  const [partyFilter, setPartyFilter] = useState<MoneyBillsPartyFilter>("all");
  const [statusFilter, setStatusFilter] = useState<MoneyBillsStatusFilter | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const periodLabel = rangePresetLabel(effectiveRangePreset, tenurePeriodLabel);

  const statsCards = useMemo(
    () => MONEY_STATS_CARDS_FIXTURE.map((card) => buildCardViewModel(card)),
    [],
  );

  const statusOptions = useMemo(() => moneyBillsStatusOptionsForParty(partyFilter), [partyFilter]);

  const billsEmptyCopy = useMemo(
    () => moneyBillsEmptyCopy(partyFilter, statusFilter, searchTerm),
    [partyFilter, searchTerm, statusFilter],
  );
  const billsActiveFilterSummary = useMemo(
    () => moneyBillsActiveFilterSummary(partyFilter, statusFilter),
    [partyFilter, statusFilter],
  );

  function onSelectMetric(_selection: MoneyStatsMetricSelection) {
    // ponytail: jump-off wired for a11y; detail surface lands in a later part
  }

  function onPartyFilterChange(next: MoneyBillsPartyFilter) {
    setPartyFilter(next);
    setStatusFilter((current) =>
      current && moneyBillsStatusAllowed(next, current) ? current : null,
    );
  }

  function onStatusFilterChange(next: MoneyBillsStatusFilter) {
    setStatusFilter((current) => (current === next ? null : next));
  }

  function onClearStatusFilter() {
    setStatusFilter(null);
  }

  return {
    teamId,
    title: agencyManagementPaneLabel("money"),
    subtitle: agencyManagementPaneSubtitle("money"),
    period: {
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
      label: periodLabel,
    },
    statsCards,
    onSelectMetric,
    bills: {
      partyFilter,
      partyOptions: MONEY_BILLS_PARTY_OPTIONS,
      onPartyFilterChange,
      statusFilter,
      statusOptions,
      onStatusFilterChange,
      onClearStatusFilter,
      searchTerm,
      onSearchTermChange: setSearchTerm,
      activeFilterSummary: billsActiveFilterSummary,
      emptyCopy: billsEmptyCopy,
      billCount: 0,
    },
  };
}
