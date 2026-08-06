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
      billableAmount: 64_500_00,
      wasteAmount: 8_100_00,
      currency: "EGP",
    });
    expect(view.uninvoicedCents).toBe(64_500_00);
    expect(view.segments).toEqual([{ id: "uninvoiced", percent: 100 }]);
    expect(view.wasteAmount).toBe(8_100_00);
    expect(view.presentation).toBe("activity");
    expect(view.uninvoicedTitle).toBe("Billable");
    expect(view.showWaste).toBe(true);
    expect(view.ariaLabel).toContain("Billable");
  });

  test("invoice splits received and remaining", () => {
    const view = allocationFromInvoice({
      amount: 80_000_00,
      receivedAmount: 50_000_00,
      remainingAmount: 30_000_00,
      wasteAmount: 3_600_00,
      currency: "EGP",
    });
    expect(view.uninvoicedCents).toBe(0);
    expect(view.segments).toEqual([
      { id: "received", percent: 62.5 },
      { id: "remaining", percent: 37.5 },
    ]);
  });

  test("ready member uses payable activity vocabulary", () => {
    const view = allocationFromReadyMember({
      payableAmount: 12_000_00,
      wasteAmount: 1_000_00,
      currency: "EGP",
    });
    expect(view.presentation).toBe("activity");
    expect(view.uninvoicedTitle).toBe("Payable");
    expect(view.segments).toEqual([{ id: "uninvoiced", percent: 100 }]);
  });

  test("payout splits paid and remaining", () => {
    const view = allocationFromPayout({
      amount: 10_000_00,
      paidAmount: 4_000_00,
      remainingAmount: 6_000_00,
      wasteAmount: 500_00,
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
        receivedAmount: 0,
        remainingAmount: 0,
        uninvoicedCents: 0,
        wasteAmount: 0,
        currency: "USD",
      }).segments,
    ).toEqual([]);
  });

  test("document allocation hides an empty waste label", () => {
    const view = allocationFromInvoice({
      amount: 10_000,
      receivedAmount: 0,
      remainingAmount: 10_000,
      wasteAmount: 0,
      currency: "USD",
    });
    expect(view.presentation).toBe("document");
    expect(view.showWaste).toBe(false);
    expect(view.ariaLabel).not.toContain("waste");
  });
});
