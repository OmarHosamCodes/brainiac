import type {
  AgencyOpsExpenseKind,
  AgencyOpsExpensePeriod,
  AgencyOpsExpenseStatus,
} from "@orch/db/schema";

export type AgencyOpsExpenseAmountMode = "fixed" | "variable";

type ExpensePeriodRow = {
  id: string;
  kind: AgencyOpsExpenseKind;
  amount: number;
  paidAmount: number | null;
  currency: string;
  nextDueAt: Date | null;
  occurredAt: Date | null;
  createdAt: Date;
};

type ExpenseOccurrenceRow = {
  expenseId: string;
  dueAt: Date;
  amount: number;
  paidAmount: number;
  currency: string;
};

export type SubscriptionTemplateRow = {
  id: string;
  name: string;
  note: string;
  amount: number;
  paidAmount: number;
  currency: string;
  period: AgencyOpsExpensePeriod;
  amountMode: AgencyOpsExpenseAmountMode;
  nextDueAt: Date | null;
};

export type PaidSubscriptionOccurrenceRow = {
  id: string;
  expenseId: string;
  name: string;
  note: string;
  amount: number;
  paidAmount: number;
  currency: string;
  period: AgencyOpsExpensePeriod;
  amountMode: AgencyOpsExpenseAmountMode;
  dueAt: Date;
};

export type AgencySubscriptionCycleRecord = {
  id: string;
  expenseId: string;
  state: "due" | "paid";
  name: string;
  note: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  period: AgencyOpsExpensePeriod;
  amountMode: AgencyOpsExpenseAmountMode;
  dueAt: string;
  canRecordPayment: boolean;
};

export function expenseRemainingAmount(amount: number, paidAmount: number): number {
  return Math.max(0, amount - paidAmount);
}

export function expenseStatusAfterPaid(amount: number, paidAmount: number): AgencyOpsExpenseStatus {
  if (paidAmount <= 0) return "due";
  if (paidAmount >= amount) return "paid";
  return "partial";
}

export const EXPENSE_KIND_CHANGE_PAID_ERROR = "Finish the current payment before changing type.";

export type ExpenseKindFieldsPlan =
  | { ok: false; error: string }
  | {
      ok: true;
      kind: AgencyOpsExpenseKind;
      amountMode: AgencyOpsExpenseAmountMode;
      period: AgencyOpsExpensePeriod | null;
      startsAt: Date | null;
      nextDueAt: Date | null;
      occurredAt: Date | null;
    };

/** Remap cadence vs occurredAt when creating, editing, or converting expense kind. */
export function planExpenseKindFields(input: {
  existingKind: AgencyOpsExpenseKind;
  nextKind: AgencyOpsExpenseKind;
  paidAmount: number;
  existingAmountMode: AgencyOpsExpenseAmountMode;
  existingPeriod: AgencyOpsExpensePeriod | null;
  existingStartsAt: Date | null;
  existingNextDueAt: Date | null;
  existingOccurredAt: Date | null;
  amountMode?: AgencyOpsExpenseAmountMode;
  period?: AgencyOpsExpensePeriod | null;
  startsAt?: Date | null;
  nextDueAt?: Date | null;
  occurredAt?: Date | null;
  now: Date;
}): ExpenseKindFieldsPlan {
  if (input.nextKind !== input.existingKind && input.paidAmount > 0) {
    return { ok: false, error: EXPENSE_KIND_CHANGE_PAID_ERROR };
  }

  switch (input.nextKind) {
    case "one_time":
      if (input.existingKind === "subscription") {
        return {
          ok: true,
          kind: "one_time",
          amountMode: "fixed",
          period: null,
          startsAt: null,
          nextDueAt: null,
          occurredAt:
            input.existingOccurredAt ??
            input.existingNextDueAt ??
            input.existingStartsAt ??
            input.now,
        };
      }
      return {
        ok: true,
        kind: "one_time",
        amountMode: "fixed",
        period: input.existingPeriod,
        startsAt: input.existingStartsAt,
        nextDueAt: input.existingNextDueAt,
        occurredAt: input.occurredAt !== undefined ? input.occurredAt : input.existingOccurredAt,
      };
    case "subscription": {
      if (input.existingKind === "one_time") {
        const period = input.period ?? input.existingPeriod;
        if (!period) {
          return { ok: false, error: "Subscription expenses require a period." };
        }
        const startsAt = input.startsAt !== undefined ? input.startsAt : input.existingStartsAt;
        const nextDueAt =
          input.nextDueAt !== undefined
            ? input.nextDueAt
            : (startsAt ?? defaultExpenseNextDueAt(input.now, period));
        return {
          ok: true,
          kind: "subscription",
          amountMode: input.amountMode ?? "fixed",
          period,
          startsAt,
          nextDueAt,
          occurredAt: null,
        };
      }
      if (input.period !== undefined && !input.period) {
        return { ok: false, error: "Subscription expenses require a period." };
      }
      const period = input.period !== undefined ? input.period : input.existingPeriod;
      if (!period) {
        return { ok: false, error: "Subscription expenses require a period." };
      }
      const startsAt = input.startsAt !== undefined ? input.startsAt : input.existingStartsAt;
      let nextDueAt = input.existingNextDueAt;
      if (input.nextDueAt !== undefined) {
        nextDueAt = input.nextDueAt;
      } else if (input.startsAt !== undefined && startsAt && !input.existingNextDueAt) {
        nextDueAt = startsAt;
      }
      return {
        ok: true,
        kind: "subscription",
        amountMode: input.amountMode ?? input.existingAmountMode ?? "fixed",
        period,
        startsAt,
        nextDueAt,
        occurredAt: input.existingOccurredAt,
      };
    }
    default: {
      const _exhaustive: never = input.nextKind;
      return _exhaustive;
    }
  }
}

