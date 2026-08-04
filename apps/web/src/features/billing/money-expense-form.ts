/** Local expense draft model for Money Expenses create dialog. */

export type MoneyExpenseKind = "one_time" | "subscription";

export type MoneyExpensePeriod = "weekly" | "monthly" | "quarterly" | "yearly";

export type MoneyExpenseRecord = {
  id: string;
  name: string;
  kind: MoneyExpenseKind;
  period: MoneyExpensePeriod | null;
  note: string;
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

export function moneyExpenseCanSubmit(
  name: string,
  kind: MoneyExpenseKind,
  period: MoneyExpensePeriod | null,
): boolean {
  if (!name.trim()) return false;
  if (kind === "subscription") return period !== null;
  return true;
}

export function createMoneyExpenseRecord(input: {
  name: string;
  kind: MoneyExpenseKind;
  period: MoneyExpensePeriod | null;
  note: string;
}): MoneyExpenseRecord {
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    kind: input.kind,
    period: input.kind === "subscription" ? input.period : null,
    note: input.note.trim(),
    createdAt: new Date().toISOString(),
  };
}
