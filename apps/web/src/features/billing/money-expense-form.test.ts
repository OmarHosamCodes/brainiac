import { describe, expect, test } from "bun:test";

import {
  formatMoneyExpenseAmount,
  moneyExpenseAmountError,
  moneyExpenseAmountLabel,
  moneyExpenseCanSubmit,
  moneyExpenseOccurredAtInputs,
  moneyExpenseOccurredAtIso,
  moneyExpenseOneTimeMeta,
  moneyExpensePeriodLabel,
  moneyExpenseStatusLabel,
  moneyExpenseSubscriptionMeta,
  parseMoneyExpenseAmount,
  parseMoneyExpensePaymentAmount,
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

  test("variable subscription needs period; first amount is optional", () => {
    expect(moneyExpenseCanSubmit("Electricity", "subscription", "monthly", "", "variable")).toBe(
      true,
    );
    expect(moneyExpenseCanSubmit("Electricity", "subscription", "monthly", "20", "variable")).toBe(
      true,
    );
    expect(
      moneyExpenseCanSubmit("Electricity", "subscription", "monthly", "nope", "variable"),
    ).toBe(false);
    expect(moneyExpenseCanSubmit("Electricity", "subscription", null, "", "variable")).toBe(false);
    expect(moneyExpenseCanSubmit("Rent", "one_time", null, "", "variable")).toBe(false);
  });

  test("fixed subscription still needs amount", () => {
    expect(moneyExpenseCanSubmit("Notion", "subscription", "monthly", "", "fixed")).toBe(false);
    expect(moneyExpenseCanSubmit("Notion", "subscription", "monthly", "20", "fixed")).toBe(true);
  });
});

describe("moneyExpenseAmountLabel", () => {
  test("variable unpaid shows Variable, paid snapshot shows amount", () => {
    expect(moneyExpenseAmountLabel({ amountMode: "variable", amount: 0, currency: "EGP" })).toBe(
      "Variable",
    );
    expect(
      moneyExpenseAmountLabel({ amountMode: "variable", amount: 178_000, currency: "EGP" }),
    ).toBe(formatMoneyExpenseAmount(178_000, "EGP"));
    expect(moneyExpenseAmountLabel({ amountMode: "fixed", amount: 0, currency: "EGP" })).toBe(
      formatMoneyExpenseAmount(0, "EGP"),
    );
  });
});

describe("parseMoneyExpensePaymentAmount", () => {
  test("variable ignores remaining and requires a positive amount", () => {
    expect(parseMoneyExpensePaymentAmount("1240", 0, "variable")).toBe(124_000);
    expect(parseMoneyExpensePaymentAmount("", 0, "variable")).toBeNull();
    expect(parseMoneyExpensePaymentAmount("0", 0, "variable")).toBeNull();
  });

  test("fixed still rejects more than remaining", () => {
    expect(parseMoneyExpensePaymentAmount("20", 10_000, "fixed")).toBe(2000);
    expect(parseMoneyExpensePaymentAmount("200", 10_000, "fixed")).toBeNull();
  });
});

describe("parseMoneyExpenseAmount", () => {
  test("parses major units to cents", () => {
    expect(parseMoneyExpenseAmount("12.50")).toBe(1250);
    expect(parseMoneyExpenseAmount("100")).toBe(10_000);
    expect(parseMoneyExpenseAmount("0")).toBeNull();
    expect(parseMoneyExpenseAmount("abc")).toBeNull();
  });

  test("rejects exponent notation and more than two decimals", () => {
    expect(parseMoneyExpenseAmount("1e2")).toBeNull();
    expect(parseMoneyExpenseAmount("1.234")).toBeNull();
  });
});

describe("moneyExpenseAmountError", () => {
  test("explains missing and malformed amounts", () => {
    expect(moneyExpenseAmountError("")).toBe("Enter an amount.");
    expect(moneyExpenseAmountError("1.234")).toBe(
      "Use a positive amount with up to two decimal places.",
    );
    expect(moneyExpenseAmountError("12.50")).toBeNull();
  });
});

describe("formatMoneyExpenseAmount", () => {
  test("preserves non-zero minor units without forcing trailing zeroes", () => {
    expect(formatMoneyExpenseAmount(1205, "USD")).toContain("12.05");
    expect(formatMoneyExpenseAmount(1200, "USD")).not.toContain("12.00");
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

describe("moneyExpenseOccurredAtIso", () => {
  test("date-only stores UTC midnight", () => {
    expect(moneyExpenseOccurredAtIso("2026-08-26")).toBe("2026-08-26T00:00:00.000Z");
    expect(moneyExpenseOccurredAtIso("2026-08-26", "")).toBe("2026-08-26T00:00:00.000Z");
  });

  test("optional local time is encoded in ISO", () => {
    const iso = moneyExpenseOccurredAtIso("2026-08-26", "15:55");
    expect(iso).toBe(new Date(2026, 7, 26, 15, 55, 0, 0).toISOString());
  });

  test("rejects invalid time and missing date", () => {
    expect(moneyExpenseOccurredAtIso("")).toBeNull();
    expect(moneyExpenseOccurredAtIso("2026-08-26", "24:00")).toBeNull();
  });
});

describe("moneyExpenseOccurredAtInputs", () => {
  test("UTC midnight round-trips as date-only", () => {
    expect(moneyExpenseOccurredAtInputs("2026-08-26T00:00:00.000Z")).toEqual({
      date: "2026-08-26",
      time: "",
    });
  });

  test("local time round-trips", () => {
    const iso = new Date(2026, 7, 26, 15, 55, 0, 0).toISOString();
    expect(moneyExpenseOccurredAtInputs(iso)).toEqual({ date: "2026-08-26", time: "15:55" });
  });
});

describe("moneyExpenseOneTimeMeta", () => {
  test("falls back to One-time without a date", () => {
    expect(moneyExpenseOneTimeMeta(null)).toBe("One-time");
  });

  test("includes date and optional time", () => {
    expect(moneyExpenseOneTimeMeta("2026-08-26T00:00:00.000Z")).toContain("One-time ·");
    const withTime = new Date(2026, 7, 26, 15, 55, 0, 0).toISOString();
    expect(moneyExpenseOneTimeMeta(withTime)).toContain("15:55");
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
