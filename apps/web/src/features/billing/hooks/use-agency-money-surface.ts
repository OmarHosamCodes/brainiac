import { DEFAULT_WORK_SCHEDULE } from "@orch/api/routers/agency-ops/resourcing/work-schedule";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
import { orpc, orpcClient } from "@/lib/orpc";

import {
  formatMoneyExpenseAmount,
  moneyExpenseCanSubmit,
  moneyExpensePeriodLabel,
  moneyExpenseStatusLabel,
  parseMoneyExpenseAmount,
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
  type MoneyBillsClientCategoryFilter,
  type MoneyBillsPartyFilter,
  type MoneyBillsStatusFilter,
} from "../money-bills-filters";
import {
  buildMoneyBillPersonGroups,
  filterComposeRowsByClientCategory,
  type MoneyBillObligationLine,
  type MoneyBillPersonGroup,
  type MoneyPendingAdjustmentSource,
} from "../money-bill-obligation-rows";
import {
  formatMoneyAmount,
  moneyBillClientHref,
  moneyBillMemberHref,
  moneyBillRowFromAdjustmentLine,
  MONEY_ADJUSTMENT_SECTION_OPTIONS,
  moneyBillsAdjustmentCreateValid,
  moneyBillsCreateFormValid,
  moneyBillsPartyShowsAdjustments,
  moneyBillsPartyShowsClients,
  moneyBillsPartyShowsMembers,
  moneyBillsPaymentCanSubmit,
  parseMoneyBillPaymentAmount,
  type MoneyBillPayoutSectionKey,
} from "../money-bills-rows";
import {
  MONEY_COHORT_PANE_OPTIONS,
  MONEY_COHORT_RULES_FIXTURE,
  type MoneyCohortPane,
} from "../money-cohort-allocations-fixture";
import {
  formatMoneyFormulaPreview,
  validateMoneyFormulaTokensClient,
  type MoneyFormulaDef,
} from "../money-formula-chips";
import {
  applyFormulaDraft,
  applyRuleDraft,
  createFormulaDraft,
  createNewCustomFormulaDraft,
  createNewCustomRuleDraft,
  createRuleDraft,
  listCustomMoneyRuleIds,
  resolveRuleCohort,
  resolveRuleLabel,
  resolveRuleMemberCount,
  resolveRuleSupportsMemberPick,
  type MoneySettingsEditorDraft,
} from "../money-settings-form";
import {
  type MoneyStatsCardId,
  type MoneyStatsMetricFixture,
  type MoneyStatsMetricId,
} from "../money-stats-fixtures";
import {
  buildMoneyStatsCards,
  amountToMajor,
  type MoneyStatsCardWithSource,
} from "../money-stats-live";

const BILL_CREATE_FORM_ID = "agency-money-bill-create";
const BILL_PAYMENT_FORM_ID = "agency-money-bill-payment";

export type MoneyCohortAllocationsSelection =
  | { kind: "rule"; ruleId: string }
  | { kind: "formula"; formulaId: string };

const EXPENSE_CREATE_FORM_ID = "agency-money-expense-create";

function expenseCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function toExpenseRow(record: MoneyExpenseRecord) {
  const kindMeta =
    record.kind === "subscription"
      ? (moneyExpensePeriodLabel(record.period) ?? "Subscription")
      : "One-time";
  const amountLabel = formatMoneyExpenseAmount(record.amount, record.currency);
  return {
    id: record.id,
    name: record.name,
    meta: kindMeta,
    amountLabel,
    statusLabel: moneyExpenseStatusLabel(record.status),
    remainingAmount: record.remainingAmount,
    remainingLabel: formatMoneyExpenseAmount(record.remainingAmount, record.currency),
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

type MoneyPaymentTarget = {
  kind: "invoice" | "payout" | "adjustment";
  id: string;
  partyName: string;
  referenceLabel: string;
  remainingAmount: number;
  remainingLabel: string;
  currency: string;
};

type MoneyPreviewParty = {
  partyType: "client" | "member";
  partyId: string;
  title: string;
  currency: string;
  pendingAdjustmentCents: number;
  lines: MoneyBillObligationLine[];
};

type MoneyAdjustTarget = {
  partyType: "client" | "member";
  partyId: string;
  partyTitle: string;
  line: MoneyBillObligationLine;
};

type MoneySettleAction = "pay" | "partial" | "refund";
type MoneyExportMode = "combine" | "split";
type MoneyPendingAdjustKind = "discount" | "surcharge" | "debt";
type MoneyAdjustTab = MoneySettleAction | "adjustments";

function partyTypeFromGroup(group: MoneyBillPersonGroup): "client" | "member" {
  return group.party === "client" ? "client" : "member";
}

function partyIdFromGroup(group: MoneyBillPersonGroup): string | null {
  return group.clientId ?? group.userId ?? null;
}

function pickAdjustLine(lines: MoneyBillObligationLine[]): MoneyBillObligationLine | null {
  return lines.find((line) => line.openCents > 0) ?? lines[0] ?? null;
}

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
  const queryClient = useQueryClient();
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
  const weekStartsOn = tenurePolicy?.weekStartsOn ?? DEFAULT_WORK_SCHEDULE.weekStartsOn;
  const [customFromDate, setCustomFromDate] = useState(
    toDateInputValue(startOfWeekUtc(weekStartsOn)),
  );
  const [customToDate, setCustomToDate] = useState(toDateInputValue(now));
  const [tenureMonthIndexes, setTenureMonthIndexes] = useState<number[] | null>(null);
  const effectiveTenureMonthIndexes = tenureMonthIndexes ?? defaultTenureMonthIndexes;

  const [partyFilter, setPartyFilter] = useState<MoneyBillsPartyFilter>("all");
  const [statusFilter, setStatusFilter] = useState<MoneyBillsStatusFilter | null>(null);
  const [clientCategoryFilter, setClientCategoryFilter] =
    useState<MoneyBillsClientCategoryFilter>("external");
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
  const [paymentTarget, setPaymentTarget] = useState<{
    kind: "invoice" | "payout" | "adjustment";
    id: string;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [pendingActionInvoiceId, setPendingActionInvoiceId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewParty, setPreviewParty] = useState<MoneyPreviewParty | null>(null);
  const [selectedObligationIds, setSelectedObligationIds] = useState<string[]>([]);
  const [exportMode, setExportMode] = useState<MoneyExportMode>("combine");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<MoneyAdjustTarget | null>(null);
  const [adjustTab, setAdjustTab] = useState<MoneyAdjustTab>("pay");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustKind, setAdjustKind] = useState<MoneyPendingAdjustKind>("discount");
  const [adjustNote, setAdjustNote] = useState("");
  const [composeActionPending, setComposeActionPending] = useState(false);
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
  const [moneySettingsDraft, setMoneySettingsDraft] = useState<MoneySettingsEditorDraft | null>(
    null,
  );
  const [formulaPreviewLabel, setFormulaPreviewLabel] = useState("—");
  const [formulaPreviewPending, setFormulaPreviewPending] = useState(false);
  const [fxFromCurrency, setFxFromCurrency] = useState("USD");
  const [fxRateDraft, setFxRateDraft] = useState("");
  const [currencyDraft, setCurrencyDraft] = useState("USD");

  const setAgencyCurrency = useAgencyOpsStore((s) => s.setAgencyCurrency);
  const upsertFxRate = useAgencyOpsStore((s) => s.upsertFxRate);
  const deleteFxRate = useAgencyOpsStore((s) => s.deleteFxRate);
  const suggestFxRate = useAgencyOpsStore((s) => s.suggestFxRate);

  const formulaValidationError = useMemo(() => {
    if (moneySettingsDraft?.kind !== "formula") return null;
    const result = validateMoneyFormulaTokensClient(moneySettingsDraft.formula.tokens);
    return result.ok ? null : result.error;
  }, [moneySettingsDraft]);

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

  const teamQuery = useQuery({
    ...orpc.team.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const isOwner = teamQuery.data?.role === "owner";
  const isRolePending = teamQuery.isPending;
  const canManageMoney = isOwner;

  const showsClientBills = moneyBillsPartyShowsClients(partyFilter);
  const showsMemberBills = moneyBillsPartyShowsMembers(partyFilter);
  const showsAdjustmentBills = moneyBillsPartyShowsAdjustments(partyFilter);
  const loadsPeriodBills = showsClientBills || showsMemberBills || showsAdjustmentBills;
  const loadsPayoutLines = showsMemberBills || showsAdjustmentBills;
  const loadsPeriodObligations = showsClientBills || showsMemberBills;

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
    enabled: Boolean(teamId) && isOwner && showsClientBills,
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
    enabled: Boolean(teamId) && isOwner && loadsPayoutLines,
  });

  const periodObligationsQuery = useQuery({
    ...orpc.agencyOps.periodObligations.list.queryOptions({
      input: {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
        search: searchTerm.trim() || undefined,
      },
    }),
    enabled: Boolean(teamId) && isOwner && loadsPeriodObligations,
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
    enabled: Boolean(teamId) && isOwner && (showsClientBills || showsMemberBills),
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
    enabled: Boolean(teamId) && isOwner,
  });

  const moneySettingsQuery = useQuery({
    ...orpc.agencyOps.moneySettings.get.queryOptions({
      input: { teamId },
    }),
    enabled: Boolean(teamId) && isOwner,
  });

  const fxRatesQuery = useQuery({
    ...orpc.agencyOps.fxRates.list.queryOptions({
      input: { teamId },
    }),
    enabled: Boolean(teamId) && isOwner && moneySettingsOpen && cohortPane === "currency",
  });

  useEffect(() => {
    const currency = moneySettingsQuery.data?.currency;
    if (currency) setCurrencyDraft(currency);
  }, [moneySettingsQuery.data?.currency]);

  const teamMembersQuery = useQuery({
    ...orpc.team.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId) && isOwner && moneySettingsOpen,
  });

  const periodScoreboardQuery = useQuery({
    ...orpc.agencyOps.money.periodScoreboard.queryOptions({
      input: {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
      },
    }),
    enabled: Boolean(teamId) && isOwner,
  });

  useEffect(() => {
    if (moneySettingsDraft?.kind !== "formula" || !teamId) {
      setFormulaPreviewLabel("—");
      setFormulaPreviewPending(false);
      return;
    }
    if (formulaValidationError) {
      setFormulaPreviewLabel("—");
      setFormulaPreviewPending(false);
      return;
    }

    const formula = moneySettingsDraft.formula;
    let cancelled = false;
    setFormulaPreviewPending(true);
    const timer = window.setTimeout(() => {
      void orpcClient.agencyOps.moneySettings
        .preview({
          teamId,
          periodStart: periodRange.from,
          periodEnd: periodRange.to,
          tokens: formula.tokens,
          output: formula.output,
        })
        .then((result) => {
          if (cancelled) return;
          if (result.error) {
            setFormulaPreviewLabel("—");
            return;
          }
          setFormulaPreviewLabel(
            formatMoneyFormulaPreview(
              result.value,
              formula.output,
              periodScoreboardQuery.data?.currency ?? "USD",
            ),
          );
        })
        .catch(() => {
          if (!cancelled) setFormulaPreviewLabel("—");
        })
        .finally(() => {
          if (!cancelled) setFormulaPreviewPending(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    formulaValidationError,
    moneySettingsDraft,
    periodRange.from,
    periodRange.to,
    periodScoreboardQuery.data?.currency,
    teamId,
  ]);

  const payoutRunQuery = useQuery({
    ...orpc.agencyOps.payouts.getRun.queryOptions({
      input: {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
      },
    }),
    enabled: Boolean(teamId) && isOwner,
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
    enabled: Boolean(teamId) && isOwner && Boolean(selectedRunSection?.key),
  });

  const expenseRecords = (expensesQuery.data?.items ?? []) as MoneyExpenseRecord[];
  const expensesStatus = expensesQuery.isPending
    ? "loading"
    : expensesQuery.isError
      ? "error"
      : expensesQuery.isSuccess
        ? "ready"
        : "loading";
  const expensesErrorMessage = getErrorMessage(expensesQuery.error, "Try refreshing expenses.");
  const moneySettingsStatus = moneySettingsQuery.isPending
    ? "loading"
    : moneySettingsQuery.isError
      ? "error"
      : moneySettingsQuery.isSuccess && moneySettingsQuery.data
        ? "ready"
        : "loading";
  const moneySettingsErrorMessage = getErrorMessage(
    moneySettingsQuery.error,
    "Try refreshing Money settings.",
  );

  const scoreboardStatus =
    isRolePending || periodScoreboardQuery.isPending
      ? "loading"
      : periodScoreboardQuery.isError
        ? "error"
        : periodScoreboardQuery.isSuccess && periodScoreboardQuery.data
          ? "ready"
          : "loading";
  const scoreboardErrorMessage = getErrorMessage(
    periodScoreboardQuery.error,
    "Try refreshing the period scoreboard.",
  );

  const statsCards = useMemo(() => {
    const board = periodScoreboardQuery.data;
    if (!board || scoreboardStatus !== "ready") return [];

    const liveMetrics: Partial<Record<MoneyStatsMetricId, number>> = {
      "total-income": amountToMajor(board.totalIncomeAmount),
      received: amountToMajor(board.receivedAmount),
      remaining: amountToMajor(board.remainingAmount),
      salaries: amountToMajor(board.salariesAmount),
      expenses: amountToMajor(board.expensesAmount),
      "debt-discount": amountToMajor(board.debtDiscountAmount),
      "paid-vacation": amountToMajor(board.paidVacationAmount),
      "team-profit": amountToMajor(board.teamProfitAmount),
      "profit-loss-share": amountToMajor(board.profitLossShareAmount),
      roi: board.roi,
      "device-compensation": amountToMajor(board.deviceCompensationAmount),
      charity: amountToMajor(board.charityAmount),
      pbc: amountToMajor(board.pbcAmount),
    };
    const sources = Object.fromEntries(
      Object.keys(liveMetrics).map((id) => [id, "live" as const]),
    ) as Partial<Record<MoneyStatsMetricId, "live" | "fixture">>;

    return buildMoneyStatsCards({
      currency: board.currency,
      metrics: liveMetrics,
      sources,
    }).map((card) => buildCardViewModel(card));
  }, [periodScoreboardQuery.data, scoreboardStatus]);

  const statusOptions = useMemo(() => moneyBillsStatusOptionsForParty(partyFilter), [partyFilter]);

  const billsClientCategoryFilterActive =
    partyFilter === "all" || partyFilter === "client" ? clientCategoryFilter : null;
  const billsEmptyCopy = useMemo(
    () =>
      moneyBillsEmptyCopy(partyFilter, statusFilter, searchTerm, billsClientCategoryFilterActive),
    [billsClientCategoryFilterActive, partyFilter, searchTerm, statusFilter],
  );
  const billsActiveFilterSummary = useMemo(
    () => moneyBillsActiveFilterSummary(partyFilter, statusFilter, billsClientCategoryFilterActive),
    [billsClientCategoryFilterActive, partyFilter, statusFilter],
  );

  const clientCategoryById = useMemo(() => {
    const map = new Map<string, "internal" | "external">();
    for (const client of clientsQuery.data?.items ?? []) {
      map.set(client.id, client.category);
    }
    return map;
  }, [clientsQuery.data?.items]);

  const billRows = useMemo(() => {
    const currency = periodScoreboardQuery.data?.currency ?? "USD";
    const clients = (periodObligationsQuery.data?.clients ?? []).map((client) => ({
      ...client,
      currency,
    }));
    const members = (periodObligationsQuery.data?.members ?? []).map((member) => ({
      ...member,
      currency,
    }));
    const pendingAdjustments: MoneyPendingAdjustmentSource[] = (
      periodObligationsQuery.data?.pendingAdjustments ?? []
    ).map((item) => ({
      id: item.id,
      partyType: item.partyType,
      partyId: item.partyId,
      kind: item.kind,
      amount: item.amount,
      note: item.note,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
    }));
    const adjustmentLines = (payoutsQuery.data?.items ?? [])
      .filter(
        (payout) =>
          payout.sectionKey === "debt_discount" ||
          payout.sectionKey === "charity" ||
          payout.sectionKey === "pbc",
      )
      .map((payout) => moneyBillRowFromAdjustmentLine(payout));
    const rows = buildMoneyBillPersonGroups({
      clients: showsClientBills ? clients : [],
      members: showsMemberBills ? members : [],
      adjustments: showsAdjustmentBills ? adjustmentLines : [],
      pendingAdjustments,
      statusFilter,
      includeClients: showsClientBills,
      includeMembers: showsMemberBills,
      includeAdjustments: showsAdjustmentBills,
    });
    if (billsClientCategoryFilterActive === null) return rows;
    return filterComposeRowsByClientCategory(
      rows,
      billsClientCategoryFilterActive,
      clientCategoryById,
    );
  }, [
    clientCategoryById,
    billsClientCategoryFilterActive,
    periodObligationsQuery.data?.clients,
    periodObligationsQuery.data?.members,
    periodObligationsQuery.data?.pendingAdjustments,
    periodScoreboardQuery.data?.currency,
    payoutsQuery.data?.items,
    showsAdjustmentBills,
    showsClientBills,
    showsMemberBills,
    statusFilter,
  ]);

  async function invalidateMoneyComposeQueries() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.periodObligations.list.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.invoices.list.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.payouts.list.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.money.periodScoreboard.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.invoices.periodActivity.key(),
      }),
    ]);
  }

  const resolvePaymentTarget = useMemo(
    () =>
      (rowId: string): MoneyPaymentTarget | null => {
        const payoutLine = [
          ...(runSectionLinesQuery.data?.items ?? []),
          ...(payoutsQuery.data?.items ?? []),
        ].find((line) => line.id === rowId);
        if (payoutLine) {
          const kind =
            payoutLine.sectionKey === "debt_discount" ||
            payoutLine.sectionKey === "charity" ||
            payoutLine.sectionKey === "pbc"
              ? "adjustment"
              : "payout";
          return {
            kind,
            id: payoutLine.id,
            partyName:
              kind === "adjustment"
                ? payoutLine.label || payoutLine.sectionTitle
                : payoutLine.userName,
            referenceLabel: kind === "adjustment" ? payoutLine.sectionTitle : payoutLine.label,
            remainingAmount: payoutLine.remainingAmount,
            remainingLabel: formatMoneyAmount(payoutLine.remainingAmount, payoutLine.currency),
            currency: payoutLine.currency,
          };
        }

        const invoice = (invoicesQuery.data?.items ?? []).find((item) => item.id === rowId);
        if (invoice) {
          return {
            kind: "invoice",
            id: invoice.id,
            partyName: invoice.clientName,
            referenceLabel: invoice.number,
            remainingAmount: invoice.remainingAmount,
            remainingLabel: formatMoneyAmount(invoice.remainingAmount, invoice.currency),
            currency: invoice.currency,
          };
        }

        return null;
      },
    [invoicesQuery.data?.items, payoutsQuery.data?.items, runSectionLinesQuery.data?.items],
  );

  const paymentRow = useMemo(
    () => (paymentTarget ? resolvePaymentTarget(paymentTarget.id) : null),
    [paymentTarget, resolvePaymentTarget],
  );

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
    ? moneyBillsPaymentCanSubmit(paymentAmount, paymentRow.remainingAmount)
    : false;
  const paymentValidationMessage =
    paymentAmount.trim().length > 0 && paymentRow && !paymentCanSubmit
      ? `Enter an amount greater than zero and no more than ${paymentRow.remainingLabel}.`
      : null;

  const billsIsLoading =
    loadsPeriodBills &&
    ((loadsPeriodObligations && periodObligationsQuery.isPending) ||
      (showsAdjustmentBills && payoutsQuery.isPending));
  const billsIsError =
    loadsPeriodBills &&
    ((loadsPeriodObligations && periodObligationsQuery.isError) ||
      (showsAdjustmentBills && payoutsQuery.isError));
  const billsErrorMessage = getErrorMessage(
    periodObligationsQuery.error ?? payoutsQuery.error,
    "Try refreshing.",
  );

  const upcomingExpenses = useMemo(
    () =>
      expensesStatus === "ready"
        ? expenseRecords.filter((record) => record.kind === "subscription").map(toExpenseRow)
        : [],
    [expenseRecords, expensesStatus],
  );
  const recentExpenses = useMemo(
    () =>
      expensesStatus === "ready"
        ? expenseRecords.filter((record) => record.kind === "one_time").map(toExpenseRow)
        : [],
    [expenseRecords, expensesStatus],
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
    ? moneyBillsPaymentCanSubmit(expensePaymentAmount, expensePaymentRow.remainingAmount)
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
        setMoneySettingsDraft(null);
        setCohortPane("formulas");
        setMoneySettingsOpen(true);
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

  function onMoneySettingsOpenChange(open: boolean) {
    setMoneySettingsOpen(open);
    if (!open) {
      setMoneySettingsDraft(null);
      setCohortPane("rules");
    }
  }

  function onMoneySettingsPaneChange(pane: MoneyCohortPane) {
    setCohortPane(pane);
    setMoneySettingsDraft(null);
  }

  function onSelectCohortAllocation(selection: MoneyCohortAllocationsSelection) {
    const current = moneySettingsQuery.data;
    if (!current || moneySettingsStatus !== "ready") return;
    if (selection.kind === "rule") {
      setMoneySettingsDraft(createRuleDraft(current.rules, selection.ruleId));
      return;
    }
    const formula = (current.calcOptions.formulas ?? []).find(
      (item) => item.id === selection.formulaId,
    );
    if (!formula) return;
    setMoneySettingsDraft(createFormulaDraft(formula as MoneyFormulaDef));
  }

  function onAddCustomFormula() {
    setCohortPane("formulas");
    setMoneySettingsDraft(createNewCustomFormulaDraft());
  }

  function onAddCustomRule() {
    setCohortPane("rules");
    setMoneySettingsDraft(createNewCustomRuleDraft());
  }

  function onMoneySettingsDraftChange(draft: MoneySettingsEditorDraft) {
    setMoneySettingsDraft(draft);
  }

  function onMoneySettingsEditorCancel() {
    setMoneySettingsDraft(null);
  }

  function onMoneySettingsEditorSave() {
    if (!moneySettingsDraft || !moneySettingsQuery.isSuccess || !moneySettingsQuery.data) return;
    const current = moneySettingsQuery.data;
    const rules = current.rules;
    const calcOptions = current.calcOptions;

    if (moneySettingsDraft.kind === "rule") {
      void agencyOps.upsertMoneySettings(
        {
          teamId,
          rules: applyRuleDraft(rules, moneySettingsDraft),
          calcOptions,
        },
        { onSuccess: () => setMoneySettingsDraft(null) },
      );
      return;
    }

    void agencyOps.upsertMoneySettings(
      {
        teamId,
        rules,
        calcOptions: applyFormulaDraft(
          {
            ...calcOptions,
            formulas: (calcOptions.formulas ?? []) as MoneyFormulaDef[],
          },
          moneySettingsDraft,
        ),
      },
      { onSuccess: () => setMoneySettingsDraft(null) },
    );
  }

  function onSyncFormulaLines() {
    if (
      !window.confirm(
        "Sync enabled formula amounts to unpaid draft lines? Paid lines will remain unchanged.",
      )
    ) {
      return;
    }
    void agencyOps.syncFormulaPayoutLines({
      teamId,
      periodStart: periodRange.from,
      periodEnd: periodRange.to,
      refreshSnapshot: true,
    });
  }

  function onPartyFilterChange(next: MoneyBillsPartyFilter) {
    setPartyFilter(next);
    setStatusFilter((current) =>
      current && moneyBillsStatusAllowed(next, current) ? current : null,
    );
    if (next === "all" || next === "client") {
      setClientCategoryFilter("external");
    }
  }

  function onStatusFilterChange(next: MoneyBillsStatusFilter) {
    setStatusFilter((current) => (current === next ? null : next));
  }

  function onClearStatusFilter() {
    setStatusFilter(null);
  }

  function onClearClientCategoryFilter() {
    setClientCategoryFilter(null);
  }

  function onClearAllFilters() {
    setPartyFilter("all");
    setStatusFilter(null);
    setClientCategoryFilter(null);
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

  function onOpenPreview(group: MoneyBillPersonGroup) {
    const partyId = partyIdFromGroup(group);
    if (!partyId) return;
    setPreviewParty({
      partyType: partyTypeFromGroup(group),
      partyId,
      title: group.title,
      currency: group.currency,
      pendingAdjustmentCents: group.pendingAdjustmentCents,
      lines: group.lines,
    });
    setSelectedObligationIds(group.lines.map((line) => line.id));
    setExportMode("combine");
    setPreviewOpen(true);
  }

  function onOpenPreviewLine(group: MoneyBillPersonGroup, line: MoneyBillObligationLine) {
    const partyId = partyIdFromGroup(group);
    if (!partyId) return;
    setPreviewParty({
      partyType: partyTypeFromGroup(group),
      partyId,
      title: group.title,
      currency: group.currency,
      pendingAdjustmentCents: group.pendingAdjustmentCents,
      lines: group.lines,
    });
    setSelectedObligationIds([line.id]);
    setExportMode("combine");
    setPreviewOpen(true);
  }

  function onClosePreview() {
    setPreviewOpen(false);
    setPreviewParty(null);
    setSelectedObligationIds([]);
  }

  function onPreviewOpenChange(open: boolean) {
    if (!open) onClosePreview();
    else setPreviewOpen(true);
  }

  function onToggleObligationSelect(obligationId: string) {
    setSelectedObligationIds((current) =>
      current.includes(obligationId)
        ? current.filter((id) => id !== obligationId)
        : [...current, obligationId],
    );
  }

  function onSelectAllObligations() {
    if (!previewParty) return;
    const allIds = previewParty.lines.map((line) => line.id);
    setSelectedObligationIds((current) => (current.length === allIds.length ? [] : allIds));
  }

  async function onExportDocuments() {
    if (!previewParty || selectedObligationIds.length === 0) return;
    const selectedLines = previewParty.lines.filter((line) =>
      selectedObligationIds.includes(line.id),
    );
    if (selectedLines.length === 0) return;
    setComposeActionPending(true);
    try {
      await orpcClient.agencyOps.money.exportDocuments({
        teamId,
        partyType: previewParty.partyType,
        partyId: previewParty.partyId,
        mode: exportMode,
        selections: selectedLines.map((line) => ({
          obligationId: line.id,
          periodStart: line.periodStart,
          periodEnd: line.periodEnd,
          kind: line.obligationKind,
          amount: line.openCents,
        })),
      });
      await invalidateMoneyComposeQueries();
      toast.success(exportMode === "combine" ? "Document exported" : "Documents exported");
      onClosePreview();
    } catch (error) {
      toast.error("Couldn't export documents", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setComposeActionPending(false);
    }
  }

  function onOpenAdjustLine(group: MoneyBillPersonGroup, line: MoneyBillObligationLine) {
    const partyId = partyIdFromGroup(group);
    if (!partyId) return;
    setAdjustTarget({
      partyType: partyTypeFromGroup(group),
      partyId,
      partyTitle: group.title,
      line,
    });
    setAdjustTab("pay");
    setAdjustAmount((line.openCents / 100).toFixed(2));
    setAdjustKind("discount");
    setAdjustNote("");
    setAdjustOpen(true);
  }

  function onOpenAdjust(group: MoneyBillPersonGroup) {
    const line = pickAdjustLine(group.lines);
    if (!line) return;
    onOpenAdjustLine(group, line);
  }

  function onAdjustOpenChange(open: boolean) {
    setAdjustOpen(open);
    if (!open) {
      setAdjustTarget(null);
      setAdjustTab("pay");
      setAdjustAmount("");
      setAdjustKind("discount");
      setAdjustNote("");
    }
  }

  async function onSettle(input: { action: MoneySettleAction; amount: number }) {
    if (!adjustTarget) return;
    const { line, partyType, partyId } = adjustTarget;
    setComposeActionPending(true);
    setPendingActionInvoiceId(line.id);
    try {
      await orpcClient.agencyOps.money.settle({
        teamId,
        partyType,
        obligationId: line.id,
        action: input.action,
        amount: input.amount,
        periodStart: line.periodStart,
        periodEnd: line.periodEnd,
        clientId: partyType === "client" ? partyId : undefined,
        userId: partyType === "member" ? partyId : undefined,
      });
      await invalidateMoneyComposeQueries();
      const label =
        input.action === "pay"
          ? "Payment recorded"
          : input.action === "partial"
            ? "Partial payment recorded"
            : "Refund recorded";
      toast.success(label);
      onAdjustOpenChange(false);
    } catch (error) {
      toast.error("Couldn't settle obligation", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setComposeActionPending(false);
      setPendingActionInvoiceId(null);
    }
  }

  async function onUpsertPendingAdjustment(input: {
    kind: MoneyPendingAdjustKind;
    amount: number;
    note: string;
  }) {
    if (!adjustTarget) return;
    setComposeActionPending(true);
    try {
      await orpcClient.agencyOps.pendingAdjustments.upsert({
        teamId,
        partyType: adjustTarget.partyType,
        partyId: adjustTarget.partyId,
        kind: input.kind,
        amount: input.amount,
        note: input.note || undefined,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
      });
      await invalidateMoneyComposeQueries();
      toast.success("Adjustment saved");
      onAdjustOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save adjustment", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setComposeActionPending(false);
    }
  }

  async function onAdjustSubmit() {
    if (!adjustTarget) return;
    switch (adjustTab) {
      case "pay": {
        await onSettle({ action: "pay", amount: adjustTarget.line.openCents });
        return;
      }
      case "partial": {
        const amount = parseMoneyBillPaymentAmount(adjustAmount, adjustTarget.line.openCents);
        if (amount === null) return;
        await onSettle({ action: "partial", amount });
        return;
      }
      case "refund": {
        if (!window.confirm("Refund this obligation? This changes its bill status.")) return;
        await onSettle({ action: "refund", amount: 0 });
        return;
      }
      case "adjustments": {
        const amount = parseMoneyExpenseAmount(adjustAmount);
        if (amount === null) return;
        await onUpsertPendingAdjustment({
          kind: adjustKind,
          amount,
          note: adjustNote,
        });
        return;
      }
      default: {
        const _exhaustive: never = adjustTab;
        void _exhaustive;
      }
    }
  }

  async function onCreatePayoutForMember(userId: string) {
    const member = (periodActivityQuery.data?.members ?? []).find((item) => item.userId === userId);
    setPendingActionInvoiceId(`merged-member:${userId}`);
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
      setPaymentTarget(null);
      setPaymentAmount("");
    }
  }

  function onOpenPayment(rowId: string) {
    const target = resolvePaymentTarget(rowId);
    if (!target) return;
    setPaymentTarget({ kind: target.kind, id: target.id });
    if (target) {
      setPaymentAmount((target.remainingAmount / 100).toFixed(2));
      return;
    }
    setPaymentAmount("");
  }

  async function onPaymentSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!paymentRow) return;
    const amount = parseMoneyBillPaymentAmount(paymentAmount, paymentRow.remainingAmount);
    if (amount === null) return;
    setPendingActionInvoiceId(paymentRow.id);
    if (paymentRow.kind === "invoice") {
      await agencyOps.recordInvoicePayment(
        { teamId, invoiceId: paymentRow.id, amount },
        {
          onSuccess: () => {
            onPaymentOpenChange(false);
            setPendingActionInvoiceId(null);
          },
        },
      );
    } else {
      await agencyOps.recordPayoutPayment(
        { teamId, lineId: paymentRow.id, amount },
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
    const amount = parseMoneyExpenseAmount(adjustmentAmount);
    if (amount === null) return;
    await agencyOps.createPayoutLine(
      {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
        sectionKey: adjustmentSectionKey,
        label: adjustmentLabel,
        amount,
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
    const target = resolvePaymentTarget(rowId);
    if (!target) return;
    if (!window.confirm(`Mark ${target.remainingLabel} for ${target.partyName} as fully paid?`)) {
      return;
    }
    setPendingActionInvoiceId(rowId);
    if (target.kind === "payout" || target.kind === "adjustment") {
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
    if (!window.confirm("Refund this invoice? This changes its bill status.")) return;
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
    setExpensePaymentAmount(record ? (record.remainingAmount / 100).toFixed(2) : "");
  }

  async function onExpenseCreateSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!moneyExpenseCanSubmit(expenseName, expenseKind, expensePeriod, expenseAmount)) return;
    const amount = parseMoneyExpenseAmount(expenseAmount);
    if (amount === null) return;
    await agencyOps.createExpense(
      {
        teamId,
        name: expenseName,
        kind: expenseKind,
        period: expensePeriod,
        note: expenseNote,
        amount,
      },
      { onSuccess: () => onExpenseCreateOpenChange(false) },
    );
  }

  async function onExpensePaymentSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!expensePaymentRow) return;
    const amount = parseMoneyBillPaymentAmount(
      expensePaymentAmount,
      expensePaymentRow.remainingAmount,
    );
    if (amount === null) return;
    await agencyOps.recordExpensePayment(
      { teamId, expenseId: expensePaymentRow.id, amount },
      { onSuccess: () => onExpensePaymentOpenChange(false) },
    );
  }

  const selectedPreviewLines = useMemo(() => {
    if (!previewParty) return [];
    return previewParty.lines.filter((line) => selectedObligationIds.includes(line.id));
  }, [previewParty, selectedObligationIds]);

  const previewSelectedCents = useMemo(
    () => selectedPreviewLines.reduce((sum, line) => sum + line.openCents, 0),
    [selectedPreviewLines],
  );

  const previewDueCents = previewParty
    ? previewSelectedCents + previewParty.pendingAdjustmentCents
    : 0;

  const adjustCanSubmit = (() => {
    if (!adjustTarget || composeActionPending || isInvoiceMutationPending) return false;
    switch (adjustTab) {
      case "pay":
        return adjustTarget.line.openCents > 0;
      case "partial":
        return moneyBillsPaymentCanSubmit(adjustAmount, adjustTarget.line.openCents);
      case "refund":
        return true;
      case "adjustments":
        return parseMoneyExpenseAmount(adjustAmount) !== null;
      default: {
        const _exhaustive: never = adjustTab;
        return _exhaustive;
      }
    }
  })();

  const selectedRunSectionLines = useMemo(
    () =>
      (runSectionLinesQuery.data?.items ?? []).map((line) => ({
        id: line.id,
        sectionKey: line.sectionKey,
        label: line.label,
        userName: line.userName,
        cohortKey: line.cohortKey,
        amount: line.amount,
        paidAmount: line.paidAmount,
        remainingAmount: line.remainingAmount,
        currency: line.currency,
        status: line.status,
        canRecordPayment: line.status === "draft" || line.status === "partial",
        canMarkPaid: line.status === "draft" || line.status === "partial",
      })),
    [runSectionLinesQuery.data?.items],
  );
  const payoutLinesStatus: "loading" | "error" | "ready" | "idle" = !selectedRunSection
    ? "idle"
    : runSectionLinesQuery.isPending
      ? "loading"
      : runSectionLinesQuery.isError
        ? "error"
        : runSectionLinesQuery.isSuccess
          ? "ready"
          : "idle";

  return {
    teamId,
    isOwner,
    isRolePending,
    canManageMoney,
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
    scoreboardStatus,
    scoreboardErrorMessage,
    onRetryScoreboard: () => void periodScoreboardQuery.refetch(),
    onSelectMetric,
    payoutRun: {
      title: periodLabel ? `Payout run for ${periodLabel}` : "Payout run",
      subtitle: "Team and adjustment lines for this period",
      status: payoutRunQuery.data?.status ?? "draft",
      currency: payoutRunQuery.data?.currency ?? "USD",
      periodLabel,
      sections: payoutRunQuery.data?.sections ?? [],
      selectedSectionId: selectedRunSectionId,
      onSelectSection: setSelectedRunSectionId,
      selectedSectionLines: selectedRunSectionLines,
      isLoading: payoutRunQuery.isPending,
      isError: payoutRunQuery.isError,
      errorMessage: getErrorMessage(payoutRunQuery.error, "Try refreshing the payout run."),
      onRetry: () => {
        void payoutRunQuery.refetch();
        if (selectedRunSection) void runSectionLinesQuery.refetch();
      },
      linesStatus: payoutLinesStatus,
      onOpenPayment: isOwner ? onOpenPayment : null,
      onMarkPaid: isOwner ? onMarkBillPaid : null,
      onAddLine: (() => {
        if (!isOwner) return null;
        const sectionKey = selectedRunSection?.key;
        if (sectionKey !== "debt_discount" && sectionKey !== "charity" && sectionKey !== "pbc") {
          return null;
        }
        return () => {
          setAdjustmentSectionKey(sectionKey);
          setPartyFilter("adjustments");
          onAdjustmentCreateOpenChange(true);
        };
      })(),
      onOpenTeamBills: () => setPartyFilter("team"),
      onSyncFormulaLines:
        isOwner && (payoutRunQuery.data?.status === "draft" || payoutRunQuery.data == null)
          ? onSyncFormulaLines
          : null,
      isMutationPending: isInvoiceMutationPending,
    },
    moneySettings: {
      open: moneySettingsOpen,
      onOpenChange: onMoneySettingsOpenChange,
      onOpen: isOwner
        ? () => {
            setMoneySettingsDraft(null);
            setCohortPane("rules");
            setMoneySettingsOpen(true);
          }
        : null,
      title: "Money settings",
      description: "Who qualifies and how much they get. Open a rule or formula, edit, then save.",
      pane: cohortPane,
      paneOptions: MONEY_COHORT_PANE_OPTIONS,
      onPaneChange: onMoneySettingsPaneChange,
      status: moneySettingsStatus,
      errorMessage: moneySettingsErrorMessage,
      onRetry: () => void moneySettingsQuery.refetch(),
      canEdit: moneySettingsStatus === "ready" && isOwner,
      rules: (() => {
        if (moneySettingsStatus !== "ready") return [];
        const rules = moneySettingsQuery.data?.rules;
        const systemRows = MONEY_COHORT_RULES_FIXTURE.map((rule) => ({
          id: rule.id,
          benefit: rule.benefit,
          locked: true as const,
          supportsMemberPick: rule.supportsMemberPick === true,
          enabled: rules?.enabledRuleIds.includes(rule.id) ?? true,
          cohort: resolveRuleCohort(rules, rule.id),
          memberCount: resolveRuleMemberCount(rules, rule.id),
        }));
        const customRows = listCustomMoneyRuleIds(rules).map((ruleId) => ({
          id: ruleId,
          benefit: resolveRuleLabel(rules, ruleId),
          locked: false as const,
          supportsMemberPick: resolveRuleSupportsMemberPick(ruleId),
          enabled: rules?.enabledRuleIds.includes(ruleId) ?? true,
          cohort: resolveRuleCohort(rules, ruleId),
          memberCount: resolveRuleMemberCount(rules, ruleId),
        }));
        return [...systemRows, ...customRows];
      })(),
      formulas:
        moneySettingsStatus === "ready"
          ? ((moneySettingsQuery.data?.calcOptions.formulas ?? []) as MoneyFormulaDef[]).map(
              (formula) => ({
                id: formula.id,
                key: formula.key,
                label: formula.label,
                locked: formula.locked,
                enabled: formula.enabled,
                tokens: formula.tokens,
                output: formula.output,
                metricId: formula.metricId,
                sectionKey: formula.sectionKey,
              }),
            )
          : [],
      memberOptions: (teamMembersQuery.data?.items ?? []).map((member) => ({
        value: member.userId,
        label: member.userName,
      })),
      editor: moneySettingsDraft,
      onSelect: onSelectCohortAllocation,
      onAddCustomFormula,
      onAddCustomRule,
      onEditorChange: onMoneySettingsDraftChange,
      onEditorCancel: onMoneySettingsEditorCancel,
      onEditorSave: onMoneySettingsEditorSave,
      canSaveEditor:
        moneySettingsStatus === "ready" &&
        moneySettingsQuery.data != null &&
        moneySettingsDraft != null &&
        (moneySettingsDraft.kind === "rule"
          ? moneySettingsDraft.cohort.trim().length > 0 &&
            moneySettingsDraft.label.trim().length > 0
          : moneySettingsDraft.formula.label.trim().length > 0 && formulaValidationError == null),
      formulaValidationError,
      formulaPreviewLabel,
      formulaPreviewPending,
      isSaving: isInvoiceMutationPending,
      currency: {
        code: moneySettingsQuery.data?.currency ?? currencyDraft,
        lockedAt: moneySettingsQuery.data?.currencyLockedAt ?? null,
        draft: currencyDraft,
        onDraftChange: setCurrencyDraft,
        onSave: () => {
          if (!teamId || !currencyDraft.trim()) return;
          void setAgencyCurrency({ teamId, currency: currencyDraft.trim().toUpperCase() });
        },
        options: ["EGP", "USD", "EUR", "GBP", "CAD", "SAR", "AED"] as const,
      },
      fxRates: {
        items: fxRatesQuery.data?.items ?? [],
        isLoading: fxRatesQuery.isPending,
        fromCurrency: fxFromCurrency,
        onFromCurrencyChange: setFxFromCurrency,
        rateDraft: fxRateDraft,
        onRateDraftChange: setFxRateDraft,
        onSuggest: () => {
          if (!teamId) return;
          const agency = moneySettingsQuery.data?.currency ?? currencyDraft;
          void suggestFxRate({
            teamId,
            fromCurrency: fxFromCurrency,
            toCurrency: agency,
          }).then((result) => {
            if (result?.rate) setFxRateDraft(result.rate);
          });
        },
        onSave: () => {
          if (!teamId || !fxRateDraft.trim()) return;
          const agency = moneySettingsQuery.data?.currency ?? currencyDraft;
          void upsertFxRate({
            teamId,
            fromCurrency: fxFromCurrency,
            toCurrency: agency,
            rate: fxRateDraft.trim(),
          }).then(() => setFxRateDraft(""));
        },
        onDelete: (id: string) => {
          if (!teamId) return;
          void deleteFxRate({ teamId, id });
        },
      },
    },
    bills: {
      partyFilter,
      partyOptions: MONEY_BILLS_PARTY_OPTIONS,
      onPartyFilterChange,
      statusFilter,
      statusOptions,
      onStatusFilterChange,
      onClearStatusFilter,
      clientCategoryFilter,
      onClearClientCategoryFilter,
      onClearAllFilters,
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
        void periodObligationsQuery.refetch();
        void payoutsQuery.refetch();
      },
      isMutationPending: isInvoiceMutationPending || composeActionPending,
      pendingActionInvoiceId,
      periodLabel,
      onOpenCreate: () =>
        partyFilter === "adjustments" ? onAdjustmentCreateOpenChange(true) : openBillCreate(),
      onOpenClient,
      onOpenMember,
      onOpenPreview,
      onOpenPreviewLine,
      onOpenAdjust,
      onOpenAdjustLine,
      onCreateInvoiceForClient,
      onCreatePayoutForMember,
      onSend: onSendBill,
      onMarkPaid: onMarkBillPaid,
      onRefund: onRefundBill,
      onOpenPayment,
      preview: {
        open: previewOpen,
        onOpenChange: onPreviewOpenChange,
        title: previewParty?.partyType === "member" ? "Payslip preview" : "Invoice preview",
        partyTitle: previewParty?.title ?? "",
        periodLabel,
        currency: previewParty?.currency ?? "USD",
        lines: (previewParty?.lines ?? []).map((line) => ({
          id: line.id,
          label: line.subtitle,
          subtitle: line.subtitle,
          statusLabel: line.statusLabel,
          isCarry: line.isCarry,
          amountLabel: line.openLabel,
          checked: selectedObligationIds.includes(line.id),
        })),
        selectedCount: selectedObligationIds.length,
        allSelected:
          Boolean(previewParty) &&
          previewParty!.lines.length > 0 &&
          selectedObligationIds.length === previewParty!.lines.length,
        onToggleObligationSelect,
        onSelectAllObligations,
        exportMode,
        onExportModeChange: setExportMode,
        selectedTotalLabel: formatMoneyAmount(
          previewSelectedCents,
          previewParty?.currency ?? "USD",
        ),
        pendingAdjustmentCents: previewParty?.pendingAdjustmentCents ?? 0,
        pendingAdjustmentLabel: formatMoneyAmount(
          previewParty?.pendingAdjustmentCents ?? 0,
          previewParty?.currency ?? "USD",
        ),
        dueLabel: formatMoneyAmount(previewDueCents, previewParty?.currency ?? "USD"),
        canExport: selectedObligationIds.length > 0 && !composeActionPending,
        onExport: () => void onExportDocuments(),
        onClose: onClosePreview,
      },
      adjust: {
        open: adjustOpen,
        onOpenChange: onAdjustOpenChange,
        partyTitle: adjustTarget?.partyTitle ?? "",
        lineSubtitle: adjustTarget?.line.subtitle ?? "",
        statusLabel: adjustTarget?.line.statusLabel ?? "",
        isReady: adjustTarget?.line.obligationKind === "ready",
        remainingLabel: adjustTarget?.line.openLabel ?? "",
        currency: adjustTarget?.line.currency ?? "USD",
        tab: adjustTab,
        onTabChange: setAdjustTab,
        amount: adjustAmount,
        onAmountChange: setAdjustAmount,
        kind: adjustKind,
        onKindChange: setAdjustKind,
        note: adjustNote,
        onNoteChange: setAdjustNote,
        canSubmit: adjustCanSubmit,
        onSubmit: () => void onAdjustSubmit(),
        onSettle,
        onUpsertPendingAdjustment,
      },
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
        partyName: paymentRow?.partyName ?? "",
        referenceLabel: paymentRow?.referenceLabel ?? "",
        remainingLabel: paymentRow?.remainingLabel ?? "",
        currency: paymentRow?.currency ?? "USD",
        amount: paymentAmount,
        onAmountChange: setPaymentAmount,
        validationMessage: paymentValidationMessage,
        canSubmit: paymentCanSubmit && !isInvoiceMutationPending,
        onSubmit: onPaymentSubmit,
      },
    },
    expenses: {
      title: "Expenses",
      subtitle: "Subscriptions and ops spend",
      status: expensesStatus,
      errorMessage: expensesErrorMessage,
      onRetry: () => void expensesQuery.refetch(),
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
            title: "One-time expenses",
            items: recentExpenses,
          },
        ],
        totalCount: expensesStatus === "ready" ? expenseRecords.length : 0,
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
        title: "One-time expenses",
        hint: "This period",
        emptyTitle: "No recent spend",
        emptyBody: "One-time expenses this period will appear here.",
        count: recentExpenses.length,
        countLabel: expenseCountLabel(recentExpenses.length, "this period", "this period"),
        items: recentExpenses,
      },
    },
  };
}
