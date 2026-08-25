import { describe, expect, test } from "bun:test";

import { moneyStatsPlateMeta } from "./money-stats-plate-meta";

describe("moneyStatsPlateMeta", () => {
  test("maps income plate", () => {
    expect(moneyStatsPlateMeta("income-cash")).toEqual({
      shortTitle: "Income",
      destinationHint: "Client bills",
      tone: "info",
    });
  });

  test("maps profitability plate", () => {
    expect(moneyStatsPlateMeta("profitability").destinationHint).toBe("Adjustments");
  });
});
