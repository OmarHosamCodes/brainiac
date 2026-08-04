import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  agencyManagementPaneLabel,
  agencyManagementPaneSubtitle,
} from "@/features/shared/agency-management-sections";
import {
  getCurrentTenurePeriodRange,
  resolveDefaultTenureMonthIndexes,
} from "@/features/resourcing/tenure-utils";
import { orpc } from "@/lib/orpc";

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
  /** Wide hero treatment for income (bento span). */
  featured: boolean;
  primary: MoneyStatsMetricFixture;
  secondary: MoneyStatsMetricFixture[];
  /** Received / total for cash composition bar; null when not income. */
  collectedRatio: number | null;
  collectedLabel: string | null;
};

function calendarMonthLabel(now = new Date()): string {
  return now.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

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

  const periodLabel = useMemo(() => {
    const monthIndexes = resolveDefaultTenureMonthIndexes(tenurePolicy, now);
    const tenureRange = getCurrentTenurePeriodRange(tenurePolicy, now, monthIndexes);
    return tenureRange?.simpleLabel ?? calendarMonthLabel(now);
  }, [now, tenurePolicy]);

  const statsCards = useMemo(
    () => MONEY_STATS_CARDS_FIXTURE.map((card) => buildCardViewModel(card)),
    [],
  );

  function onSelectMetric(_selection: MoneyStatsMetricSelection) {
    // ponytail: jump-off wired for a11y; detail surface lands in a later part
  }

  return {
    teamId,
    title: agencyManagementPaneLabel("money"),
    subtitle: agencyManagementPaneSubtitle("money"),
    periodLabel,
    statsCards,
    onSelectMetric,
  };
}
