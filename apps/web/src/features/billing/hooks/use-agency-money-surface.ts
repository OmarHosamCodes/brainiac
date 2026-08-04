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
  createMoneyExpenseRecord,
  moneyExpenseCanSubmit,
  moneyExpensePeriodLabel,
  MONEY_EXPENSE_KIND_OPTIONS,
  MONEY_EXPENSE_PERIOD_OPTIONS,
  type MoneyExpenseKind,
  type MoneyExpensePeriod,
  type MoneyExpenseRecord,
} from "../money-expense-form";
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
  MONEY_CALC_OPTIONS_FIXTURE,
  MONEY_COHORT_PANE_OPTIONS,
  MONEY_COHORT_RULES_FIXTURE,
  type MoneyCalcOptionId,
  type MoneyCohortPane,
  type MoneyCohortRuleId,
} from "../money-cohort-allocations-fixture";
import {
  MONEY_STATS_CARDS_FIXTURE,
  MONEY_STATS_FIXTURE_CURRENCY,
  type MoneyStatsCardFixture,
  type MoneyStatsCardId,
  type MoneyStatsMetricFixture,
  type MoneyStatsMetricId,
} from "../money-stats-fixtures";

export type MoneyCohortAllocationsSelection =
  | { kind: "rule"; ruleId: MoneyCohortRuleId }
  | { kind: "calc-option"; optionId: MoneyCalcOptionId };

const EXPENSE_CREATE_FORM_ID = "agency-money-expense-create";

function expenseCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function toExpenseRow(record: MoneyExpenseRecord) {
  return {
    id: record.id,
    name: record.name,
    meta:
      record.kind === "subscription"
        ? (moneyExpensePeriodLabel(record.period) ?? "Subscription")
        : "One-time",
    note: record.note || null,
  };
}

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
  const [expenseRecords, setExpenseRecords] = useState<MoneyExpenseRecord[]>([]);
  const [expenseCreateOpen, setExpenseCreateOpen] = useState(false);
  const [expenseDetailsOpen, setExpenseDetailsOpen] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseKind, setExpenseKind] = useState<MoneyExpenseKind>("one_time");
  const [expensePeriod, setExpensePeriod] = useState<MoneyExpensePeriod | null>(null);
  const [expenseNote, setExpenseNote] = useState("");
  const [moneySettingsOpen, setMoneySettingsOpen] = useState(false);
  const [cohortPane, setCohortPane] = useState<MoneyCohortPane>("rules");

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

  const upcomingExpenses = useMemo(
    () => expenseRecords.filter((record) => record.kind === "subscription").map(toExpenseRow),
    [expenseRecords],
  );
  const recentExpenses = useMemo(
    () => expenseRecords.filter((record) => record.kind === "one_time").map(toExpenseRow),
    [expenseRecords],
  );

  const canSubmitExpense = moneyExpenseCanSubmit(expenseName, expenseKind, expensePeriod);

  function onSelectMetric(_selection: MoneyStatsMetricSelection) {
    // ponytail: jump-off wired for a11y; detail surface lands in a later part
  }

  function onSelectCohortAllocation(_selection: MoneyCohortAllocationsSelection) {
    // ponytail: cohort/calc detail surface lands in a later part
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

  function resetExpenseCreateForm() {
    setExpenseName("");
    setExpenseKind("one_time");
    setExpensePeriod(null);
    setExpenseNote("");
  }

  function onExpenseCreateOpenChange(open: boolean) {
    setExpenseCreateOpen(open);
    if (!open) resetExpenseCreateForm();
  }

  function onExpenseKindChange(next: MoneyExpenseKind) {
    setExpenseKind(next);
    if (next === "one_time") setExpensePeriod(null);
  }

  function onExpenseCreateSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!moneyExpenseCanSubmit(expenseName, expenseKind, expensePeriod)) return;
    setExpenseRecords((current) => [
      createMoneyExpenseRecord({
        name: expenseName,
        kind: expenseKind,
        period: expensePeriod,
        note: expenseNote,
      }),
      ...current,
    ]);
    onExpenseCreateOpenChange(false);
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
    moneySettings: {
      open: moneySettingsOpen,
      onOpenChange: setMoneySettingsOpen,
      onOpen: () => setMoneySettingsOpen(true),
      title: "Money settings",
      description: "Cohort rules and calculation options for this team’s Money surface.",
      pane: cohortPane,
      paneOptions: MONEY_COHORT_PANE_OPTIONS,
      onPaneChange: setCohortPane,
      rules: MONEY_COHORT_RULES_FIXTURE,
      calcOptions: MONEY_CALC_OPTIONS_FIXTURE,
      onSelect: onSelectCohortAllocation,
    },
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
    expenses: {
      title: "Expenses",
      subtitle: "Subscriptions and ops spend",
      onOpenCreate: () => onExpenseCreateOpenChange(true),
      onOpenDetails: () => setExpenseDetailsOpen(true),
      details: {
        open: expenseDetailsOpen,
        onOpenChange: setExpenseDetailsOpen,
        title: "All expenses",
        emptyTitle: "No expenses yet",
        emptyBody: "Add a one-time expense or subscription to see it here.",
        sections: [
          {
            id: "upcoming" as const,
            title: "Upcoming subscriptions",
            items: upcomingExpenses,
          },
          {
            id: "recent" as const,
            title: "Recent",
            items: recentExpenses,
          },
        ],
        totalCount: expenseRecords.length,
      },
      create: {
        open: expenseCreateOpen,
        onOpenChange: onExpenseCreateOpenChange,
        formId: EXPENSE_CREATE_FORM_ID,
        name: expenseName,
        onNameChange: setExpenseName,
        kind: expenseKind,
        kindOptions: MONEY_EXPENSE_KIND_OPTIONS,
        onKindChange: onExpenseKindChange,
        period: expensePeriod,
        periodOptions: MONEY_EXPENSE_PERIOD_OPTIONS,
        onPeriodChange: setExpensePeriod,
        note: expenseNote,
        onNoteChange: setExpenseNote,
        canSubmit: canSubmitExpense,
        onSubmit: onExpenseCreateSubmit,
      },
      upcoming: {
        id: "upcoming" as const,
        title: "Upcoming subscriptions",
        hint: "Next due",
        emptyTitle: "Nothing due soon",
        emptyBody: "Recurring charges will appear here before they hit.",
        count: upcomingExpenses.length,
        countLabel: expenseCountLabel(upcomingExpenses.length, "due", "due"),
        items: upcomingExpenses,
      },
      recent: {
        id: "recent" as const,
        title: "Recent",
        hint: "This period",
        emptyTitle: "No recent spend",
        emptyBody: "One-off and paid expenses in this range will land here.",
        count: recentExpenses.length,
        countLabel: expenseCountLabel(recentExpenses.length, "this period", "this period"),
        items: recentExpenses,
      },
    },
  };
}
