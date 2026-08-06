import { describe, expect, test } from "bun:test";

import { invoicePeriodTotalsFromRows } from "./invoice-period-totals";

describe("invoicePeriodTotalsFromRows", () => {
  test("sums billed/received/remaining and excludes refunded", () => {
    const totals = invoicePeriodTotalsFromRows([
      { status: "sent", amount: 10_000, receivedAmount: 0, currency: "USD" },
      { status: "partial", amount: 5_000, receivedAmount: 2_000, currency: "USD" },
      { status: "paid", amount: 3_000, receivedAmount: 3_000, currency: "USD" },
      { status: "refunded", amount: 9_000, receivedAmount: 9_000, currency: "USD" },
    ]);
    expect(totals.billedAmount).toBe(18_000);
    expect(totals.receivedAmount).toBe(5_000);
    expect(totals.remainingAmount).toBe(13_000);
    expect(totals.currency).toBe("USD");
  });

  test("picks dominant currency", () => {
    const totals = invoicePeriodTotalsFromRows([
      { status: "sent", amount: 100, receivedAmount: 0, currency: "USD" },
      { status: "sent", amount: 50_000, receivedAmount: 0, currency: "EGP" },
    ]);
    expect(totals.currency).toBe("EGP");
  });
});
