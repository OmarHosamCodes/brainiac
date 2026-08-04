import { describe, expect, test } from "bun:test";

import { payoutAmountCentsFromActivity } from "./payout-amount-from-activity";

describe("payoutAmountCentsFromActivity", () => {
  test("one hour at $50/hr", () => {
    expect(payoutAmountCentsFromActivity(3600, 5000)).toBe(5000);
  });

  test("rounds half hours", () => {
    expect(payoutAmountCentsFromActivity(1800, 5000)).toBe(2500);
  });

  test("zero duration or rate yields zero", () => {
    expect(payoutAmountCentsFromActivity(0, 5000)).toBe(0);
    expect(payoutAmountCentsFromActivity(3600, 0)).toBe(0);
  });

  test("rejects negative inputs", () => {
    expect(() => payoutAmountCentsFromActivity(-1, 5000)).toThrow();
    expect(() => payoutAmountCentsFromActivity(3600, -1)).toThrow();
  });
});
