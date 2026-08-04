import { describe, expect, test } from "bun:test";

import {
  moneyExpenseCanSubmit,
  moneyExpensePeriodLabel,
  moneyExpenseStatusLabel,
  parseMoneyExpenseAmountCents,
} from "./money-expense-form";

describe("moneyExpenseCanSubmit", () => {
  test("requires name and amount", () => {
    expect(moneyExpenseCanSubmit("  ", "one_time", null, "10")).toBe(false);
    expect(moneyExpenseCanSubmit("Rent", "one_time", null, "")).toBe(false);
  });

  test("one-time needs name + amount", () => {
    expect(moneyExpenseCanSubmit("Rent", "one_time", null, "120")).toBe(true);
  });

  test("subscription needs period", () => {
    expect(moneyExpenseCanSubmit("Notion", "subscription", null, "20")).toBe(false);
    expect(moneyExpenseCanSubmit("Notion", "subscription", "monthly", "20")).toBe(true);
  });
});

describe("parseMoneyExpenseAmountCents", () => {
  test("parses major units to cents", () => {
    expect(parseMoneyExpenseAmountCents("12.50")).toBe(1250);
    expect(parseMoneyExpenseAmountCents("100")).toBe(10_000);
    expect(parseMoneyExpenseAmountCents("0")).toBeNull();
    expect(parseMoneyExpenseAmountCents("abc")).toBeNull();
  });
});

describe("moneyExpensePeriodLabel", () => {
  test("labels known periods", () => {
    expect(moneyExpensePeriodLabel("yearly")).toBe("Yearly");
    expect(moneyExpensePeriodLabel(null)).toBeNull();
  });
});

describe("moneyExpenseStatusLabel", () => {
  test("labels statuses", () => {
    expect(moneyExpenseStatusLabel("due")).toBe("Due");
    expect(moneyExpenseStatusLabel("partial")).toBe("Partial");
    expect(moneyExpenseStatusLabel("paid")).toBe("Paid");
  });
});
