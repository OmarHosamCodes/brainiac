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
        costRateCents: 8_000,
      },
      {
        userId: "u1",
        userName: "Ada",
        userAvatar: "https://img/a.png",
        durationSeconds: 1800,
        isWaste: true,
        costRateCents: 8_000,
      },
    ]);
    expect(items).toEqual([
      {
        userId: "u1",
        userName: "Ada",
        userAvatar: "https://img/a.png",
        durationSeconds: 3600,
        payableCents: 8_000,
        wasteCents: 4_000,
      },
    ]);
  });
});
