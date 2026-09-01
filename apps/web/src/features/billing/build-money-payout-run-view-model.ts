import type {
  MoneyPayoutRunLine,
  MoneyPayoutRunSection,
  MoneyPayoutRunStatus,
} from "./money-payout-run";

export type MoneyPayoutRunLineSource = {
  id: string;
  sectionKey: string;
  sectionTitle: string;
  userName: string;
  label: string;
  cohortKey: string | null;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  status: "draft" | "partial" | "paid";
};

const PAYOUT_RUN_SECTIONS: Array<{ key: string; title: string; sortOrder: number }> = [
  { key: "salaries", title: "Salaries", sortOrder: 0 },
  { key: "team_loss", title: "Team loss", sortOrder: 1 },
  { key: "device_comp", title: "Device compensation", sortOrder: 2 },
  { key: "paid_vacation", title: "Paid vacation", sortOrder: 3 },
  { key: "debt_discount", title: "Debt / Discount", sortOrder: 4 },
  { key: "charity", title: "Charity", sortOrder: 5 },
  { key: "pbc", title: "PBC", sortOrder: 6 },
  { key: "extra", title: "Extra", sortOrder: 7 },
];

export function buildMoneyPayoutRunSections(
  items: ReadonlyArray<MoneyPayoutRunLineSource>,
): MoneyPayoutRunSection[] {
  const buckets = new Map<string, MoneyPayoutRunLineSource[]>();
  for (const item of items) {
    const bucket = buckets.get(item.sectionKey) ?? [];
    bucket.push(item);
    buckets.set(item.sectionKey, bucket);
  }

  return PAYOUT_RUN_SECTIONS.map((section) => {
    const lines = buckets.get(section.key) ?? [];
    const dueAmount = lines.reduce((sum, line) => sum + line.amount, 0);
    const paidAmount = lines.reduce((sum, line) => sum + line.paidAmount, 0);
    const remainingAmount = lines.reduce((sum, line) => sum + line.remainingAmount, 0);
    return {
      id: section.key,
      key: section.key,
      title: lines[0]?.sectionTitle ?? section.title,
      sortOrder: section.sortOrder,
      lineCount: lines.length,
      dueAmount,
      paidAmount,
      remainingAmount,
    };
  }).filter((section) => section.lineCount > 0);
}

export function mapMoneyPayoutRunLine(item: MoneyPayoutRunLineSource): MoneyPayoutRunLine {
  return {
    id: item.id,
    sectionKey: item.sectionKey,
    label: item.label,
    userName: item.userName,
    cohortKey: item.cohortKey,
    amount: item.amount,
    paidAmount: item.paidAmount,
    remainingAmount: item.remainingAmount,
    currency: item.currency,
    status: item.status,
    canRecordPayment: item.status === "draft" || item.status === "partial",
    canMarkPaid: item.status === "draft" || item.status === "partial",
  };
}

export function deriveMoneyPayoutRunStatus(
  sections: ReadonlyArray<MoneyPayoutRunSection>,
): MoneyPayoutRunStatus {
  if (sections.length === 0) return "draft";
  const totalRemaining = sections.reduce((sum, section) => sum + section.remainingAmount, 0);
  const totalPaid = sections.reduce((sum, section) => sum + section.paidAmount, 0);
  if (totalRemaining <= 0 && totalPaid > 0) return "paid";
  if (totalPaid > 0) return "paying";
  return "draft";
}

export function moneyPayoutRunLinesForSection(
  items: ReadonlyArray<MoneyPayoutRunLineSource>,
  sectionKey: string | null,
): MoneyPayoutRunLine[] {
  if (!sectionKey) return [];
  return items
    .filter((item) => item.sectionKey === sectionKey)
    .map((item) => mapMoneyPayoutRunLine(item));
}
