import { describe, expect, test } from "bun:test";

import {
  formatMoneyExpenseAmount,
  type MoneyExpenseRecord,
} from "@/features/billing/money-expense-form";

import { toExpenseRow, toSubscriptionCycleRow } from "./money-expense-rows";

const usdReceipt: MoneyExpenseRecord = {
  id: "exp-1",
  name: "Cursor",
  kind: "one_time",
  period: null,
  note: "",
  amountMode: "fixed",
  amount: 254_700,
  paidAmount: 0,
  remainingAmount: 254_700,
  currency: "USD",
  sourceAmount: 5_000,
  status: "due",
  startsAt: null,
  nextDueAt: null,
  occurredAt: "2026-08-01T00:00:00.000Z",
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("toExpenseRow", () => {
  test("labels the frozen agency amount in the ledger currency", () => {
    const row = toExpenseRow(usdReceipt, "EGP");
    expect(row.currency).toBe("EGP");
    expect(row.amountLabel).toBe(formatMoneyExpenseAmount(254_700, "EGP"));
    expect(row.remainingLabel).toBe(formatMoneyExpenseAmount(254_700, "EGP"));
  });
});

describe("toSubscriptionCycleRow", () => {
  test("labels agency remaining, not the source currency", () => {
    const row = toSubscriptionCycleRow(
      {
        id: "cycle-1",
        expenseId: "exp-2",
        state: "due",
        name: "Figma",
        note: "",
        amount: 101_880,
        paidAmount: 0,
        remainingAmount: 101_880,
        currency: "USD",
        period: "monthly",
        amountMode: "fixed",
        dueAt: "2026-08-15T00:00:00.000Z",
        canRecordPayment: true,
      },
      "EGP",
    );
    expect(row.currency).toBe("EGP");
    expect(row.amountLabel).toBe(formatMoneyExpenseAmount(101_880, "EGP"));
  });
});
