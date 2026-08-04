import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { RangePreset } from "@/features/dashboard/agency-dashboard-command-bar";
import { rangePresetLabel } from "@/features/dashboard/agency-dashboard-command-bar";
import {
  agencyManagementPaneLabel,
  agencyManagementPaneSubtitle,
} from "@/features/shared/agency-management-sections";
import {
  selectIsInvoiceMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";
import {
  resolveAgencyRangeFromPreset,
  startOfWeekUtc,
  toDateInputValue,
} from "@/features/shared/use-agency-time-range-filters";
import {
  getCurrentTenurePeriodRange,
  getCurrentTenureQuarterMonths,
  resolveDefaultDashboardRangePreset,
  resolveDefaultTenureMonthIndexes,
} from "@/features/resourcing/tenure-utils";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { orpc } from "@/lib/orpc";

import {
  formatMoneyExpenseCents,
  moneyExpenseCanSubmit,
  moneyExpensePeriodLabel,
  moneyExpenseStatusLabel,
  parseMoneyExpenseAmountCents,
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
  buildMoneyBillRows,
  moneyBillClientHref,
  moneyBillMemberHref,
  MONEY_ADJUSTMENT_SECTION_OPTIONS,
  moneyBillsAdjustmentCreateValid,
  moneyBillsCreateFormValid,
  moneyBillsPartyShowsAdjustments,
  moneyBillsPartyShowsClients,
  moneyBillsPartyShowsMembers,
  moneyBillsPaymentCanSubmit,
  parseMoneyBillPaymentCents,
  type MoneyBillPayoutSectionKey,
} from "../money-bills-rows";
import {
  MONEY_CALC_OPTIONS_FIXTURE,
  MONEY_COHORT_PANE_OPTIONS,
  MONEY_COHORT_RULES_FIXTURE,
  type MoneyCalcOptionId,
  type MoneyCohortPane,
  type MoneyCohortRuleId,
} from "../money-cohort-allocations-fixture";
import {
  type MoneyStatsCardId,
  type MoneyStatsMetricFixture,
  type MoneyStatsMetricId,
} from "../money-stats-fixtures";
import {
  buildMoneyStatsCards,
  centsToMajor,
  type MoneyStatsCardWithSource,
} from "../money-stats-live";

const BILL_CREATE_FORM_ID = "agency-money-bill-create";
const BILL_PAYMENT_FORM_ID = "agency-money-bill-payment";

export type MoneyCohortAllocationsSelection =
  | { kind: "rule"; ruleId: MoneyCohortRuleId }
  | { kind: "calc-option"; optionId: MoneyCalcOptionId };

const EXPENSE_CREATE_FORM_ID = "agency-money-expense-create";

function expenseCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function toExpenseRow(record: MoneyExpenseRecord) {
  const kindMeta =
    record.kind === "subscription"
      ? (moneyExpensePeriodLabel(record.period) ?? "Subscription")
      : "One-time";
  const amountLabel = formatMoneyExpenseCents(record.amountCents, record.currency);
  return {
    id: record.id,
    name: record.name,
    meta: kindMeta,
    amountLabel,
    statusLabel: moneyExpenseStatusLabel(record.status),
    remainingCents: record.remainingCents,
    remainingLabel: formatMoneyExpenseCents(record.remainingCents, record.currency),
    currency: record.currency,
    canRecordPayment: record.status === "due" || record.status === "partial",
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
  primary: MoneyStatsMetricFixture & { source: "live" | "fixture" };
  secondary: Array<MoneyStatsMetricFixture & { source: "live" | "fixture" }>;
  collectedRatio: number | null;
  collectedLabel: string | null;
};

function buildCardViewModel(card: MoneyStatsCardWithSource): MoneyStatsCardViewModel {
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
    currency: card.currency,
    featured: card.id === "income-cash",
    primary,
    secondary,
    collectedRatio,
    collectedLabel,
  };
}

export function useAgencyMoneySurface(teamId: string) {
  const now = useMemo(() => new Date(), []);
  const navigate = useNavigate();
  const agencyOps = useAgencyOpsStore();
  const isInvoiceMutationPending = useAgencyOpsStore(selectIsInvoiceMutationPending);

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
  const [billCreateOpen, setBillCreateOpen] = useState(false);
  const [billCreateClientId, setBillCreateClientId] = useState("");
  const [billCreatePeriodStart, setBillCreatePeriodStart] = useState("");
  const [billCreatePeriodEnd, setBillCreatePeriodEnd] = useState("");
  const [adjustmentCreateOpen, setAdjustmentCreateOpen] = useState(false);
  const [adjustmentSectionKey, setAdjustmentSectionKey] =
    useState<Extract<MoneyBillPayoutSectionKey, "debt_discount" | "charity" | "pbc">>(
      "debt_discount",
    );
  const [adjustmentLabel, setAdjustmentLabel] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [pendingActionInvoiceId, setPendingActionInvoiceId] = useState<string | null>(null);
  const [expenseCreateOpen, setExpenseCreateOpen] = useState(false);
  const [expenseDetailsOpen, setExpenseDetailsOpen] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseKind, setExpenseKind] = useState<MoneyExpenseKind>("one_time");
  const [expensePeriod, setExpensePeriod] = useState<MoneyExpensePeriod | null>(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expensePaymentId, setExpensePaymentId] = useState<string | null>(null);
  const [expensePaymentAmount, setExpensePaymentAmount] = useState("");
  const [selectedRunSectionId, setSelectedRunSectionId] = useState<string | null>(null);
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

  const periodRange = useMemo(
    () =>
      resolveAgencyRangeFromPreset(
        effectiveRangePreset,
        customFromDate,
        customToDate,
        tenurePolicy,
        now,
        effectiveTenureMonthIndexes,
      ),
    [
      customFromDate,
      customToDate,
      effectiveRangePreset,
      effectiveTenureMonthIndexes,
      now,
      tenurePolicy,
    ],
  );

  const showsClientBills = moneyBillsPartyShowsClients(partyFilter);
  const showsMemberBills = moneyBillsPartyShowsMembers(partyFilter);
  const showsAdjustmentBills = moneyBillsPartyShowsAdjustments(partyFilter);
  const loadsPeriodBills = showsClientBills || showsMemberBills || showsAdjustmentBills;
  const loadsPayoutLines = showsMemberBills || showsAdjustmentBills;

  const teamBillStatus =
    statusFilter === "outstanding" || statusFilter === "partial" || statusFilter === "paid"
      ? statusFilter
      : undefined;

  const payoutBillsParty =
    partyFilter === "team"
      ? ("team" as const)
      : partyFilter === "adjustments"
        ? ("adjustments" as const)
        : ("all" as const);

  const invoicesQuery = useQuery({
    ...orpc.agencyOps.invoices.list.queryOptions({
      input: {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
        billStatus: statusFilter ?? undefined,
        search: searchTerm.trim() || undefined,
      },
    }),
    enabled: Boolean(teamId) && showsClientBills,
  });

  const payoutsQuery = useQuery({
    ...orpc.agencyOps.payouts.list.queryOptions({
      input: {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
        billStatus: teamBillStatus,
        search: searchTerm.trim() || undefined,
        billsParty: payoutBillsParty,
      },
    }),
    enabled: Boolean(teamId) && loadsPayoutLines,
  });

  const periodActivityQuery = useQuery({
    ...orpc.agencyOps.invoices.periodActivity.queryOptions({
      input: {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
        search: searchTerm.trim() || undefined,
      },
    }),
    enabled: Boolean(teamId) && (showsClientBills || showsMemberBills),
  });

  const clientsQuery = useQuery({
    ...orpc.agencyOps.clients.list.queryOptions({
      input: { teamId, page: 1, pageSize: 200 },
    }),
    enabled: Boolean(teamId),
  });

  const expensesQuery = useQuery({
    ...orpc.agencyOps.expenses.list.queryOptions({
      input: {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
      },
    }),
    enabled: Boolean(teamId),
  });

  const moneySettingsQuery = useQuery({
    ...orpc.agencyOps.moneySettings.get.queryOptions({
      input: { teamId },
    }),
    enabled: Boolean(teamId),
  });

  const periodScoreboardQuery = useQuery({
    ...orpc.agencyOps.money.periodScoreboard.queryOptions({
      input: {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
      },
    }),
    enabled: Boolean(teamId),
  });

  const payoutRunQuery = useQuery({
    ...orpc.agencyOps.payouts.getRun.queryOptions({
      input: {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
      },
    }),
    enabled: Boolean(teamId),
  });

  const selectedRunSection = payoutRunQuery.data?.sections.find(
    (section) => section.id === selectedRunSectionId,
  );

  const runSectionLinesQuery = useQuery({
    ...orpc.agencyOps.payouts.list.queryOptions({
      input: {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
        sectionKey: selectedRunSection?.key,
      },
    }),
    enabled: Boolean(teamId) && Boolean(selectedRunSection?.key),
  });

  const expenseRecords = (expensesQuery.data?.items ?? []) as MoneyExpenseRecord[];

  const statsCards = useMemo(() => {
    const board = periodScoreboardQuery.data;
    if (!board) {
      return buildMoneyStatsCards({
        currency: "USD",
        metrics: {
          "total-income": 0,
          received: 0,
          remaining: 0,
          salaries: 0,
          expenses: 0,
          "debt-discount": 0,
          "paid-vacation": 0,
          "team-profit": 0,
          "profit-loss-share": 0,
          roi: 0,
          "device-compensation": 0,
          charity: 0,
          pbc: 0,
        },
        sources: {
          "total-income": "live",
          received: "live",
          remaining: "live",
          salaries: "live",
          expenses: "live",
          "debt-discount": "live",
          "paid-vacation": "live",
          "team-profit": "live",
          "profit-loss-share": "live",
          roi: "live",
          "device-compensation": "live",
          charity: "live",
          pbc: "live",
        },
      }).map((card) => buildCardViewModel(card));
    }

    const liveMetrics: Partial<Record<MoneyStatsMetricId, number>> = {
      "total-income": centsToMajor(board.totalIncomeCents),
      received: centsToMajor(board.receivedCents),
      remaining: centsToMajor(board.remainingCents),
      salaries: centsToMajor(board.salariesCents),
      expenses: centsToMajor(board.expensesCents),
      "debt-discount": centsToMajor(board.debtDiscountCents),
      "paid-vacation": centsToMajor(board.paidVacationCents),
      "team-profit": centsToMajor(board.teamProfitCents),
      "profit-loss-share": centsToMajor(board.profitLossShareCents),
      roi: board.roi,
      "device-compensation": centsToMajor(board.deviceCompensationCents),
      charity: centsToMajor(board.charityCents),
      pbc: centsToMajor(board.pbcCents),
    };
    const sources = Object.fromEntries(
      Object.keys(liveMetrics).map((id) => [id, "live" as const]),
    ) as Partial<Record<MoneyStatsMetricId, "live" | "fixture">>;

    return buildMoneyStatsCards({
      currency: board.currency,
      metrics: liveMetrics,
      sources,
    }).map((card) => buildCardViewModel(card));
  }, [periodScoreboardQuery.data]);

  const statusOptions = useMemo(() => moneyBillsStatusOptionsForParty(partyFilter), [partyFilter]);

  const billsEmptyCopy = useMemo(
    () => moneyBillsEmptyCopy(partyFilter, statusFilter, searchTerm),
    [partyFilter, searchTerm, statusFilter],
  );
  const billsActiveFilterSummary = useMemo(
    () => moneyBillsActiveFilterSummary(partyFilter, statusFilter),
    [partyFilter, statusFilter],
  );

  const billRows = useMemo(
    () =>
      buildMoneyBillRows({
        party: partyFilter,
        statusFilter,
        invoices: showsClientBills ? (invoicesQuery.data?.items ?? []) : [],
        clients: periodActivityQuery.data?.clients ?? [],
        members: showsMemberBills ? (periodActivityQuery.data?.members ?? []) : [],
        payouts: showsMemberBills ? (payoutsQuery.data?.items ?? []) : [],
      }),
    [
      invoicesQuery.data?.items,
      partyFilter,
      periodActivityQuery.data?.clients,
      periodActivityQuery.data?.members,
      payoutsQuery.data?.items,
      showsClientBills,
      showsMemberBills,
      statusFilter,
    ],
  );

  const paymentRow = useMemo(() => {
    const row = billRows.find((item) => item.id === paymentInvoiceId);
    if (row?.kind === "invoice" || row?.kind === "team-payout" || row?.kind === "adjustment") {
      return row;
    }
    return null;
  }, [billRows, paymentInvoiceId]);

  const adjustmentCreateValid = moneyBillsAdjustmentCreateValid(
    adjustmentSectionKey,
    adjustmentLabel,
    adjustmentAmount,
  );

  const clients = useMemo(() => {
    const activityClients = (periodActivityQuery.data?.clients ?? []).map((client) => ({
      id: client.clientId,
      name: client.clientName,
    }));
    if (activityClients.length > 0) return activityClients;
    return (clientsQuery.data?.items ?? []).map((client) => ({
      id: client.id,
      name: client.name,
    }));
  }, [clientsQuery.data?.items, periodActivityQuery.data?.clients]);

  const createFormValid = moneyBillsCreateFormValid(
    billCreateClientId,
    billCreatePeriodStart,
    billCreatePeriodEnd,
  );
  const paymentCanSubmit = paymentRow
    ? moneyBillsPaymentCanSubmit(paymentAmount, paymentRow.remainingCents)
    : false;

  const billsIsLoading =
    loadsPeriodBills &&
    ((showsClientBills && invoicesQuery.isPending) ||
      (loadsPayoutLines && payoutsQuery.isPending) ||
      ((showsClientBills || showsMemberBills) && periodActivityQuery.isPending));
  const billsIsError =
    loadsPeriodBills &&
    ((showsClientBills && invoicesQuery.isError) ||
      (loadsPayoutLines && payoutsQuery.isError) ||
      ((showsClientBills || showsMemberBills) && periodActivityQuery.isError));
  const billsErrorMessage = getErrorMessage(
    invoicesQuery.error ?? payoutsQuery.error ?? periodActivityQuery.error,
    "Try refreshing.",
  );

  const upcomingExpenses = useMemo(
    () => expenseRecords.filter((record) => record.kind === "subscription").map(toExpenseRow),
    [expenseRecords],
  );
  const recentExpenses = useMemo(
    () => expenseRecords.filter((record) => record.kind === "one_time").map(toExpenseRow),
    [expenseRecords],
  );

  const canSubmitExpense = moneyExpenseCanSubmit(
    expenseName,
    expenseKind,
    expensePeriod,
    expenseAmount,
  );

  const expensePaymentRow = useMemo(() => {
    const record = expenseRecords.find((item) => item.id === expensePaymentId);
    return record ? toExpenseRow(record) : null;
  }, [expensePaymentId, expenseRecords]);

  const expensePaymentCanSubmit = expensePaymentRow
    ? moneyBillsPaymentCanSubmit(expensePaymentAmount, expensePaymentRow.remainingCents)
    : false;

  function onSelectMetric(selection: MoneyStatsMetricSelection) {
    switch (selection.metricId) {
      case "total-income":
        setPartyFilter("client");
        setStatusFilter(null);
        break;
      case "received":
        setPartyFilter("client");
        setStatusFilter("paid");
        break;
      case "remaining":
        setPartyFilter("client");
        setStatusFilter("outstanding");
        break;
      case "salaries":
      case "paid-vacation":
      case "device-compensation":
        setPartyFilter("team");
        setStatusFilter(null);
        break;
      case "expenses":
        setExpenseDetailsOpen(true);
        break;
      case "debt-discount":
      case "charity":
      case "pbc":
        setPartyFilter("adjustments");
        setStatusFilter(null);
        break;
      case "profit-loss-share":
        setMoneySettingsOpen(true);
        setCohortPane("formulas");
        break;
      case "team-profit":
      case "roi":
        document.getElementById("money-period-run")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        break;
      default: {
        const _exhaustive: never = selection.metricId;
        void _exhaustive;
      }
    }
  }

  function onSelectCohortAllocation(selection: MoneyCohortAllocationsSelection) {
    const current = moneySettingsQuery.data;
    const rules = current?.rules ?? {
      enabledRuleIds: MONEY_COHORT_RULES_FIXTURE.map((rule) => rule.id),
      notesByRuleId: {},
    };
    const calcOptions = current?.calcOptions ?? {
      enabledOptionIds: MONEY_CALC_OPTIONS_FIXTURE.map((option) => option.id),
      notesByOptionId: {},
    };

    if (selection.kind === "rule") {
      const enabledRuleIds = rules.enabledRuleIds.includes(selection.ruleId)
        ? rules.enabledRuleIds.filter((id) => id !== selection.ruleId)
        : [...rules.enabledRuleIds, selection.ruleId];
      void agencyOps.upsertMoneySettings({
        teamId,
        rules: { ...rules, enabledRuleIds },
        calcOptions,
      });
      return;
    }

    const enabledOptionIds = calcOptions.enabledOptionIds.includes(selection.optionId)
      ? calcOptions.enabledOptionIds.filter((id) => id !== selection.optionId)
      : [...calcOptions.enabledOptionIds, selection.optionId];
    void agencyOps.upsertMoneySettings({
      teamId,
      rules,
      calcOptions: { ...calcOptions, enabledOptionIds },
    });
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

  function resetBillCreateForm() {
    setBillCreateClientId("");
    setBillCreatePeriodStart("");
    setBillCreatePeriodEnd("");
  }

  function openBillCreate(clientId = "") {
    setBillCreateClientId(clientId);
    setBillCreatePeriodStart(toDateInputValue(new Date(periodRange.from)));
    setBillCreatePeriodEnd(toDateInputValue(new Date(periodRange.to)));
    setBillCreateOpen(true);
  }

  function onBillCreateOpenChange(open: boolean) {
    setBillCreateOpen(open);
    if (!open) resetBillCreateForm();
  }

  function onCreateInvoiceForClient(clientId: string) {
    openBillCreate(clientId);
  }

  function onOpenClient(clientId: string) {
    navigate(moneyBillClientHref(clientId));
  }

  function onOpenMember(userId: string) {
    navigate(moneyBillMemberHref(userId));
  }

  async function onCreatePayoutForMember(userId: string) {
    const member = (periodActivityQuery.data?.members ?? []).find((item) => item.userId === userId);
    setPendingActionInvoiceId(`member-activity:${userId}`);
    await agencyOps.createPayoutFromMember(
      {
        teamId,
        userId,
        userName: member?.userName ?? "",
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
      },
      { onSuccess: () => setPendingActionInvoiceId(null) },
    );
    setPendingActionInvoiceId(null);
  }

  async function onBillCreateSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!createFormValid) return;
    const client = clients.find((item) => item.id === billCreateClientId);
    await agencyOps.createInvoice(
      {
        teamId,
        clientId: billCreateClientId,
        clientName: client?.name ?? "",
        periodStart: new Date(billCreatePeriodStart).toISOString(),
        periodEnd: new Date(`${billCreatePeriodEnd}T23:59:59.999`).toISOString(),
      },
      { onSuccess: () => onBillCreateOpenChange(false) },
    );
  }

  function onPaymentOpenChange(open: boolean) {
    if (!open) {
      setPaymentInvoiceId(null);
      setPaymentAmount("");
    }
  }

  function onOpenPayment(rowId: string) {
    const row = billRows.find((item) => item.id === rowId);
    setPaymentInvoiceId(rowId);
    if (row?.kind === "invoice" || row?.kind === "team-payout" || row?.kind === "adjustment") {
      setPaymentAmount((row.remainingCents / 100).toFixed(2));
      return;
    }
    setPaymentAmount("");
  }

  async function onPaymentSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!paymentRow) return;
    const amountCents = parseMoneyBillPaymentCents(paymentAmount, paymentRow.remainingCents);
    if (amountCents === null) return;
    setPendingActionInvoiceId(paymentRow.id);
    if (paymentRow.kind === "invoice") {
      await agencyOps.recordInvoicePayment(
        { teamId, invoiceId: paymentRow.id, amountCents },
        {
          onSuccess: () => {
            onPaymentOpenChange(false);
            setPendingActionInvoiceId(null);
          },
        },
      );
    } else {
      await agencyOps.recordPayoutPayment(
        { teamId, lineId: paymentRow.id, amountCents },
        {
          onSuccess: () => {
            onPaymentOpenChange(false);
            setPendingActionInvoiceId(null);
          },
        },
      );
    }
    setPendingActionInvoiceId(null);
  }

  function onAdjustmentCreateOpenChange(open: boolean) {
    setAdjustmentCreateOpen(open);
    if (!open) {
      setAdjustmentSectionKey("debt_discount");
      setAdjustmentLabel("");
      setAdjustmentAmount("");
    }
  }

  async function onAdjustmentCreateSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!adjustmentCreateValid) return;
    const amountCents = parseMoneyExpenseAmountCents(adjustmentAmount);
    if (amountCents === null) return;
    await agencyOps.createPayoutLine(
      {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
        sectionKey: adjustmentSectionKey,
        label: adjustmentLabel,
        amountCents,
      },
      { onSuccess: () => onAdjustmentCreateOpenChange(false) },
    );
  }

  async function onSendBill(invoiceId: string) {
    setPendingActionInvoiceId(invoiceId);
    await agencyOps.updateInvoiceStatus(
      { teamId, invoiceId, status: "sent" },
      { onSuccess: () => setPendingActionInvoiceId(null) },
    );
    setPendingActionInvoiceId(null);
  }

  async function onMarkBillPaid(rowId: string) {
    setPendingActionInvoiceId(rowId);
    const row = billRows.find((item) => item.id === rowId);
    if (row?.kind === "team-payout" || row?.kind === "adjustment") {
      await agencyOps.updatePayoutLineStatus(
        { teamId, lineId: rowId, status: "paid" },
        { onSuccess: () => setPendingActionInvoiceId(null) },
      );
    } else {
      await agencyOps.updateInvoiceStatus(
        { teamId, invoiceId: rowId, status: "paid" },
        { onSuccess: () => setPendingActionInvoiceId(null) },
      );
    }
    setPendingActionInvoiceId(null);
  }

  async function onRefundBill(invoiceId: string) {
    setPendingActionInvoiceId(invoiceId);
    await agencyOps.updateInvoiceStatus(
      { teamId, invoiceId, status: "refunded" },
      { onSuccess: () => setPendingActionInvoiceId(null) },
    );
    setPendingActionInvoiceId(null);
  }

  function resetExpenseCreateForm() {
    setExpenseName("");
    setExpenseKind("one_time");
    setExpensePeriod(null);
    setExpenseAmount("");
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

  function onExpensePaymentOpenChange(open: boolean) {
    if (!open) {
      setExpensePaymentId(null);
      setExpensePaymentAmount("");
    }
  }

  function onOpenExpensePayment(expenseId: string) {
    const record = expenseRecords.find((item) => item.id === expenseId);
    setExpensePaymentId(expenseId);
    setExpensePaymentAmount(record ? (record.remainingCents / 100).toFixed(2) : "");
  }

  async function onExpenseCreateSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!moneyExpenseCanSubmit(expenseName, expenseKind, expensePeriod, expenseAmount)) return;
    const amountCents = parseMoneyExpenseAmountCents(expenseAmount);
    if (amountCents === null) return;
    await agencyOps.createExpense(
      {
        teamId,
        name: expenseName,
        kind: expenseKind,
        period: expensePeriod,
        note: expenseNote,
        amountCents,
      },
      { onSuccess: () => onExpenseCreateOpenChange(false) },
    );
  }

  async function onExpensePaymentSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!expensePaymentRow) return;
    const amountCents = parseMoneyBillPaymentCents(
      expensePaymentAmount,
      expensePaymentRow.remainingCents,
    );
    if (amountCents === null) return;
    await agencyOps.recordExpensePayment(
      { teamId, expenseId: expensePaymentRow.id, amountCents },
      { onSuccess: () => onExpensePaymentOpenChange(false) },
    );
  }

  const selectedRunSectionLines = useMemo(
    () =>
      (runSectionLinesQuery.data?.items ?? []).map((line) => ({
        id: line.id,
        sectionKey: line.sectionKey,
        label: line.label,
        userName: line.userName,
        cohortKey: line.cohortKey,
        amountCents: line.amountCents,
        paidCents: line.paidCents,
        remainingCents: line.remainingCents,
        currency: line.currency,
        status: line.status,
        canRecordPayment: line.status === "draft" || line.status === "partial",
        canMarkPaid: line.status === "draft" || line.status === "partial",
      })),
    [runSectionLinesQuery.data?.items],
  );

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
    payoutRun: {
      title: "Period run",
      subtitle: "Payroll sections for this Money period",
      status: payoutRunQuery.data?.status ?? "draft",
      currency: payoutRunQuery.data?.currency ?? "USD",
      periodLabel,
      sections: payoutRunQuery.data?.sections ?? [],
      selectedSectionId: selectedRunSectionId,
      onSelectSection: setSelectedRunSectionId,
      selectedSectionLines: selectedRunSectionLines,
      isLoading: payoutRunQuery.isPending,
      onOpenPayment,
      onMarkPaid: onMarkBillPaid,
      onAddLine:
        selectedRunSection &&
        (selectedRunSection.key === "debt_discount" ||
          selectedRunSection.key === "charity" ||
          selectedRunSection.key === "pbc")
          ? () => {
              setAdjustmentSectionKey(selectedRunSection.key);
              setPartyFilter("adjustments");
              onAdjustmentCreateOpenChange(true);
            }
          : null,
      onOpenTeamBills: () => setPartyFilter("team"),
      isMutationPending: isInvoiceMutationPending,
    },
    moneySettings: {
      open: moneySettingsOpen,
      onOpenChange: setMoneySettingsOpen,
      onOpen: () => setMoneySettingsOpen(true),
      title: "Money settings",
      description:
        "Cohort rules and calculation options for this team’s Money surface. Click to enable or disable; formulas do not auto-generate payout lines yet.",
      pane: cohortPane,
      paneOptions: MONEY_COHORT_PANE_OPTIONS,
      onPaneChange: setCohortPane,
      rules: MONEY_COHORT_RULES_FIXTURE.map((rule) => ({
        ...rule,
        enabled: moneySettingsQuery.data?.rules.enabledRuleIds.includes(rule.id) ?? true,
      })),
      calcOptions: MONEY_CALC_OPTIONS_FIXTURE.map((option) => ({
        ...option,
        enabled: moneySettingsQuery.data?.calcOptions.enabledOptionIds.includes(option.id) ?? true,
      })),
      onSelect: onSelectCohortAllocation,
      isSaving: isInvoiceMutationPending,
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
      billCount: billRows.length,
      rows: billRows,
      isLoading: billsIsLoading,
      isError: billsIsError,
      errorMessage: billsErrorMessage,
      onRetry: () => {
        void invoicesQuery.refetch();
        void payoutsQuery.refetch();
        void periodActivityQuery.refetch();
      },
      isMutationPending: isInvoiceMutationPending,
      pendingActionInvoiceId,
      onOpenCreate: () =>
        partyFilter === "adjustments" ? onAdjustmentCreateOpenChange(true) : openBillCreate(),
      onOpenClient,
      onOpenMember,
      onCreateInvoiceForClient,
      onCreatePayoutForMember,
      onSend: onSendBill,
      onMarkPaid: onMarkBillPaid,
      onRefund: onRefundBill,
      onOpenPayment,
      create: {
        open: billCreateOpen,
        onOpenChange: onBillCreateOpenChange,
        formId: BILL_CREATE_FORM_ID,
        clients,
        clientId: billCreateClientId,
        onClientIdChange: setBillCreateClientId,
        periodStart: billCreatePeriodStart,
        onPeriodStartChange: setBillCreatePeriodStart,
        periodEnd: billCreatePeriodEnd,
        onPeriodEndChange: setBillCreatePeriodEnd,
        canSubmit: createFormValid && !isInvoiceMutationPending,
        onSubmit: onBillCreateSubmit,
      },
      adjustmentCreate: {
        open: adjustmentCreateOpen,
        onOpenChange: onAdjustmentCreateOpenChange,
        formId: "agency-money-adjustment-create",
        sectionKey: adjustmentSectionKey,
        sectionOptions: MONEY_ADJUSTMENT_SECTION_OPTIONS,
        onSectionKeyChange: setAdjustmentSectionKey,
        label: adjustmentLabel,
        onLabelChange: setAdjustmentLabel,
        amount: adjustmentAmount,
        onAmountChange: setAdjustmentAmount,
        canSubmit: adjustmentCreateValid && !isInvoiceMutationPending,
        onSubmit: onAdjustmentCreateSubmit,
      },
      payment: {
        open: Boolean(paymentRow),
        onOpenChange: onPaymentOpenChange,
        formId: BILL_PAYMENT_FORM_ID,
        partyName:
          paymentRow?.kind === "invoice"
            ? paymentRow.clientName
            : paymentRow?.kind === "team-payout"
              ? paymentRow.userName
              : paymentRow?.kind === "adjustment"
                ? paymentRow.title
                : "",
        referenceLabel:
          paymentRow?.kind === "invoice"
            ? paymentRow.number
            : paymentRow?.kind === "team-payout"
              ? paymentRow.label
              : paymentRow?.kind === "adjustment"
                ? paymentRow.sectionTitle
                : "",
        remainingLabel: paymentRow?.remainingLabel ?? "",
        currency: paymentRow?.currency ?? "USD",
        amount: paymentAmount,
        onAmountChange: setPaymentAmount,
        canSubmit: paymentCanSubmit && !isInvoiceMutationPending,
        onSubmit: onPaymentSubmit,
      },
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
        amount: expenseAmount,
        onAmountChange: setExpenseAmount,
        note: expenseNote,
        onNoteChange: setExpenseNote,
        canSubmit: canSubmitExpense && !isInvoiceMutationPending,
        onSubmit: onExpenseCreateSubmit,
      },
      payment: {
        open: Boolean(expensePaymentRow),
        onOpenChange: onExpensePaymentOpenChange,
        formId: "agency-money-expense-payment",
        name: expensePaymentRow?.name ?? "",
        remainingLabel: expensePaymentRow?.remainingLabel ?? "",
        currency: expensePaymentRow?.currency ?? "USD",
        amount: expensePaymentAmount,
        onAmountChange: setExpensePaymentAmount,
        canSubmit: expensePaymentCanSubmit && !isInvoiceMutationPending,
        onSubmit: onExpensePaymentSubmit,
      },
      onOpenPayment: onOpenExpensePayment,
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
