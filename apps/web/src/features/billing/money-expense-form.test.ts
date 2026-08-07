import { describe, expect, test } from "bun:test";

import {
  moneyExpenseCanSubmit,
  moneyExpensePeriodLabel,
  moneyExpenseStatusLabel,
  moneyExpenseSubscriptionMeta,
  parseMoneyExpenseAmount,
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

describe("parseMoneyExpenseAmount", () => {
  test("parses major units to cents", () => {
    expect(parseMoneyExpenseAmount("12.50")).toBe(1250);
    expect(parseMoneyExpenseAmount("100")).toBe(10_000);
    expect(parseMoneyExpenseAmount("0")).toBeNull();
    expect(parseMoneyExpenseAmount("abc")).toBeNull();
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

describe("moneyExpenseSubscriptionMeta", () => {
  test("prefers next due over start date", () => {
    expect(
      moneyExpenseSubscriptionMeta({
        period: "monthly",
        nextDueAt: "2026-09-15T00:00:00.000Z",
        startsAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toContain("Next");
  });

  test("falls back to starts label", () => {
    expect(
      moneyExpenseSubscriptionMeta({
        period: "monthly",
        nextDueAt: null,
        startsAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toContain("Starts");
  });
});
