import { agencyListSearchMatches } from "@/features/shared/agency-list-search";

export type ExpenseStripFilter = "due" | "paid" | "all";

export type ExpenseStripItem = {
  id: string;
  expenseId: string;
  name: string;
  kind: "one_time" | "subscription";
  meta?: string;
  statusLabel: string;
  remainingAmount: number;
  amountLabel: string;
  canRecordPayment: boolean;
  note: string | null;
};

export type ExpenseStripSources = {
  recent: { items: ExpenseStripItem[]; count: number };
  upcoming: {
    items: ExpenseStripItem[];
    count: number;
    emptyTitle: string;
    emptyBody: string;
    visibility: {
      onDueChange: (due: boolean) => void;
      onPaidChange: (paid: boolean) => void;
    };
  };
  allSubscriptions: { items: ExpenseStripItem[] };
};

export const EXPENSE_STRIP_FILTERS: ReadonlyArray<{ id: ExpenseStripFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "due", label: "Due" },
  { id: "paid", label: "Paid" },
];

function compareExpenseStripItems(a: ExpenseStripItem, b: ExpenseStripItem): number {
  if (a.kind !== b.kind) {
    return a.kind === "one_time" ? -1 : 1;
  }
  const amountDelta = b.remainingAmount - a.remainingAmount;
  if (amountDelta !== 0) return amountDelta;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function buildExpenseStripItems(
  filter: ExpenseStripFilter,
  expenses: ExpenseStripSources,
): ExpenseStripItem[] {
  const oneTime = expenses.recent.items;
  const allSubscriptions = expenses.allSubscriptions.items;

  switch (filter) {
    case "due":
      return allSubscriptions
        .filter((item) => item.statusLabel !== "Paid")
        .sort(compareExpenseStripItems);
    case "paid":
      return allSubscriptions
        .filter((item) => item.statusLabel === "Paid")
        .sort(compareExpenseStripItems);
    case "all":
      return [...oneTime, ...allSubscriptions].sort(compareExpenseStripItems);
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

export function expenseStripEmptyCopy(
  filter: ExpenseStripFilter,
  expenses: ExpenseStripSources,
  itemCount: number,
  searchTerm = "",
): { title: string; body: string } | null {
  if (itemCount > 0) return null;
  const normalizedSearch = searchTerm.trim();
  if (normalizedSearch) {
    return {
      title: "No matching expenses",
      body: `Nothing matches “${normalizedSearch}” in this view.`,
    };
  }
  if (filter === "due") {
    return {
      title: expenses.upcoming.emptyTitle,
      body: expenses.upcoming.emptyBody,
    };
  }
  if (filter === "paid") {
    return {
      title: "No paid subscriptions",
      body: "Paid subscription cycles this period will appear here.",
    };
  }
  if (
    filter === "all" &&
    expenses.recent.count === 0 &&
    expenses.allSubscriptions.items.length === 0
  ) {
    return {
      title: "No expenses yet",
      body: "Add a one-time expense or subscription to see it here.",
    };
  }
  return null;
}

export function expenseStripMeta(item: ExpenseStripItem): string {
  if (item.meta?.trim()) return item.meta.trim();
  return item.kind === "subscription" ? "Subscription" : "One-time";
}

export function expenseStripItemMatchesSearch(
  item: ExpenseStripItem,
  searchTerm: string,
): boolean {
  return agencyListSearchMatches(
    searchTerm,
    item.name,
    expenseStripMeta(item),
    item.note ?? "",
    item.statusLabel,
    item.amountLabel,
  );
}

export function filterExpenseStripItems(
  items: ExpenseStripItem[],
  searchTerm: string,
): ExpenseStripItem[] {
  const normalized = searchTerm.trim();
  if (!normalized) return items;
  return items.filter((item) => expenseStripItemMatchesSearch(item, normalized));
}

export function expenseStripInsight(expenses: ExpenseStripSources): string | null {
  const subscriptionDueCount = expenses.allSubscriptions.items.filter(
    (item) => item.statusLabel !== "Paid",
  ).length;
  const paidCount = expenses.allSubscriptions.items.filter(
    (item) => item.statusLabel === "Paid",
  ).length;
  const oneTimeCount = expenses.recent.count;
  const dueCount = subscriptionDueCount + oneTimeCount;
  const parts: string[] = [];
  if (dueCount > 0) parts.push(`${dueCount} due`);
  if (paidCount > 0) parts.push(`${paidCount} paid`);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function expenseStripFilterVisibility(
  filter: ExpenseStripFilter,
): { due: boolean; paid: boolean } {
  switch (filter) {
    case "due":
      return { due: true, paid: false };
    case "paid":
      return { due: false, paid: true };
    case "all":
      return { due: true, paid: true };
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}
