import { describe, expect, test } from "bun:test";

import {
  createMoneyExpenseRecord,
  moneyExpenseCanSubmit,
  moneyExpensePeriodLabel,
} from "./money-expense-form";

describe("moneyExpenseCanSubmit", () => {
  test("requires name", () => {
    expect(moneyExpenseCanSubmit("  ", "one_time", null)).toBe(false);
  });

  test("one-time needs only name", () => {
    expect(moneyExpenseCanSubmit("Rent", "one_time", null)).toBe(true);
  });

  test("subscription needs period", () => {
    expect(moneyExpenseCanSubmit("Notion", "subscription", null)).toBe(false);
    expect(moneyExpenseCanSubmit("Notion", "subscription", "monthly")).toBe(true);
  });
});

describe("createMoneyExpenseRecord", () => {
  test("clears period for one-time", () => {
    const record = createMoneyExpenseRecord({
      name: "  Desk  ",
      kind: "one_time",
      period: "monthly",
      note: " optional ",
    });
    expect(record.name).toBe("Desk");
    expect(record.period).toBeNull();
    expect(record.note).toBe("optional");
  });

  test("keeps period for subscription", () => {
    const record = createMoneyExpenseRecord({
      name: "Figma",
      kind: "subscription",
      period: "yearly",
      note: "",
    });
    expect(record.period).toBe("yearly");
    expect(moneyExpensePeriodLabel(record.period)).toBe("Yearly");
  });
});
