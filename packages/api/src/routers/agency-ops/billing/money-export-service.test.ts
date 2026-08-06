import { describe, expect, test } from "bun:test";

import { applyPendingAdjustmentAmount } from "./money-bill-carry";

describe("applyPendingAdjustmentAmount", () => {
  test("discount reduces base", () => {
    expect(applyPendingAdjustmentAmount(10_000, [{ kind: "discount", amount: 1_500 }])).toBe(8_500);
  });

  test("surcharge and debt increase base", () => {
    expect(
      applyPendingAdjustmentAmount(10_000, [
        { kind: "surcharge", amount: 500 },
        { kind: "debt", amount: 2_000 },
      ]),
    ).toBe(12_500);
  });

  test("discount floors at zero", () => {
    expect(applyPendingAdjustmentAmount(1_000, [{ kind: "discount", amount: 5_000 }])).toBe(0);
  });

  test("empty adjustments leave base unchanged", () => {
    expect(applyPendingAdjustmentAmount(4_200, [])).toBe(4_200);
  });
});