export type ExpensePaymentPlan =
  | { ok: false; error: string }
  | {
      ok: true;
      occurrenceAmount: number;
      occurrencePaidAmount: number;
      templatePaidAmount: number;
      templateStatus: AgencyOpsExpenseStatus;
      nextDueAt: Date | null;
      writeOccurrence: boolean;
      /** After a variable Pay, clear the first-amount so later cycles stay open. */
      nextTemplateAmount: number | null;
    };

export function planExpensePayment(input: {
  kind: AgencyOpsExpenseKind;
  amountMode: AgencyOpsExpenseAmountMode;
  period: AgencyOpsExpensePeriod | null;
  templateAmount: number;
  paidAmount: number;
  paymentAmount: number;
  nextDueAt: Date | null;
  startsAt: Date | null;
  now: Date;
}): ExpensePaymentPlan {
  if (!Number.isInteger(input.paymentAmount) || input.paymentAmount <= 0) {
    return { ok: false, error: "Payment amount must be a positive integer." };
  }

  if (input.kind === "subscription" && input.amountMode === "variable") {
    if (!input.period) {
      return { ok: false, error: "Subscription expenses require a period." };
    }
    const occurrenceDueAt = input.nextDueAt ?? input.startsAt ?? input.now;
    return {
      ok: true,
      occurrenceAmount: input.paymentAmount,
      occurrencePaidAmount: input.paymentAmount,
      templatePaidAmount: 0,
      templateStatus: "due",
      nextDueAt: advanceExpenseNextDueAt(occurrenceDueAt, input.period),
      writeOccurrence: true,
      nextTemplateAmount: 0,
    };
  }

  const remaining = expenseRemainingAmount(input.templateAmount, input.paidAmount);
  if (input.paymentAmount > remaining) {
    return { ok: false, error: "Payment exceeds remaining balance." };
  }

  const paidAmount = input.paidAmount + input.paymentAmount;
  const status = expenseStatusAfterPaid(input.templateAmount, paidAmount);
  const occurrenceDueAt =
    input.kind === "subscription" ? (input.nextDueAt ?? input.startsAt ?? input.now) : null;

  if (input.kind === "subscription" && status === "paid" && input.period && occurrenceDueAt) {
    return {
      ok: true,
      occurrenceAmount: input.templateAmount,
      occurrencePaidAmount: paidAmount,
      templatePaidAmount: 0,
      templateStatus: "due",
      nextDueAt: advanceExpenseNextDueAt(occurrenceDueAt, input.period),
      writeOccurrence: true,
      nextTemplateAmount: null,
    };
  }

  return {
    ok: true,
    occurrenceAmount: input.templateAmount,
    occurrencePaidAmount: paidAmount,
    templatePaidAmount: paidAmount,
    templateStatus: status,
    nextDueAt: input.nextDueAt,
    writeOccurrence: occurrenceDueAt !== null,
    nextTemplateAmount: null,
  };
}

