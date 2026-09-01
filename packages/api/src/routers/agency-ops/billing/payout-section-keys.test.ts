import { describe, expect, test } from "bun:test";

import { payoutSectionKeysForBillsParty } from "./payout-section-keys";

describe("payoutSectionKeysForBillsParty", () => {
  test("team lists salary-family sections", () => {
    expect(payoutSectionKeysForBillsParty("team")).toEqual([
      "salaries",
      "team_loss",
      "device_comp",
      "paid_vacation",
    ]);
  });

  test("adjustments maps debt/charity/pbc", () => {
    expect(payoutSectionKeysForBillsParty("adjustments")).toEqual([
      "debt_discount",
      "charity",
      "pbc",
      "extra",
    ]);
  });

  test("all returns null (no section filter)", () => {
    expect(payoutSectionKeysForBillsParty("all")).toBeNull();
  });
});
