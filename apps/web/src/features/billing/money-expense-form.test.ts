import { describe, expect, test } from "bun:test";

import {
  formatMoneyExpenseAmount,
  moneyExpenseAmountError,
  moneyExpenseAmountLabel,
  moneyExpenseCanSubmit,
  moneyExpenseDraftAmount,
  moneyExpenseOccurredAtInputs,
  moneyExpenseOccurredAtIso,
  moneyExpenseOneTimeMeta,
  moneyExpensePeriodLabel,
  moneyExpenseStatusLabel,
  moneyExpenseSubscriptionMeta,
  parseExpenseFxRate,
  expenseFxRateError,
  expenseFxRateForSave,
  expenseFxOverridePrefill,
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

describe("parseExpenseFxRate", () => {
  test("null draft means team rate", () => {
    expect(parseExpenseFxRate(null)).toBeNull();
    expect(parseExpenseFxRate("")).toBeNull();
    expect(parseExpenseFxRate("  ")).toBeNull();
  });

  test("accepts a positive decimal", () => {
    expect(parseExpenseFxRate("48")).toBe("48");
    expect(parseExpenseFxRate(" 50.94 ")).toBe("50.94");
  });

  test("rejects zero and garbage", () => {
    expect(parseExpenseFxRate("0")).toBeNull();
    expect(parseExpenseFxRate("-1")).toBeNull();
    expect(parseExpenseFxRate("abc")).toBeNull();
  });
});

describe("expenseFxRateError", () => {
  test("silent when not opted in", () => {
    expect(expenseFxRateError(null)).toBeNull();
  });

  test("empty or invalid opted-in draft is an error", () => {
    expect(expenseFxRateError("")).toBe("Rate must be greater than zero.");
    expect(expenseFxRateError("0")).toBe("Rate must be greater than zero.");
    expect(expenseFxRateError("48")).toBeNull();
  });
});

describe("expenseFxRateForSave", () => {
  test("omits when source matches agency", () => {
    expect(
      expenseFxRateForSave({
        sourceCurrency: "EGP",
        agencyCurrency: "EGP",
        teamRate: null,
        draft: "48",
      }),
    ).toBeUndefined();
  });

  test("omits when draft is null or equals team rate", () => {
    expect(
      expenseFxRateForSave({
        sourceCurrency: "USD",
        agencyCurrency: "EGP",
        teamRate: "50.94",
        draft: null,
      }),
    ).toBeUndefined();
    expect(
      expenseFxRateForSave({
        sourceCurrency: "USD",
        agencyCurrency: "EGP",
        teamRate: "50.94",
        draft: "50.940",
      }),
    ).toBeUndefined();
  });

  test("sends a rate that differs from team", () => {
    expect(
      expenseFxRateForSave({
        sourceCurrency: "USD",
        agencyCurrency: "EGP",
        teamRate: "50.94",
        draft: "48",
      }),
    ).toBe("48");
  });

  test("sends a rate when there is no team pair", () => {
    expect(
      expenseFxRateForSave({
        sourceCurrency: "USD",
        agencyCurrency: "EGP",
        teamRate: null,
        draft: "48",
      }),
    ).toBe("48");
  });
});

describe("expenseFxOverridePrefill", () => {
  test("stays closed when stored rate matches team", () => {
    expect(
      expenseFxOverridePrefill({
        sourceCurrency: "USD",
        agencyCurrency: "EGP",
        storedRate: "50.94",
        teamRate: "50.94",
      }),
    ).toBeNull();
  });

  test("opens with the stored snapshot when it differs from team", () => {
    expect(
      expenseFxOverridePrefill({
        sourceCurrency: "USD",
        agencyCurrency: "EGP",
        storedRate: "48",
        teamRate: "50.94",
      }),
    ).toBe("48");
  });

  test("stays closed for agency-currency rows", () => {
    expect(
      expenseFxOverridePrefill({
        sourceCurrency: "EGP",
        agencyCurrency: "EGP",
        storedRate: "1",
        teamRate: null,
      }),
    ).toBeNull();
  });
});

describe("moneyExpenseDraftAmount", () => {
  test("hydrates the source amount when present", () => {
    expect(moneyExpenseDraftAmount(254_700, 5_000, "fixed")).toBe("50.00");
  });

  test("falls back to the ledger amount", () => {
    expect(moneyExpenseDraftAmount(12_000, null, "fixed")).toBe("120.00");
  });

  test("variable with no amount stays blank", () => {
    expect(moneyExpenseDraftAmount(0, 0, "variable")).toBe("");
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