export function buildSubscriptionCycleRecords(input: {
  periodStart: Date;
  periodEnd: Date;
  subscriptions: SubscriptionTemplateRow[];
  occurrences: PaidSubscriptionOccurrenceRow[];
}): AgencySubscriptionCycleRecord[] {
  const due = input.subscriptions.flatMap((row): AgencySubscriptionCycleRecord[] => {
    const dueAt = row.nextDueAt;
    if (!dueAt || dueAt > input.periodEnd) return [];
    return [
      {
        id: `due:${row.id}:${dueAt.toISOString()}`,
        expenseId: row.id,
        state: "due",
        name: row.name,
        note: row.note,
        amount: row.amount,
        paidAmount: row.paidAmount,
        remainingAmount: expenseRemainingAmount(row.amount, row.paidAmount),
        currency: row.currency,
        period: row.period,
        amountMode: row.amountMode,
        dueAt: dueAt.toISOString(),
        canRecordPayment: true,
      },
    ];
  });
  const paid = input.occurrences.flatMap((row): AgencySubscriptionCycleRecord[] => {
    if (
      row.paidAmount < row.amount ||
      row.dueAt < input.periodStart ||
      row.dueAt >= input.periodEnd
    ) {
      return [];
    }
    return [
      {
        id: row.id,
        expenseId: row.expenseId,
        state: "paid",
        name: row.name,
        note: row.note,
        amount: row.amount,
        paidAmount: row.paidAmount,
        remainingAmount: 0,
        currency: row.currency,
        period: row.period,
        amountMode: row.amountMode,
        dueAt: row.dueAt.toISOString(),
        canRecordPayment: false,
      },
    ];
  });

  due.sort((left, right) => left.dueAt.localeCompare(right.dueAt));
  paid.sort((left, right) => right.dueAt.localeCompare(left.dueAt));
  return [...due, ...paid];
}

export function expensePeriodTotals(input: {
  periodStart: Date;
  periodEnd: Date;
  expenses: ExpensePeriodRow[];
  occurrences: ExpenseOccurrenceRow[];
}): { amount: number; paidAmount: number; currency: string } {
  let amount = 0;
  let paidAmount = 0;
  let currency = "USD";
  const currentSubscriptionDue = new Map<string, number>();
  const isInPeriod = (date: Date) => date >= input.periodStart && date < input.periodEnd;

  for (const expense of input.expenses) {
    if (expense.kind === "subscription") {
      if (
        !isSubscriptionVisibleInPeriod(expense.nextDueAt, input.periodStart, input.periodEnd) ||
        !expense.nextDueAt
      ) {
        continue;
      }
      amount += expense.amount;
      paidAmount += expense.paidAmount ?? 0;
      currency = expense.currency;
      currentSubscriptionDue.set(expense.id, expense.nextDueAt.getTime());
      continue;
    }

    const date = expense.occurredAt ?? expense.createdAt;
    if (!date || !isInPeriod(date)) continue;

    amount += expense.amount;
    paidAmount += expense.paidAmount ?? 0;
    currency = expense.currency;
  }

  for (const occurrence of input.occurrences) {
    if (
      !isInPeriod(occurrence.dueAt) ||
      currentSubscriptionDue.get(occurrence.expenseId) === occurrence.dueAt.getTime()
    ) {
      continue;
    }

    amount += occurrence.amount;
    paidAmount += occurrence.paidAmount;
    currency = occurrence.currency;
  }

  return { amount, paidAmount, currency };
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

/**
 * Subscriptions appear while their next due is on/before periodEnd (overdue or due this period).
 * After a full pay advances nextDueAt past periodEnd, they stay hidden until that due arrives.
 */
export function isSubscriptionVisibleInPeriod(
  nextDueAt: Date | null,
  periodStart: Date | null,
  periodEnd: Date | null,
): boolean {
  if (!periodStart || !periodEnd) return true;
  if (!nextDueAt) return true;
  return nextDueAt.getTime() <= periodEnd.getTime();
}
