import { describe, expect, test } from "bun:test";

import { moneyStatsMetricDestination, moneyStatsPlateMeta } from "./money-stats-plate-meta";

describe("moneyStatsPlateMeta", () => {
  test("maps income plate", () => {
    expect(moneyStatsPlateMeta("income-cash")).toEqual({
      shortTitle: "Income",
      destinationHint: "Client bills",
    });
  });

  test("maps profitability plate", () => {
    expect(moneyStatsPlateMeta("profitability").destinationHint).toBe("Adjustments");
  });
});

describe("moneyStatsMetricDestination", () => {
  test("names the exact drill-down destination", () => {
    expect(moneyStatsMetricDestination("received")).toBe("paid client bills");
    expect(moneyStatsMetricDestination("expenses")).toBe("expenses");
    expect(moneyStatsMetricDestination("profit-loss-share")).toBe("Money formulas");
  });
});
