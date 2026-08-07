/** Expense draft helpers for Money Expenses create / payment dialogs. */

export type MoneyExpenseKind = "one_time" | "subscription";

export type MoneyExpensePeriod = "weekly" | "monthly" | "quarterly" | "yearly";

export type MoneyExpenseStatus = "due" | "partial" | "paid";

export type MoneyExpenseRecord = {
  id: string;
  name: string;
  kind: MoneyExpenseKind;
  period: MoneyExpensePeriod | null;
  note: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  status: MoneyExpenseStatus;
  startsAt: string | null;
  nextDueAt: string | null;
  occurredAt: string | null;
  createdAt: string;
};

export const MONEY_EXPENSE_KIND_OPTIONS: ReadonlyArray<{
  id: MoneyExpenseKind;
  label: string;
}> = [
  { id: "one_time", label: "One-time" },
  { id: "subscription", label: "Subscription" },
];

export const MONEY_EXPENSE_PERIOD_OPTIONS: ReadonlyArray<{
  id: MoneyExpensePeriod;
  label: string;
}> = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" },
];

export function moneyExpensePeriodLabel(period: MoneyExpensePeriod | null): string | null {
  if (!period) return null;
  return MONEY_EXPENSE_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? null;
}

/** Parse major-unit amount string → positive cents, or null if invalid. */
export function parseMoneyExpenseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const major = Number(normalized);
  if (!Number.isFinite(major) || major <= 0) return null;
  return Math.round(major * 100);
}

export function moneyExpenseCanSubmit(
  name: string,
  kind: MoneyExpenseKind,
  period: MoneyExpensePeriod | null,
  amount: string,
): boolean {
  if (!name.trim()) return false;
  if (parseMoneyExpenseAmount(amount) === null) return false;
  if (kind === "subscription") return period !== null;
  return true;
}

export function formatMoneyExpenseAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function moneyExpenseStatusLabel(status: MoneyExpenseStatus): string {
  switch (status) {
    case "due":
      return "Due";
    case "partial":
      return "Partial";
    case "paid":
      return "Paid";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function formatMoneyExpenseDueDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function moneyExpenseSubscriptionMeta(record: {
  period: MoneyExpensePeriod | null;
  nextDueAt: string | null;
  startsAt: string | null;
}): string {
  const periodLabel = moneyExpensePeriodLabel(record.period) ?? "Subscription";
  const nextDue = formatMoneyExpenseDueDate(record.nextDueAt);
  if (nextDue) return `${periodLabel} · Next ${nextDue}`;
  const starts = formatMoneyExpenseDueDate(record.startsAt);
  if (starts) return `${periodLabel} · Starts ${starts}`;
  return periodLabel;
}
