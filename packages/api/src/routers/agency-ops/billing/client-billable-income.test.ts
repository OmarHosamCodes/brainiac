import { describe, expect, test } from "bun:test";

import {
  aggregateExternalBillableIncome,
  amountCentsFromDurationAndRate,
} from "./client-billable-income";

describe("amountCentsFromDurationAndRate", () => {
  test("prices whole hours", () => {
    expect(amountCentsFromDurationAndRate(3600, 10_000)).toBe(10_000);
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
        billableRateCents: 10_000,
      },
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        userId: "u1",
        durationSeconds: 1800,
        isWaste: true,
        billableRateCents: 10_000,
      },
      {
        clientId: "c2",
        clientName: "Internal Ops",
        category: "internal",
        userId: "u1",
        durationSeconds: 3600,
        isWaste: false,
        billableRateCents: 10_000,
      },
    ]);

    expect(result.billablePoolCents).toBe(10_000);
    expect(result.clients).toHaveLength(2);
    const acme = result.clients.find((c) => c.clientId === "c1");
    expect(acme?.billableCents).toBe(10_000);
    expect(acme?.wasteCents).toBe(5_000);
    expect(acme?.durationSeconds).toBe(3600);
  });
});
