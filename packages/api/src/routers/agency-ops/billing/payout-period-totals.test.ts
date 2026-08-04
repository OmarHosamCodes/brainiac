import { describe, expect, test } from "bun:test";

import { payoutSalariesTotalsFromRows } from "./payout-period-totals";

describe("payoutSalariesTotalsFromRows", () => {
  test("sums due/paid/remaining", () => {
    const totals = payoutSalariesTotalsFromRows([
      { amountCents: 10_000, paidCents: 2_500, currency: "USD" },
      { amountCents: 4_000, paidCents: 4_000, currency: "USD" },
    ]);
    expect(totals.salariesDueCents).toBe(14_000);
    expect(totals.salariesPaidCents).toBe(6_500);
    expect(totals.salariesRemainingCents).toBe(7_500);
    expect(totals.currency).toBe("USD");
  });
});
