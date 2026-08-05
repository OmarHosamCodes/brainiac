import { describe, expect, test } from "bun:test";

import {
  allocationFromInvoice,
  allocationFromPayout,
  allocationFromReadyClient,
  allocationFromReadyMember,
  buildMoneyBillAllocation,
} from "./money-bill-allocation";

describe("buildMoneyBillAllocation", () => {
  test("ready client is fully uninvoiced", () => {
    const view = allocationFromReadyClient({
      billableCents: 64_500_00,
      wasteCents: 8_100_00,
      currency: "EGP",
    });
    expect(view.uninvoicedCents).toBe(64_500_00);
    expect(view.segments).toEqual([{ id: "uninvoiced", percent: 100 }]);
    expect(view.wasteCents).toBe(8_100_00);
    expect(view.receivedTitle).toBe("Received");
  });

  test("invoice splits received and remaining", () => {
    const view = allocationFromInvoice({
      amountCents: 80_000_00,
      receivedCents: 50_000_00,
      remainingCents: 30_000_00,
      wasteCents: 3_600_00,
      currency: "EGP",
    });
    expect(view.uninvoicedCents).toBe(0);
    expect(view.segments).toEqual([
      { id: "received", percent: 62.5 },
      { id: "remaining", percent: 37.5 },
    ]);
  });

  test("ready member uses Paid/Ready vocabulary", () => {
    const view = allocationFromReadyMember({
      payableCents: 12_000_00,
      wasteCents: 1_000_00,
      currency: "EGP",
    });
    expect(view.receivedTitle).toBe("Paid");
    expect(view.uninvoicedTitle).toBe("Ready");
    expect(view.segments).toEqual([{ id: "uninvoiced", percent: 100 }]);
  });

  test("payout splits paid and remaining", () => {
    const view = allocationFromPayout({
      amountCents: 10_000_00,
      paidCents: 4_000_00,
      remainingCents: 6_000_00,
      wasteCents: 500_00,
      currency: "EGP",
    });
    expect(view.segments).toEqual([
      { id: "received", percent: 40 },
      { id: "remaining", percent: 60 },
    ]);
  });

  test("zero total yields no segments", () => {
    expect(
      buildMoneyBillAllocation({
        totalCents: 0,
        receivedCents: 0,
        remainingCents: 0,
        uninvoicedCents: 0,
        wasteCents: 0,
        currency: "USD",
      }).segments,
    ).toEqual([]);
  });
});
