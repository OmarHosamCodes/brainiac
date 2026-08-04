import { describe, expect, test } from "bun:test";

import {
  advanceExpenseNextDueAt,
  defaultExpenseNextDueAt,
  expenseRemainingCents,
  expenseStatusAfterPaid,
} from "./expense-helpers";

describe("expenseRemainingCents", () => {
  test("clamps at zero", () => {
    expect(expenseRemainingCents(1000, 250)).toBe(750);
    expect(expenseRemainingCents(1000, 1000)).toBe(0);
    expect(expenseRemainingCents(1000, 1200)).toBe(0);
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
