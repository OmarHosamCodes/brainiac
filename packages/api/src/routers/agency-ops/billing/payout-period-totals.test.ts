import { describe, expect, test } from "bun:test";

import { payoutSalariesTotalsFromRows } from "./payout-period-totals";

describe("payoutSalariesTotalsFromRows", () => {
  test("sums due/paid/remaining", () => {
    const totals = payoutSalariesTotalsFromRows([
      { amount: 10_000, paidAmount: 2_500, currency: "USD" },
      { amount: 4_000, paidAmount: 4_000, currency: "USD" },
    ]);
    expect(totals.salariesDueAmount).toBe(14_000);
    expect(totals.salariesPaidAmount).toBe(6_500);
    expect(totals.salariesRemainingAmount).toBe(7_500);
    expect(totals.currency).toBe("USD");
  });
});
