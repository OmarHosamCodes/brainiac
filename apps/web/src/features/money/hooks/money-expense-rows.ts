import {
  formatMoneyExpenseAmount,
  moneyExpenseAmountLabel,
  moneyExpensePeriodLabel,
  moneyExpenseStatusLabel,
  moneyExpenseSubscriptionMeta,
  type MoneyExpenseAmountMode,
  type MoneyExpensePeriod,
  type MoneyExpenseRecord,
} from "@/features/billing/money-expense-form";

export type MoneySubscriptionCycleRecord = {
  id: string;
  expenseId: string;
  state: "due" | "paid";
  name: string;
  note: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  period: MoneyExpensePeriod;
  amountMode: MoneyExpenseAmountMode;
  dueAt: string;
  canRecordPayment: boolean;
};

export function toExpenseRow(record: MoneyExpenseRecord) {
  const amountMode = record.amountMode ?? "fixed";
  const kindMeta =
    record.kind === "subscription" ? moneyExpenseSubscriptionMeta(record) : "One-time";
  const amountLabel = moneyExpenseAmountLabel({
    amountMode,
    amount: record.amount,
    currency: record.currency,
  });
  return {
    id: record.id,
    expenseId: record.id,
    name: record.name,
    kind: record.kind,
    meta: kindMeta,
    amountLabel,
    amountMode,
    status: record.status,
    statusLabel: moneyExpenseStatusLabel(record.status),
    remainingAmount: record.remainingAmount,
    remainingLabel:
      amountMode === "variable" && record.amount <= 0
        ? amountLabel
        : formatMoneyExpenseAmount(record.remainingAmount, record.currency),
    currency: record.currency,
    canRecordPayment: record.status === "due" || record.status === "partial",
    note: record.note || null,
  };
}

export function toSubscriptionCycleRow(record: MoneySubscriptionCycleRecord) {
  const dateLabel = new Date(record.dueAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const amountMode = record.amountMode ?? "fixed";
  const status =
    record.state === "paid"
      ? ("paid" as const)
      : record.paidAmount > 0
        ? ("partial" as const)
        : ("due" as const);
  const amountLabel = moneyExpenseAmountLabel({
    amountMode,
    amount: record.amount,
    currency: record.currency,
  });
  return {
    id: record.id,
    expenseId: record.expenseId,
    name: record.name,
    kind: "subscription" as const,
    meta: `${moneyExpensePeriodLabel(record.period)} · ${
      record.state === "paid" ? "Paid for" : "Next"
    } ${dateLabel}`,
    amountLabel,
    amountMode,
    status,
    statusLabel: moneyExpenseStatusLabel(status),
    remainingAmount: record.remainingAmount,
    remainingLabel:
      amountMode === "variable" && record.amount <= 0
        ? amountLabel
        : formatMoneyExpenseAmount(record.remainingAmount, record.currency),
    currency: record.currency,
    canRecordPayment: record.canRecordPayment,
    note: record.note || null,
  };
}
