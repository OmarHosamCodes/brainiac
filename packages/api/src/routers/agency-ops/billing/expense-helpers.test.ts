import { describe, expect, test } from "bun:test";

import {
  advanceExpenseNextDueAt,
  buildSubscriptionCycleRecords,
  defaultExpenseNextDueAt,
  expensePeriodTotals,
  expenseRemainingAmount,
  expenseStatusAfterPaid,
  isSubscriptionVisibleInPeriod,
  planExpensePayment,
} from "./expense-helpers";

describe("expenseRemainingAmount", () => {
  test("clamps at zero", () => {
    expect(expenseRemainingAmount(1000, 250)).toBe(750);
    expect(expenseRemainingAmount(1000, 1000)).toBe(0);
    expect(expenseRemainingAmount(1000, 1200)).toBe(0);
  });
});

describe("expenseStatusAfterPaid", () => {
  test("maps due / partial / paid", () => {
    expect(expenseStatusAfterPaid(1000, 0)).toBe("due");
    expect(expenseStatusAfterPaid(1000, 100)).toBe("partial");
    expect(expenseStatusAfterPaid(1000, 1000)).toBe("paid");
  });
});

describe("advanceExpenseNextDueAt", () => {
  test("advances by period unit", () => {
    const from = new Date("2026-01-15T12:00:00.000Z");
    expect(advanceExpenseNextDueAt(from, "weekly").toISOString()).toBe("2026-01-22T12:00:00.000Z");
    expect(advanceExpenseNextDueAt(from, "monthly").toISOString()).toBe("2026-02-15T12:00:00.000Z");
    expect(advanceExpenseNextDueAt(from, "quarterly").toISOString()).toBe(
      "2026-04-15T12:00:00.000Z",
    );
    expect(advanceExpenseNextDueAt(from, "yearly").toISOString()).toBe("2027-01-15T12:00:00.000Z");
  });
});

describe("defaultExpenseNextDueAt", () => {
  test("defaults to one period after create", () => {
    const created = new Date("2026-03-01T00:00:00.000Z");
    expect(defaultExpenseNextDueAt(created, "monthly").toISOString()).toBe(
      "2026-04-01T00:00:00.000Z",
    );
  });
});

describe("isSubscriptionVisibleInPeriod", () => {
  test("hides subscriptions whose next due is after the period", () => {
    const periodStart = new Date("2026-08-01T00:00:00.000Z");
    const periodEnd = new Date("2026-08-31T23:59:59.999Z");
    expect(
      isSubscriptionVisibleInPeriod(new Date("2026-08-15T00:00:00.000Z"), periodStart, periodEnd),
    ).toBe(true);
    expect(
      isSubscriptionVisibleInPeriod(new Date("2026-07-01T00:00:00.000Z"), periodStart, periodEnd),
    ).toBe(true);
    expect(
      isSubscriptionVisibleInPeriod(new Date("2026-09-15T00:00:00.000Z"), periodStart, periodEnd),
    ).toBe(false);
  });

  test("shows when period bounds are missing", () => {
    expect(isSubscriptionVisibleInPeriod(new Date("2026-09-15T00:00:00.000Z"), null, null)).toBe(
      true,
    );
  });
});

