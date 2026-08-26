import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  moneyExpenseAmountError,
  moneyExpenseCanSubmit,
  moneyExpensePaymentCanSubmit,
  parseMoneyExpenseAmount,
  parseMoneyExpensePaymentAmount,
  MONEY_EXPENSE_AMOUNT_MODE_OPTIONS,
  MONEY_EXPENSE_KIND_OPTIONS,
  MONEY_EXPENSE_PERIOD_OPTIONS,
  type MoneyExpenseAmountMode,
  type MoneyExpenseKind,
  type MoneyExpensePeriod,
  type MoneyExpenseRecord,
} from "@/features/billing/money-expense-form";
import {
  filterSubscriptionCycles,
  type MoneySubscriptionVisibility,
} from "@/features/billing/money-subscription-visibility";
import {
  buildExpenseStripItems,
  EXPENSE_STRIP_FILTERS,
  expenseStripEmptyCopy,
  expenseStripFilterVisibility,
  expenseStripInsight,
  filterExpenseStripItems,
  type ExpenseStripFilter,
} from "@/features/money/money-expenses-strip";
import {
  toExpenseRow,
  toSubscriptionCycleRow,
  type MoneySubscriptionCycleRecord,
} from "@/features/money/hooks/money-expense-rows";
import {
  selectIsInvoiceMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";
import { dateInputToIso, toDateInputValue } from "@/features/shared/use-agency-time-range-filters";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { orpc } from "@/lib/orpc";

const EXPENSE_CREATE_FORM_ID = "agency-money-expense-create";

type UseAgencyMoneyExpensesPanelArgs = {
  teamId: string;
  periodStart: string;
  periodEnd: string;
  isOwner: boolean;
  expenseStripFilter: ExpenseStripFilter;
  searchTerm: string;
  expensesPeriodSpendLabel: string | null;
  updateMoneySearch: (
    updates: Partial<Record<"party" | "status" | "expense" | "q", string | null>>,
    replace?: boolean,
  ) => void;
};

export function useAgencyMoneyExpensesPanel({
  teamId,
  periodStart,
  periodEnd,
  isOwner,
  expenseStripFilter,
  searchTerm,
  expensesPeriodSpendLabel,
  updateMoneySearch,
}: UseAgencyMoneyExpensesPanelArgs) {
  const agencyOps = useAgencyOpsStore();
  const isInvoiceMutationPending = useAgencyOpsStore(selectIsInvoiceMutationPending);

  const [expenseCreateOpen, setExpenseCreateOpen] = useState(false);
  const [expenseEditorId, setExpenseEditorId] = useState<string | null>(null);
  const [expenseDetailsOpen, setExpenseDetailsOpen] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseKind, setExpenseKind] = useState<MoneyExpenseKind>("one_time");
  const [expensePeriod, setExpensePeriod] = useState<MoneyExpensePeriod | null>(null);
  const [expenseAmountMode, setExpenseAmountMode] = useState<MoneyExpenseAmountMode>("fixed");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseStartsAt, setExpenseStartsAt] = useState("");
  const [expenseCreateSubmitted, setExpenseCreateSubmitted] = useState(false);
  const [expensePaymentId, setExpensePaymentId] = useState<string | null>(null);
  const [expensePaymentAmount, setExpensePaymentAmount] = useState("");
  const [expensePaymentSubmitted, setExpensePaymentSubmitted] = useState(false);
  const [subscriptionVisibility, setSubscriptionVisibility] = useState<MoneySubscriptionVisibility>(
    () => expenseStripFilterVisibility(expenseStripFilter),
  );

  useEffect(() => {
    setSubscriptionVisibility(expenseStripFilterVisibility(expenseStripFilter));
  }, [expenseStripFilter]);

  const expensesQuery = useQuery({
    ...orpc.agencyOps.expenses.list.queryOptions({
      input: {
        teamId,
        periodStart,
        periodEnd,
      },
    }),
    enabled: Boolean(teamId) && isOwner,
  });

  const subscriptionCyclesQuery = useQuery({
    ...orpc.agencyOps.expenses.subscriptionCycles.queryOptions({
      input: {
        teamId,
        periodStart,
        periodEnd,
      },
    }),
    enabled: Boolean(teamId) && isOwner,
  });

  const expenseRecords = (expensesQuery.data?.items ?? []) as MoneyExpenseRecord[];
  const expensesStatus =
    expensesQuery.isPending || subscriptionCyclesQuery.isPending
      ? ("loading" as const)
      : expensesQuery.isError || subscriptionCyclesQuery.isError
        ? ("error" as const)
        : expensesQuery.isSuccess && subscriptionCyclesQuery.isSuccess
          ? ("ready" as const)
          : ("loading" as const);
  const expensesErrorMessage = getErrorMessage(
    expensesQuery.error ?? subscriptionCyclesQuery.error,
    "Try refreshing expenses.",
  );

  const upcomingExpenses = useMemo(
    () =>
      expensesStatus === "ready"
        ? filterSubscriptionCycles(
            (subscriptionCyclesQuery.data ?? []) as MoneySubscriptionCycleRecord[],
            subscriptionVisibility,
          ).map(toSubscriptionCycleRow)
        : [],
    [expensesStatus, subscriptionCyclesQuery.data, subscriptionVisibility],
  );
  const recentExpenses = useMemo(
    () =>
      expensesStatus === "ready"
        ? expenseRecords.filter((record) => record.kind === "one_time").map(toExpenseRow)
        : [],
    [expenseRecords, expensesStatus],
  );
  const allSubscriptionExpenses = useMemo(
    () =>
      expensesStatus === "ready"
        ? ((subscriptionCyclesQuery.data ?? []) as MoneySubscriptionCycleRecord[]).map(
            toSubscriptionCycleRow,
          )
        : [],
    [expensesStatus, subscriptionCyclesQuery.data],
  );

  const expenseStripSources = useMemo(() => {
    const upcomingEmptyTitle =
      !subscriptionVisibility.due && !subscriptionVisibility.paid
        ? "No visibility selected"
        : subscriptionVisibility.paid && !subscriptionVisibility.due
          ? "No paid subscriptions this period"
          : "Nothing due soon";
    const upcomingEmptyBody =
      !subscriptionVisibility.due && !subscriptionVisibility.paid
        ? "Choose Due or Paid from visibility."
        : "Change visibility to inspect other subscription cycles.";

    return {
      recent: { items: recentExpenses, count: recentExpenses.length },
      upcoming: {
        items: upcomingExpenses,
        count: upcomingExpenses.length,
        emptyTitle: upcomingEmptyTitle,
        emptyBody: upcomingEmptyBody,
        visibility: {
          onDueChange: (due: boolean) =>
            setSubscriptionVisibility((current) => ({ ...current, due })),
          onPaidChange: (paid: boolean) =>
            setSubscriptionVisibility((current) => ({ ...current, paid })),
        },
      },
      allSubscriptions: { items: allSubscriptionExpenses },
    };
  }, [
    allSubscriptionExpenses,
    recentExpenses,
    subscriptionVisibility.due,
    subscriptionVisibility.paid,
    upcomingExpenses,
  ]);

  const expenseStripItems = useMemo(
    () => buildExpenseStripItems(expenseStripFilter, expenseStripSources),
    [expenseStripFilter, expenseStripSources],
  );

  const expenseStripVisibleItems = useMemo(
    () => filterExpenseStripItems(expenseStripItems, searchTerm),
    [expenseStripItems, searchTerm],
  );

  const expenseStripEmpty = useMemo(
    () =>
      expenseStripEmptyCopy(
        expenseStripFilter,
        expenseStripSources,
        expenseStripVisibleItems.length,
        searchTerm,
      ),
    [expenseStripFilter, expenseStripSources, expenseStripVisibleItems.length, searchTerm],
  );

  const expenseStripInsightLabel = useMemo(
    () => (expensesStatus === "ready" ? expenseStripInsight(expenseStripSources) : null),
    [expenseStripSources, expensesStatus],
  );

  const expenseDetailsSections = useMemo(
    () =>
      expensesStatus === "ready"
        ? [
            {
              id: "upcoming" as const,
              title: "Subscriptions",
              items: filterExpenseStripItems(upcomingExpenses, searchTerm),
            },
            {
              id: "recent" as const,
              title: "One-time expenses",
              items: filterExpenseStripItems(recentExpenses, searchTerm),
            },
          ]
        : [],
    [expensesStatus, recentExpenses, searchTerm, upcomingExpenses],
  );

  function onExpenseStripFilterChange(next: ExpenseStripFilter) {
    updateMoneySearch({ expense: next === "all" ? null : next }, false);
  }

  const canSubmitExpense = moneyExpenseCanSubmit(
    expenseName,
    expenseKind,
    expensePeriod,
    expenseAmount,
    expenseAmountMode,
  );
  const expenseNeedsAmount =
    expenseKind !== "subscription" ||
    expenseAmountMode === "fixed" ||
    Boolean(expenseAmount.trim());
  const expenseCreateErrors = {
    name: expenseCreateSubmitted && !expenseName.trim() ? "Enter an expense name." : null,
    period:
      expenseCreateSubmitted && expenseKind === "subscription" && expensePeriod === null
        ? "Choose how often this subscription repeats."
        : null,
    amount:
      expenseCreateSubmitted && expenseNeedsAmount ? moneyExpenseAmountError(expenseAmount) : null,
  };

  const expensePaymentRow = useMemo(() => {
    const record = expenseRecords.find((item) => item.id === expensePaymentId);
    return record ? toExpenseRow(record) : null;
  }, [expensePaymentId, expenseRecords]);

  const expensePaymentCanSubmit = expensePaymentRow
    ? moneyExpensePaymentCanSubmit(
        expensePaymentAmount,
        expensePaymentRow.remainingAmount,
        expensePaymentRow.amountMode,
      )
    : false;

  function resetExpenseCreateForm() {
    setExpenseEditorId(null);
    setExpenseName("");
    setExpenseKind("one_time");
    setExpensePeriod(null);
    setExpenseAmountMode("fixed");
    setExpenseAmount("");
    setExpenseNote("");
    setExpenseStartsAt("");
    setExpenseCreateSubmitted(false);
  }

  function onExpenseCreateOpenChange(open: boolean) {
    setExpenseCreateOpen(open);
    if (!open) resetExpenseCreateForm();
  }

  function onExpenseKindChange(next: MoneyExpenseKind) {
    setExpenseKind(next);
    if (next === "one_time") {
      setExpensePeriod(null);
      setExpenseStartsAt("");
      setExpenseAmountMode("fixed");
    }
  }

  function onExpensePaymentOpenChange(open: boolean) {
    if (!open) {
      setExpensePaymentId(null);
      setExpensePaymentAmount("");
      setExpensePaymentSubmitted(false);
    }
  }

  function onOpenExpensePayment(expenseId: string) {
    const record = expenseRecords.find((item) => item.id === expenseId);
    setExpensePaymentId(expenseId);
    if (!record) {
      setExpensePaymentAmount("");
      return;
    }
    if (record.amountMode === "variable") {
      setExpensePaymentAmount(record.amount > 0 ? (record.amount / 100).toFixed(2) : "");
      return;
    }
    setExpensePaymentAmount((record.remainingAmount / 100).toFixed(2));
  }

  function onOpenExpenseEdit(expenseId: string) {
    const record = expenseRecords.find((item) => item.id === expenseId);
    if (!record) return;
    setExpenseEditorId(record.id);
    setExpenseName(record.name);
    setExpenseKind(record.kind);
    setExpensePeriod(record.period);
    setExpenseAmountMode(record.amountMode ?? "fixed");
    setExpenseAmount(
      record.amountMode === "variable" && record.amount <= 0
        ? ""
        : (record.amount / 100).toFixed(2),
    );
    setExpenseNote(record.note);
    setExpenseStartsAt(record.startsAt ? toDateInputValue(new Date(record.startsAt)) : "");
    setExpenseCreateOpen(true);
  }

  async function onExpenseCreateSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setExpenseCreateSubmitted(true);
    if (
      !moneyExpenseCanSubmit(
        expenseName,
        expenseKind,
        expensePeriod,
        expenseAmount,
        expenseAmountMode,
      )
    ) {
      return;
    }
    const parsedAmount = parseMoneyExpenseAmount(expenseAmount);
    const amount =
      parsedAmount ??
      (expenseKind === "subscription" && expenseAmountMode === "variable" && !expenseAmount.trim()
        ? 0
        : null);
    if (amount === null) {
      return;
    }
    const startsAt =
      expenseKind === "subscription" && expenseStartsAt
        ? dateInputToIso(expenseStartsAt)
        : undefined;

    if (expenseEditorId) {
      await agencyOps.updateExpense(
        {
          teamId,
          expenseId: expenseEditorId,
          name: expenseName,
          kind: expenseKind,
          period: expenseKind === "subscription" ? expensePeriod : null,
          note: expenseNote,
          amount,
          amountMode: expenseKind === "subscription" ? expenseAmountMode : "fixed",
          startsAt: expenseKind === "subscription" ? (startsAt ?? null) : null,
        },
        { onSuccess: () => onExpenseCreateOpenChange(false) },
      );
      return;
    }

    await agencyOps.createExpense(
      {
        teamId,
        name: expenseName,
        kind: expenseKind,
        period: expensePeriod,
        note: expenseNote,
        amount,
        amountMode: expenseKind === "subscription" ? expenseAmountMode : "fixed",
        startsAt,
      },
      { onSuccess: () => onExpenseCreateOpenChange(false) },
    );
  }

  async function onExpensePaymentSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setExpensePaymentSubmitted(true);
    if (!expensePaymentRow) return;
    const amount = parseMoneyExpensePaymentAmount(
      expensePaymentAmount,
      expensePaymentRow.remainingAmount,
      expensePaymentRow.amountMode,
    );
    if (amount === null) return;
    await agencyOps.recordExpensePayment(
      { teamId, expenseId: expensePaymentRow.id, amount },
      { onSuccess: () => onExpensePaymentOpenChange(false) },
    );
  }

  function refetchExpenses() {
    return Promise.all([expensesQuery.refetch(), subscriptionCyclesQuery.refetch()]);
  }

  const expenseEditorPaidAmount =
    expenseRecords.find((item) => item.id === expenseEditorId)?.paidAmount ?? 0;
  const kindLocked = Boolean(expenseEditorId && expenseEditorPaidAmount > 0);

  const expensesPanel = {
    periodSpendLabel: expensesPeriodSpendLabel,
    status: expensesStatus,
    errorMessage: expensesErrorMessage,
    onRetry: () => void refetchExpenses(),
    onOpenCreate: () => onExpenseCreateOpenChange(true),
    onOpenEdit: onOpenExpenseEdit,
    onOpenPayment: onOpenExpensePayment,
    strip: {
      filter: expenseStripFilter,
      filterOptions: EXPENSE_STRIP_FILTERS,
      onFilterChange: onExpenseStripFilterChange,
      items: expenseStripVisibleItems,
      itemCount: expenseStripVisibleItems.length,
      insight: expenseStripInsightLabel,
      empty: expenseStripEmpty,
    },
    details: {
      open: expenseDetailsOpen,
      onOpenChange: setExpenseDetailsOpen,
      title: "All expenses",
      emptyTitle: searchTerm.trim() ? "No matching expenses" : "No expenses yet",
      emptyBody: searchTerm.trim()
        ? `Nothing matches “${searchTerm.trim()}” in this view.`
        : "Add a one-time expense or subscription to see it here.",
      sections: expenseDetailsSections,
      totalCount:
        expensesStatus === "ready"
          ? expenseDetailsSections.reduce((sum, section) => sum + section.items.length, 0)
          : 0,
    },
    create: {
      open: expenseCreateOpen,
      onOpenChange: onExpenseCreateOpenChange,
      formId: EXPENSE_CREATE_FORM_ID,
      mode: expenseEditorId ? ("edit" as const) : ("create" as const),
      title: expenseEditorId ? "Edit expense" : "Add expense",
      submitLabel: expenseEditorId ? "Save" : "Add",
      kindLocked,
      kindHint: kindLocked ? "Finish the current payment before changing type." : null,
      name: expenseName,
      onNameChange: setExpenseName,
      kind: expenseKind,
      kindOptions: MONEY_EXPENSE_KIND_OPTIONS,
      onKindChange: onExpenseKindChange,
      period: expensePeriod,
      periodOptions: MONEY_EXPENSE_PERIOD_OPTIONS,
      onPeriodChange: setExpensePeriod,
      amountMode: expenseAmountMode,
      amountModeOptions: MONEY_EXPENSE_AMOUNT_MODE_OPTIONS,
      onAmountModeChange: setExpenseAmountMode,
      startsAt: expenseStartsAt,
      onStartsAtChange: setExpenseStartsAt,
      amount: expenseAmount,
      onAmountChange: setExpenseAmount,
      note: expenseNote,
      onNoteChange: setExpenseNote,
      errors: expenseCreateErrors,
      canSubmit: canSubmitExpense && !isInvoiceMutationPending,
      isPending: isInvoiceMutationPending,
      onSubmit: onExpenseCreateSubmit,
    },
    payment: {
      open: Boolean(expensePaymentRow),
      onOpenChange: onExpensePaymentOpenChange,
      formId: "agency-money-expense-payment",
      kind: expensePaymentRow?.kind ?? "one_time",
      name: expensePaymentRow?.name ?? "",
      amountMode: expensePaymentRow?.amountMode ?? "fixed",
      heroLabel: expensePaymentRow?.amountMode === "variable" ? "This cycle" : "Remaining",
      heroValue: expensePaymentRow?.remainingLabel ?? "—",
      heroHint:
        expensePaymentRow?.kind === "subscription"
          ? expensePaymentRow.amountMode === "variable"
            ? expensePaymentRow.remainingAmount > 0
              ? "First amount is filled in. Change it if this cycle is different."
              : "Enter this cycle's amount. Paying records it and rolls the next due forward."
            : "Paying in full rolls the next due forward and hides this row until then."
          : "",
      remainingLabel: expensePaymentRow?.remainingLabel ?? "",
      currency: expensePaymentRow?.currency ?? "USD",
      amount: expensePaymentAmount,
      onAmountChange: setExpensePaymentAmount,
      validationMessage:
        expensePaymentSubmitted && !expensePaymentCanSubmit
          ? expensePaymentRow?.amountMode === "variable"
            ? "Use a positive amount with up to two decimal places."
            : `Enter an amount greater than zero and no more than ${expensePaymentRow?.remainingLabel ?? "the remaining balance"}.`
          : null,
      canSubmit: expensePaymentCanSubmit && !isInvoiceMutationPending,
      isPending: isInvoiceMutationPending,
      onSubmit: onExpensePaymentSubmit,
    },
  };

  return {
    expensesPanel,
    expensesStatus,
    expensesErrorMessage,
    refetchExpenses,
    onOpenExpenseCreate: () => onExpenseCreateOpenChange(true),
  };
}
