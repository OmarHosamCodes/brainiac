import { describe, expect, test } from "bun:test";

import {
  aggregateExternalBillableIncome,
  amountFromDurationAndRate,
} from "./client-billable-income";

describe("amountFromDurationAndRate", () => {
  test("prices whole hours", () => {
    expect(amountFromDurationAndRate(3600, 10_000)).toBe(10_000);
  });
});

describe("aggregateExternalBillableIncome", () => {
  test("sums external non-waste into pool and keeps waste separate", () => {
    const result = aggregateExternalBillableIncome([
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        userId: "u1",
        durationSeconds: 3600,
        isWaste: false,
        billableRateAmount: 10_000,
      },
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        userId: "u1",
        durationSeconds: 1800,
        isWaste: true,
        billableRateAmount: 10_000,
      },
      {
        clientId: "c2",
        clientName: "Internal Ops",
        category: "internal",
        userId: "u1",
        durationSeconds: 3600,
        isWaste: false,
        billableRateAmount: 10_000,
      },
    ]);

    expect(result.billablePoolAmount).toBe(10_000);
    expect(result.clients).toHaveLength(2);
    const acme = result.clients.find((c) => c.clientId === "c1");
    expect(acme?.billableAmount).toBe(10_000);
    expect(acme?.wasteAmount).toBe(5_000);
    expect(acme?.durationSeconds).toBe(3600);
  });
});