describe("expensePeriodTotals", () => {
  test("keeps a paid subscription occurrence in its original period after next due advances", () => {
    const totals = expensePeriodTotals({
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-09-01T00:00:00.000Z"),
      expenses: [
        {
          id: "subscription-1",
          kind: "subscription",
          amount: 178_000,
          paidAmount: 0,
          currency: "EGP",
          nextDueAt: new Date("2026-09-24T00:00:00.000Z"),
          occurredAt: null,
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
        },
      ],
      occurrences: [
        {
          expenseId: "subscription-1",
          dueAt: new Date("2026-08-24T00:00:00.000Z"),
          amount: 178_000,
          paidAmount: 178_000,
          currency: "EGP",
        },
      ],
    });

    expect(totals).toEqual({
      amount: 178_000,
      paidAmount: 178_000,
      currency: "EGP",
    });
  });

  test("does not double-count a partially paid current subscription occurrence", () => {
    const dueAt = new Date("2026-08-24T00:00:00.000Z");
    const totals = expensePeriodTotals({
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-09-01T00:00:00.000Z"),
      expenses: [
        {
          id: "subscription-1",
          kind: "subscription",
          amount: 178_000,
          paidAmount: 50_000,
          currency: "EGP",
          nextDueAt: dueAt,
          occurredAt: null,
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
        },
      ],
      occurrences: [
        {
          expenseId: "subscription-1",
          dueAt,
          amount: 178_000,
          paidAmount: 50_000,
          currency: "EGP",
        },
      ],
    });

    expect(totals).toEqual({
      amount: 178_000,
      paidAmount: 50_000,
      currency: "EGP",
    });
  });
});

describe("planExpensePayment", () => {
  const now = new Date("2026-08-24T00:00:00.000Z");
  const due = new Date("2026-08-24T00:00:00.000Z");

  test("fixed subscription rejects payment over remaining", () => {
    expect(
      planExpensePayment({
        kind: "subscription",
        amountMode: "fixed",
        period: "monthly",
        templateAmount: 178_000,
        paidAmount: 0,
        paymentAmount: 200_000,
        nextDueAt: due,
        startsAt: null,
        now,
      }),
    ).toEqual({ ok: false, error: "Payment exceeds remaining balance." });
  });

  test("fixed subscription full pay snapshots template amount and advances due", () => {
    const plan = planExpensePayment({
      kind: "subscription",
      amountMode: "fixed",
      period: "monthly",
      templateAmount: 178_000,
      paidAmount: 0,
      paymentAmount: 178_000,
      nextDueAt: due,
      startsAt: null,
      now,
    });
    expect(plan).toMatchObject({
      ok: true,
      occurrenceAmount: 178_000,
      occurrencePaidAmount: 178_000,
      templatePaidAmount: 0,
      templateStatus: "due",
      writeOccurrence: true,
    });
    if (!plan.ok) throw new Error("expected ok");
    expect(plan.nextDueAt?.toISOString()).toBe("2026-09-24T00:00:00.000Z");
  });

  test("variable subscription uses payment as cycle amount and always completes", () => {
    const plan = planExpensePayment({
      kind: "subscription",
      amountMode: "variable",
      period: "monthly",
      templateAmount: 0,
      paidAmount: 0,
      paymentAmount: 124_000,
      nextDueAt: due,
      startsAt: null,
      now,
    });
    expect(plan).toMatchObject({
      ok: true,
      occurrenceAmount: 124_000,
      occurrencePaidAmount: 124_000,
      templatePaidAmount: 0,
      templateStatus: "due",
      writeOccurrence: true,
    });
    if (!plan.ok) throw new Error("expected ok");
    expect(plan.nextDueAt?.toISOString()).toBe("2026-09-24T00:00:00.000Z");
  });

  test("variable subscription rejects non-positive payment", () => {
    expect(
      planExpensePayment({
        kind: "subscription",
        amountMode: "variable",
        period: "monthly",
        templateAmount: 0,
        paidAmount: 0,
        paymentAmount: 0,
        nextDueAt: due,
        startsAt: null,
        now,
      }).ok,
    ).toBe(false);
  });
});

