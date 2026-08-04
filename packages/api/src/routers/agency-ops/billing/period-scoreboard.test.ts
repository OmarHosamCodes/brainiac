import { describe, expect, test } from "bun:test";

import { buildPeriodScoreboard } from "./period-scoreboard";

describe("buildPeriodScoreboard", () => {
  test("computes profitability and roi", () => {
    const board = buildPeriodScoreboard({
      billedCents: 100_000,
      receivedCents: 40_000,
      salariesDueCents: 30_000,
      expensesAmountCents: 10_000,
      debtDiscountCents: 5_000,
      paidVacationCents: 5_000,
      deviceCompCents: 1_000,
      charityCents: 500,
      pbcCents: 250,
      teamLossCents: 2_000,
      currency: "USD",
    });
    expect(board.remainingCents).toBe(60_000);
    expect(board.teamProfitCents).toBe(50_000);
    expect(board.roi).toBe(0.5);
    expect(board.profitLossShareCents).toBe(2_000);
  });

  test("roi is 0 when income is 0", () => {
    const board = buildPeriodScoreboard({
      billedCents: 0,
      receivedCents: 0,
      salariesDueCents: 0,
      expensesAmountCents: 0,
      debtDiscountCents: 0,
      paidVacationCents: 0,
      deviceCompCents: 0,
      charityCents: 0,
      pbcCents: 0,
      teamLossCents: 0,
      currency: "USD",
    });
    expect(board.roi).toBe(0);
  });
});
