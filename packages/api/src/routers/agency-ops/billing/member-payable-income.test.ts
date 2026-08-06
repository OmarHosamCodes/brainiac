import { describe, expect, test } from "bun:test";

import { aggregateMemberPayableIncome } from "./member-payable-income";

describe("aggregateMemberPayableIncome", () => {
  test("sums non-waste payable and keeps waste separate", () => {
    const items = aggregateMemberPayableIncome([
      {
        userId: "u1",
        userName: "Ada",
        userAvatar: null,
        durationSeconds: 3600,
        isWaste: false,
        costRateAmount: 8_000,
      },
      {
        userId: "u1",
        userName: "Ada",
        userAvatar: "https://img/a.png",
        durationSeconds: 1800,
        isWaste: true,
        costRateAmount: 8_000,
      },
    ]);
    expect(items).toEqual([
      {
        userId: "u1",
        userName: "Ada",
        userAvatar: "https://img/a.png",
        durationSeconds: 3600,
        payableAmount: 8_000,
        wasteAmount: 4_000,
      },
    ]);
  });
});