describe("buildSubscriptionCycleRecords", () => {
  test("separates paid history from the current payable cycle", () => {
    const records = buildSubscriptionCycleRecords({
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-09-01T00:00:00.000Z"),
      subscriptions: [
        {
          id: "expense-1",
          name: "Adobe",
          note: "",
          amount: 178_000,
          paidAmount: 0,
          currency: "EGP",
          period: "monthly",
          amountMode: "fixed",
          nextDueAt: new Date("2026-09-24T00:00:00.000Z"),
        },
        {
          id: "expense-2",
          name: "Hosting",
          note: "",
          amount: 50_000,
          paidAmount: 10_000,
          currency: "EGP",
          period: "monthly",
          amountMode: "fixed",
          nextDueAt: new Date("2026-08-20T00:00:00.000Z"),
        },
      ],
      occurrences: [
        {
          id: "occurrence-1",
          expenseId: "expense-1",
          name: "Adobe",
          note: "",
          amount: 178_000,
          paidAmount: 178_000,
          currency: "EGP",
          period: "monthly",
          amountMode: "fixed",
          dueAt: new Date("2026-08-24T00:00:00.000Z"),
        },
      ],
    });

    expect(records).toEqual([
      {
        id: "due:expense-2:2026-08-20T00:00:00.000Z",
        expenseId: "expense-2",
        state: "due",
        name: "Hosting",
        note: "",
        amount: 50_000,
        paidAmount: 10_000,
        remainingAmount: 40_000,
        currency: "EGP",
        period: "monthly",
        amountMode: "fixed",
        dueAt: "2026-08-20T00:00:00.000Z",
        canRecordPayment: true,
      },
      {
        id: "occurrence-1",
        expenseId: "expense-1",
        state: "paid",
        name: "Adobe",
        note: "",
        amount: 178_000,
        paidAmount: 178_000,
        remainingAmount: 0,
        currency: "EGP",
        period: "monthly",
        amountMode: "fixed",
        dueAt: "2026-08-24T00:00:00.000Z",
        canRecordPayment: false,
      },
    ]);
  });

  test("variable due cycle keeps amount 0 and stays payable", () => {
    const records = buildSubscriptionCycleRecords({
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-09-01T00:00:00.000Z"),
      subscriptions: [
        {
          id: "expense-var",
          name: "Electricity",
          note: "",
          amount: 0,
          paidAmount: 0,
          currency: "EGP",
          period: "monthly",
          amountMode: "variable",
          nextDueAt: new Date("2026-08-24T00:00:00.000Z"),
        },
      ],
      occurrences: [],
    });
    expect(records).toEqual([
      {
        id: "due:expense-var:2026-08-24T00:00:00.000Z",
        expenseId: "expense-var",
        state: "due",
        name: "Electricity",
        note: "",
        amount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        currency: "EGP",
        period: "monthly",
        amountMode: "variable",
        dueAt: "2026-08-24T00:00:00.000Z",
        canRecordPayment: true,
      },
    ]);
  });

  test("keeps overdue due cycles and excludes paid cycles outside the selected period", () => {
    const records = buildSubscriptionCycleRecords({
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-09-01T00:00:00.000Z"),
      subscriptions: [
        {
          id: "overdue",
          name: "Overdue",
          note: "",
          amount: 10_000,
          paidAmount: 0,
          currency: "EGP",
          period: "monthly",
          amountMode: "fixed",
          nextDueAt: new Date("2026-07-20T00:00:00.000Z"),
        },
      ],
      occurrences: [
        {
          id: "before",
          expenseId: "overdue",
          name: "Before",
          note: "",
          amount: 10_000,
          paidAmount: 10_000,
          currency: "EGP",
          period: "monthly",
          amountMode: "fixed",
          dueAt: new Date("2026-07-31T23:59:59.999Z"),
        },
        {
          id: "at-end",
          expenseId: "overdue",
          name: "At end",
          note: "",
          amount: 10_000,
          paidAmount: 10_000,
          currency: "EGP",
          period: "monthly",
          amountMode: "fixed",
          dueAt: new Date("2026-09-01T00:00:00.000Z"),
        },
      ],
    });

    expect(records.map((record) => record.id)).toEqual(["due:overdue:2026-07-20T00:00:00.000Z"]);
  });
});
