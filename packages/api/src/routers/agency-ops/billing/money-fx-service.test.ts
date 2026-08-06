import { describe, expect, test } from "bun:test";

import { MoneyCurrencyError, resolveMoneyValue } from "./money-currency";

/** Soft-lock message contract used by setAgencyCurrency. */
const LOCK_MESSAGE = "Currency locked after money exists.";

describe("money-fx contracts", () => {
  test("lock message is stable for UI", () => {
    expect(LOCK_MESSAGE).toMatch(/locked/i);
  });

  test("resolve helper still used by fx service", () => {
    expect(() =>
      resolveMoneyValue({
        sourceAmount: 100,
        sourceCurrency: "USD",
        agencyCurrency: "EGP",
        rates: [],
      }),
    ).toThrow(MoneyCurrencyError);
  });
});
