import { describe, expect, test } from "bun:test";

import { buildPeriodScoreboard } from "./period-scoreboard";

const base = {
  salariesDueCents: 30_000,
  expensesAmountCents: 10_000,
  debtDiscountCents: 5_000,
  paidVacationCents: 5_000,
  deviceCompCents: 1_000,
  charityCents: 500,
  pbcCents: 250,
  teamLossCents: 2_000,
  currency: "USD",
} as const;

describe("buildPeriodScoreboard", () => {
  test("total includes uninvoiced billable; remaining is invoiced unpaid", () => {
    const board = buildPeriodScoreboard({
      ...base,
      billablePoolCents: 100_000,
      receivedCents: 40_000,
      invoicedRemainingCents: 20_000,
    });
    // Uninvoiced 40k lives inside total; remaining is not total − received.
    expect(board.totalIncomeCents).toBe(100_000);
    expect(board.remainingCents).toBe(20_000);
    expect(board.teamProfitCents).toBe(50_000);
    expect(board.roi).toBe(0.5);
    expect(board.profitLossShareCents).toBe(2_000);
  });

  test("over-invoice raises total to received + remaining", () => {
    const board = buildPeriodScoreboard({
      ...base,
      billablePoolCents: 10_000,
      receivedCents: 40_000,
      invoicedRemainingCents: 20_000,
    });
    expect(board.totalIncomeCents).toBe(60_000);
    expect(board.remainingCents).toBe(20_000);
  });

  test("roi is 0 when income is 0", () => {
    const board = buildPeriodScoreboard({
      ...base,
      billablePoolCents: 0,
      receivedCents: 0,
      invoicedRemainingCents: 0,
      salariesDueCents: 0,
      expensesAmountCents: 0,
      debtDiscountCents: 0,
      paidVacationCents: 0,
      deviceCompCents: 0,
      charityCents: 0,
      pbcCents: 0,
      teamLossCents: 0,
    });
    expect(board.roi).toBe(0);
  });
});
