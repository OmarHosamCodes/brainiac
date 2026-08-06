import { describe, expect, test } from "bun:test";

import { buildMoneyStatsCards, amountToMajor } from "./money-stats-live";

describe("amountToMajor", () => {
  test("divides by 100", () => {
    expect(amountToMajor(12_500)).toBe(125);
  });
});

describe("buildMoneyStatsCards", () => {
  test("overrides income + salaries as live, leaves others fixture", () => {
    const cards = buildMoneyStatsCards({
      currency: "USD",
      metrics: {
        "total-income": 100,
        received: 40,
        remaining: 60,
        salaries: 25,
      },
      sources: {
        "total-income": "live",
        received: "live",
        remaining: "live",
        salaries: "live",
      },
    });

    const income = cards.find((card) => card.id === "income-cash")!;
    expect(income.currency).toBe("USD");
    expect(income.metrics.find((m) => m.id === "total-income")?.amount).toBe(100);
    expect(income.metrics.find((m) => m.id === "total-income")?.source).toBe("live");

    const deductions = cards.find((card) => card.id === "deductions")!;
    expect(deductions.metrics.find((m) => m.id === "salaries")?.amount).toBe(25);
    expect(deductions.metrics.find((m) => m.id === "salaries")?.source).toBe("live");
    expect(deductions.metrics.find((m) => m.id === "expenses")?.source).toBe("fixture");
  });
});
