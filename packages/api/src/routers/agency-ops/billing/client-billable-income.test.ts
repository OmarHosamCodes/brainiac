import { describe, expect, test } from "bun:test";

import {
  aggregateExternalBillableIncome,
  amountFromDurationAndRate,
  priceClientInvoiceProjects,
  resolveEffectiveBillableRate,
} from "./client-billable-income";

describe("amountFromDurationAndRate", () => {
  test("prices whole hours", () => {
    expect(amountFromDurationAndRate(3600, 10_000)).toBe(10_000);
  });
});

describe("resolveEffectiveBillableRate", () => {
  test("prefers project override", () => {
    expect(resolveEffectiveBillableRate(12_000, 10_000)).toBe(12_000);
  });

  test("inherits client rate when project override is null", () => {
    expect(resolveEffectiveBillableRate(null, 10_000)).toBe(10_000);
  });
});

describe("aggregateExternalBillableIncome", () => {
  test("sums external non-waste into pool and keeps waste separate", () => {
    const result = aggregateExternalBillableIncome([
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        projectId: "p1",
        durationSeconds: 3600,
        isWaste: false,
        projectRateAmount: null,
        clientRateAmount: 10_000,
      },
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        projectId: "p1",
        durationSeconds: 1800,
        isWaste: true,
        projectRateAmount: null,
        clientRateAmount: 10_000,
      },
      {
        clientId: "c2",
        clientName: "Internal Ops",
        category: "internal",
        projectId: "p2",
        durationSeconds: 3600,
        isWaste: false,
        projectRateAmount: null,
        clientRateAmount: 10_000,
      },
    ]);

    expect(result.billablePoolAmount).toBe(10_000);
    expect(result.clients).toHaveLength(2);
    const acme = result.clients.find((c) => c.clientId === "c1");
    expect(acme?.billableAmount).toBe(10_000);
    expect(acme?.wasteAmount).toBe(5_000);
    expect(acme?.durationSeconds).toBe(3600);
  });

  test("routes pre-resolved task or project waste to wasteAmount", () => {
    const result = aggregateExternalBillableIncome([
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        projectId: "p1",
        durationSeconds: 3600,
        isWaste: true,
        projectRateAmount: null,
        clientRateAmount: 10_000,
      },
    ]);

    expect(result.billablePoolAmount).toBe(0);
    expect(result.clients[0]?.billableAmount).toBe(0);
    expect(result.clients[0]?.wasteAmount).toBe(10_000);
    expect(result.clients[0]?.durationSeconds).toBe(0);
  });

  test("uses project override when set on one project and client rate on another", () => {
    const result = aggregateExternalBillableIncome([
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        projectId: "premium",
        durationSeconds: 3600,
        isWaste: false,
        projectRateAmount: 15_000,
        clientRateAmount: 10_000,
      },
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        projectId: "standard",
        durationSeconds: 3600,
        isWaste: false,
        projectRateAmount: null,
        clientRateAmount: 10_000,
      },
    ]);

    expect(result.billablePoolAmount).toBe(25_000);
    expect(result.clients[0]?.billableAmount).toBe(25_000);
  });

  test("rounds once per client project instead of once per time entry", () => {
    const result = aggregateExternalBillableIncome([
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        projectId: "p1",
        durationSeconds: 1,
        isWaste: false,
        projectRateAmount: null,
        clientRateAmount: 1_800,
      },
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        projectId: "p1",
        durationSeconds: 1,
        isWaste: false,
        projectRateAmount: null,
        clientRateAmount: 1_800,
      },
    ]);

    expect(result.billablePoolAmount).toBe(1);
    expect(result.clients[0]?.billableAmount).toBe(1);
  });
});

describe("priceClientInvoiceProjects", () => {
  test("uses project override when set and client rate otherwise", () => {
    expect(
      priceClientInvoiceProjects(
        [
          {
            projectId: "p1",
            projectName: "Premium",
            durationSeconds: 3600,
            isWaste: false,
            projectRateAmount: 15_000,
          },
          {
            projectId: "p2",
            projectName: "Standard",
            durationSeconds: 1800,
            isWaste: false,
            projectRateAmount: null,
          },
        ],
        10_000,
      ),
    ).toEqual({
      ok: true,
      projects: [
        {
          projectId: "p1",
          projectName: "Premium",
          durationSeconds: 3600,
          rateAmount: 15_000,
          amount: 15_000,
        },
        {
          projectId: "p2",
          projectName: "Standard",
          durationSeconds: 1800,
          rateAmount: 10_000,
          amount: 5_000,
        },
      ],
    });
  });

  test("excludes waste and uses one rate per project", () => {
    expect(
      priceClientInvoiceProjects(
        [
          {
            projectId: "p1",
            projectName: "Project one",
            durationSeconds: 3600,
            isWaste: false,
          },
          {
            projectId: "p1",
            projectName: "Project one",
            durationSeconds: 3600,
            isWaste: true,
          },
        ],
        10_000,
      ),
    ).toEqual({
      ok: true,
      projects: [
        {
          projectId: "p1",
          projectName: "Project one",
          durationSeconds: 3600,
          rateAmount: 10_000,
          amount: 10_000,
        },
      ],
    });
  });

  test("requires a resolvable rate when billable time exists", () => {
    expect(
      priceClientInvoiceProjects(
        [
          {
            projectId: "p1",
            projectName: "Project one",
            durationSeconds: 3600,
            isWaste: false,
            projectRateAmount: null,
          },
        ],
        null,
      ),
    ).toEqual({ ok: false, reason: "missing_client_rate" });
  });
});
