import { describe, expect, test } from "bun:test";

import { payoutAmountFromActivity } from "./payout-amount-from-activity";

describe("payoutAmountFromActivity", () => {
  test("one hour at $50/hr", () => {
    expect(payoutAmountFromActivity(3600, 5000)).toBe(5000);
  });

  test("rounds half hours", () => {
    expect(payoutAmountFromActivity(1800, 5000)).toBe(2500);
  });

  test("zero duration or rate yields zero", () => {
    expect(payoutAmountFromActivity(0, 5000)).toBe(0);
    expect(payoutAmountFromActivity(3600, 0)).toBe(0);
  });

  test("rejects negative inputs", () => {
    expect(() => payoutAmountFromActivity(-1, 5000)).toThrow();
    expect(() => payoutAmountFromActivity(3600, -1)).toThrow();
  });
});
