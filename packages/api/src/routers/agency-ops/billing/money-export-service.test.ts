import { describe, expect, test } from "bun:test";

import { applyPendingAdjustmentCents } from "./money-bill-carry";

describe("applyPendingAdjustmentCents", () => {
  test("discount reduces base", () => {
    expect(applyPendingAdjustmentCents(10_000, [{ kind: "discount", amountCents: 1_500 }])).toBe(
      8_500,
    );
  });

  test("surcharge and debt increase base", () => {
    expect(
      applyPendingAdjustmentCents(10_000, [
        { kind: "surcharge", amountCents: 500 },
        { kind: "debt", amountCents: 2_000 },
      ]),
    ).toBe(12_500);
  });

  test("discount floors at zero", () => {
    expect(applyPendingAdjustmentCents(1_000, [{ kind: "discount", amountCents: 5_000 }])).toBe(0);
  });

  test("empty adjustments leave base unchanged", () => {
    expect(applyPendingAdjustmentCents(4_200, [])).toBe(4_200);
  });
});
