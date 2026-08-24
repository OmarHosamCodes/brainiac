import { describe, expect, test } from "bun:test";

import { buildPeriodScoreboard } from "./period-scoreboard";

const base = {
  salariesDueAmount: 30_000,
  expensesAmount: 10_000,
  debtDiscountAmount: 5_000,
  paidVacationAmount: 5_000,
  deviceCompAmount: 1_000,
  charityAmount: 500,
  pbcAmount: 250,
  teamLossAmount: 2_000,
  currency: "USD",
} as const;

describe("buildPeriodScoreboard", () => {
  test("total includes uninvoiced billable; remaining is invoiced unpaid", () => {
    const board = buildPeriodScoreboard({
      ...base,
      billablePoolAmount: 100_000,
      receivedAmount: 40_000,
      invoicedRemainingAmount: 20_000,
    });
    // Uninvoiced 40k lives inside total; remaining is not total − received.
    expect(board.totalIncomeAmount).toBe(100_000);
    expect(board.remainingAmount).toBe(20_000);
    expect(board.teamProfitAmount).toBe(49_000);
    expect(board.roi).toBeCloseTo(49_000 / 51_000);
    expect(board.profitLossShareAmount).toBe(2_000);
  });

  test("over-invoice raises total to received + remaining", () => {
    const board = buildPeriodScoreboard({
      ...base,
      billablePoolAmount: 10_000,
      receivedAmount: 40_000,
      invoicedRemainingAmount: 20_000,
    });
    expect(board.totalIncomeAmount).toBe(60_000);
    expect(board.remainingAmount).toBe(20_000);
  });

  test("roi is 0 when income is 0", () => {
    const board = buildPeriodScoreboard({
      ...base,
      billablePoolAmount: 0,
      receivedAmount: 0,
      invoicedRemainingAmount: 0,
      salariesDueAmount: 0,
      expensesAmount: 0,
      debtDiscountAmount: 0,
      paidVacationAmount: 0,
      deviceCompAmount: 0,
      charityAmount: 0,
      pbcAmount: 0,
      teamLossAmount: 0,
    });
    expect(board.roi).toBe(0);
  });
});
