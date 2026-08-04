import { describe, expect, test } from "bun:test";

import { invoicePeriodTotalsFromRows } from "./invoice-period-totals";

describe("invoicePeriodTotalsFromRows", () => {
  test("sums billed/received/remaining and excludes refunded", () => {
    const totals = invoicePeriodTotalsFromRows([
      { status: "sent", amountCents: 10_000, receivedCents: 0, currency: "USD" },
      { status: "partial", amountCents: 5_000, receivedCents: 2_000, currency: "USD" },
      { status: "paid", amountCents: 3_000, receivedCents: 3_000, currency: "USD" },
      { status: "refunded", amountCents: 9_000, receivedCents: 9_000, currency: "USD" },
    ]);
    expect(totals.billedCents).toBe(18_000);
    expect(totals.receivedCents).toBe(5_000);
    expect(totals.remainingCents).toBe(13_000);
    expect(totals.currency).toBe("USD");
  });

  test("picks dominant currency", () => {
    const totals = invoicePeriodTotalsFromRows([
      { status: "sent", amountCents: 100, receivedCents: 0, currency: "USD" },
      { status: "sent", amountCents: 50_000, receivedCents: 0, currency: "EGP" },
    ]);
    expect(totals.currency).toBe("EGP");
  });
});
