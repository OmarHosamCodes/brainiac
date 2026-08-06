import type { AgencyOpsExpensePeriod, AgencyOpsExpenseStatus } from "@orch/db/schema";

export function expenseRemainingAmount(amount: number, paidAmount: number): number {
  return Math.max(0, amount - paidAmount);
}

export function expenseStatusAfterPaid(amount: number, paidAmount: number): AgencyOpsExpenseStatus {
  if (paidAmount <= 0) return "due";
  if (paidAmount >= amount) return "paid";
  return "partial";
}

/** Advance a subscription due date by one billing period. */
export function advanceExpenseNextDueAt(from: Date, period: AgencyOpsExpensePeriod): Date {
  const next = new Date(from.getTime());
  switch (period) {
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    case "monthly":
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next;
    case "quarterly":
      next.setUTCMonth(next.getUTCMonth() + 3);
      return next;
    case "yearly":
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      return next;
    default: {
      const _exhaustive: never = period;
      return _exhaustive;
    }
  }
}

/** Default first due for a new subscription from create time. */
export function defaultExpenseNextDueAt(createdAt: Date, period: AgencyOpsExpensePeriod): Date {
  return advanceExpenseNextDueAt(createdAt, period);
}
