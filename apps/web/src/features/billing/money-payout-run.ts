/** Presentational helpers for the Money Period run shell. */

import { formatMoneyAmount } from "./money-bills-rows";

export type MoneyPayoutRunStatus = "draft" | "paying" | "paid";

export type MoneyPayoutRunSection = {
  id: string;
  key: string;
  title: string;
  sortOrder: number;
  lineCount: number;
  dueAmount: number;
  paidAmount: number;
  remainingAmount: number;
};

export type MoneyPayoutRunLine = {
  id: string;
  sectionKey: string;
  label: string;
  userName: string;
  cohortKey: string | null;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  status: "draft" | "partial" | "paid";
  canRecordPayment: boolean;
  canMarkPaid: boolean;
};

export type MoneyPayoutRunCohortGroup = {
  cohortKey: string | null;
  title: string;
  lines: MoneyPayoutRunLine[];
};

export function moneyPayoutRunStatusLabel(status: MoneyPayoutRunStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "paying":
      return "Paying";
    case "paid":
      return "Paid";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function groupPayoutLinesByCohort(
  lines: ReadonlyArray<MoneyPayoutRunLine>,
): MoneyPayoutRunCohortGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, MoneyPayoutRunLine[]>();

  for (const line of lines) {
    const key = line.cohortKey?.trim() || "";
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(line);
  }

  return order.map((key) => ({
    cohortKey: key || null,
    title: key || "Ungrouped",
    lines: buckets.get(key) ?? [],
  }));
}

export function formatPayoutRunSectionMeta(
  section: MoneyPayoutRunSection,
  currency: string,
): string {
  const due = formatMoneyAmount(section.dueAmount, currency);
  const remaining = formatMoneyAmount(section.remainingAmount, currency);
  if (section.lineCount === 0) return "No lines";
  return `${section.lineCount} line${section.lineCount === 1 ? "" : "s"} · ${due} due · ${remaining} left`;
}
