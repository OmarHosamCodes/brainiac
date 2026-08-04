import { describe, expect, test } from "bun:test";

import { payoutSectionKeysForBillsParty } from "./payout-section-keys";

describe("payoutSectionKeysForBillsParty", () => {
  test("team focuses salaries", () => {
    expect(payoutSectionKeysForBillsParty("team")).toEqual(["salaries"]);
  });

  test("adjustments maps debt/charity/pbc", () => {
    expect(payoutSectionKeysForBillsParty("adjustments")).toEqual([
      "debt_discount",
      "charity",
      "pbc",
    ]);
  });

  test("all returns null (no section filter)", () => {
    expect(payoutSectionKeysForBillsParty("all")).toBeNull();
  });
});
