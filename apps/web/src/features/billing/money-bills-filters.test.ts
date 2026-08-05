import { describe, expect, test } from "bun:test";

import {
  moneyBillsActiveFilterSummary,
  moneyBillsEmptyCopy,
  moneyBillsStatusAllowed,
  moneyBillsStatusOptionsForParty,
} from "./money-bills-filters";

describe("moneyBillsStatusOptionsForParty", () => {
  test("all has no status chips", () => {
    expect(moneyBillsStatusOptionsForParty("all")).toEqual([]);
  });

  test("clients statuses in product order", () => {
    expect(moneyBillsStatusOptionsForParty("client").map((option) => option.id)).toEqual([
      "paid",
      "refunded",
      "partial",
      "outstanding",
    ]);
  });

  test("team and adjustments share status chips", () => {
    expect(moneyBillsStatusOptionsForParty("team").map((option) => option.id)).toEqual([
      "outstanding",
      "partial",
      "paid",
    ]);
    expect(moneyBillsStatusOptionsForParty("adjustments").map((option) => option.id)).toEqual([
      "outstanding",
      "partial",
      "paid",
    ]);
  });

  test("refunded only allowed on clients", () => {
    expect(moneyBillsStatusAllowed("client", "refunded")).toBe(true);
    expect(moneyBillsStatusAllowed("team", "refunded")).toBe(false);
    expect(moneyBillsStatusAllowed("adjustments", "partial")).toBe(true);
    expect(moneyBillsStatusAllowed("all", "paid")).toBe(false);
  });
});

describe("moneyBillsEmptyCopy", () => {
  test("default all + no status", () => {
    expect(moneyBillsEmptyCopy("all", null).title).toBe("No bills in this period");
  });

  test("party only", () => {
    expect(moneyBillsEmptyCopy("client", null).title).toBe("No client bills");
    expect(moneyBillsEmptyCopy("adjustments", null).title).toBe("No adjustments");
  });

  test("party + status", () => {
    expect(moneyBillsEmptyCopy("client", "outstanding").title).toBe("No outstanding client bills");
    expect(moneyBillsEmptyCopy("client", "refunded").title).toBe("No refunded client bills");
    expect(moneyBillsEmptyCopy("team", "paid").title).toBe("No paid team bills");
  });

  test("search overrides filter title", () => {
    expect(moneyBillsEmptyCopy("client", "paid", "acme").title).toBe("No matching bills");
    expect(moneyBillsEmptyCopy("client", "paid", "acme").body).toContain("acme");
  });
});

describe("moneyBillsActiveFilterSummary", () => {
  test("hides when all and no status", () => {
    expect(moneyBillsActiveFilterSummary("all", null)).toBeNull();
    expect(moneyBillsActiveFilterSummary("all", null, "external")).toBe("External");
  });

  test("composes party and status", () => {
    expect(moneyBillsActiveFilterSummary("client", null)).toBe("Clients");
    expect(moneyBillsActiveFilterSummary("client", null, "external")).toBe("Clients · External");
    expect(moneyBillsActiveFilterSummary("client", "refunded")).toBe("Clients · Refunded");
    expect(moneyBillsActiveFilterSummary("client", "refunded", "external")).toBe(
      "Clients · Refunded · External",
    );
    expect(moneyBillsActiveFilterSummary("team", "partial")).toBe("Team · Partial");
  });
});
