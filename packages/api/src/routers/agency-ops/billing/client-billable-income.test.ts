import { describe, expect, test } from "bun:test";

import {
  aggregateExternalBillableIncome,
  amountFromDurationAndRate,
  convertWinningBillableRate,
  priceClientInvoiceProjects,
  resolveEffectiveBillableRate,
  resolveEffectiveSourceBillableRate,
} from "./client-billable-income";

describe("amountFromDurationAndRate", () => {
  test("prices whole hours", () => {
    expect(amountFromDurationAndRate(3600, 10_000)).toBe(10_000);
  });
});

describe("resolveEffectiveBillableRate", () => {
  test("prefers task override over project and client", () => {
    expect(resolveEffectiveBillableRate(20_000, 12_000, 10_000)).toBe(20_000);
  });

  test("prefers project override when task is null", () => {
    expect(resolveEffectiveBillableRate(null, 12_000, 10_000)).toBe(12_000);
  });

  test("inherits client rate when task and project are null", () => {
    expect(resolveEffectiveBillableRate(null, null, 10_000)).toBe(10_000);
  });

  test("treats zero task override as inherit", () => {
    expect(resolveEffectiveBillableRate(0, null, 10_000)).toBe(10_000);
  });
});

describe("convertWinningBillableRate", () => {
  const usdEgp = [{ fromCurrency: "USD", toCurrency: "EGP", rate: "50.94" }];

  test("converts the winning USD source rate with period FX", () => {
    expect(
      convertWinningBillableRate(
        { billableRateAmount: null },
        { billableRateAmount: null },
        {
          billableRateAmount: 101_880,
          sourceBillableRateAmount: 2_000,
          currency: "USD",
        },
        "EGP",
        usdEgp,
      ),
    ).toBe(101_880);
  });

  test("uses a later FX for the same static USD source", () => {
    expect(
      convertWinningBillableRate(
        { billableRateAmount: null },
        { billableRateAmount: null },
        {
          billableRateAmount: 101_880,
          sourceBillableRateAmount: 2_000,
          currency: "USD",
        },
        "EGP",
        [{ fromCurrency: "USD", toCurrency: "EGP", rate: "51.2" }],
      ),
    ).toBe(102_400);
  });

  test("converts a task USD override instead of the client rate", () => {
    expect(
      convertWinningBillableRate(
        {
          billableRateAmount: 50_940,
          sourceBillableRateAmount: 2_500,
          currency: "USD",
        },
        { billableRateAmount: null },
        {
          billableRateAmount: 101_880,
          sourceBillableRateAmount: 2_000,
          currency: "USD",
        },
        "EGP",
        usdEgp,
      ),
    ).toBe(127_350);
  });

  test("skips FX when the winning source is already agency currency", () => {
    expect(
      convertWinningBillableRate(
        { billableRateAmount: null },
        { billableRateAmount: null },
        {
          billableRateAmount: 10_000,
          sourceBillableRateAmount: 10_000,
          currency: "EGP",
        },
        "EGP",
        usdEgp,
      ),
    ).toBe(10_000);
  });

  test("falls back to the stored agency amount when source is missing", () => {
    expect(
      convertWinningBillableRate(
        { billableRateAmount: null },
        { billableRateAmount: null },
        { billableRateAmount: 10_000 },
        "EGP",
        usdEgp,
      ),
    ).toBe(10_000);
  });
});

describe("resolveEffectiveSourceBillableRate", () => {
  test("returns source rate and currency from the winning catalog level", () => {
    expect(
      resolveEffectiveSourceBillableRate(
        { billableRateAmount: null },
        { billableRateAmount: null },
        {
          billableRateAmount: 101_880,
          sourceBillableRateAmount: 2_000,
          currency: "usd",
        },
      ),
    ).toEqual({ rateAmount: 2_000, currency: "USD" });
  });

  test("inherits client source when task override is zero", () => {
    expect(
      resolveEffectiveSourceBillableRate(
        { billableRateAmount: 0, sourceBillableRateAmount: 0, currency: "USD" },
        { billableRateAmount: null },
        {
          billableRateAmount: 101_880,
          sourceBillableRateAmount: 2_000,
          currency: "USD",
        },
      ),
    ).toEqual({ rateAmount: 2_000, currency: "USD" });
  });

  test("falls back to billable amount when source is zero", () => {
    expect(
      resolveEffectiveSourceBillableRate(
        { billableRateAmount: null },
        { billableRateAmount: null },
        {
          billableRateAmount: 10_000,
          sourceBillableRateAmount: 0,
          currency: "EGP",
        },
      ),
    ).toEqual({ rateAmount: 10_000, currency: "EGP" });
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
        taskRateAmount: null,
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
        taskRateAmount: null,
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
        taskRateAmount: null,
        projectRateAmount: null,
        clientRateAmount: 10_000,
      },
    ]);

    expect(result.billablePoolAmount).toBe(10_000);
    expect(result.clients).toHaveLength(2);
    const acme = result.clients.find((c) => c.clientId === "c1");
    expect(acme?.billableAmount).toBe(10_000);
    expect(acme?.sourceBillableAmount).toBe(10_000);
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
        taskRateAmount: null,
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
        taskRateAmount: null,
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
        taskRateAmount: null,
        projectRateAmount: null,
        clientRateAmount: 10_000,
      },
    ]);

    expect(result.billablePoolAmount).toBe(25_000);
    expect(result.clients[0]?.billableAmount).toBe(25_000);
  });

  test("uses task override within a project and inherits otherwise", () => {
    const result = aggregateExternalBillableIncome([
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        projectId: "p1",
        durationSeconds: 3600,
        isWaste: false,
        taskRateAmount: 20_000,
        projectRateAmount: 15_000,
        clientRateAmount: 10_000,
      },
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        projectId: "p1",
        durationSeconds: 3600,
        isWaste: false,
        taskRateAmount: null,
        projectRateAmount: 15_000,
        clientRateAmount: 10_000,
      },
    ]);

    expect(result.billablePoolAmount).toBe(35_000);
    expect(result.clients[0]?.billableAmount).toBe(35_000);
  });

  test("rounds once per client project rate bucket instead of once per time entry", () => {
    const result = aggregateExternalBillableIncome([
      {
        clientId: "c1",
        clientName: "Acme",
        category: "external",
        projectId: "p1",
        durationSeconds: 1,
        isWaste: false,
        taskRateAmount: null,
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
        taskRateAmount: null,
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

  test("coalesces one invoice line per project when task rates differ", () => {
    expect(
      priceClientInvoiceProjects(
        [
          {
            projectId: "p1",
            projectName: "Mixed",
            durationSeconds: 3600,
            isWaste: false,
            taskRateAmount: 20_000,
            projectRateAmount: 15_000,
          },
          {
            projectId: "p1",
            projectName: "Mixed",
            durationSeconds: 1800,
            isWaste: false,
            taskRateAmount: null,
            projectRateAmount: 15_000,
          },
        ],
        10_000,
      ),
    ).toEqual({
      ok: true,
      projects: [
        {
          projectId: "p1",
          projectName: "Mixed",
          durationSeconds: 5400,
          // Blended display rate: (20000 + 7500) / 1.5h
          rateAmount: 18_333,
          amount: 27_500,
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
