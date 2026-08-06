import { describe, expect, test } from "bun:test";

import { resolveMoneyValue } from "./money-currency";

describe("loadMoneyResolveContext contracts", () => {
  test("same-currency resolve stays identity", () => {
    const resolved = resolveMoneyValue({
      sourceAmount: 2500,
      sourceCurrency: "EGP",
      agencyCurrency: "EGP",
      rates: [],
      asOf: "2026-08-06T00:00:00.000Z",
    });
    expect(resolved.amount).toBe(2500);
    expect(resolved.fxRate).toBe("1");
  });

  test("foreign resolve uses provided rate", () => {
    const resolved = resolveMoneyValue({
      sourceAmount: 100,
      sourceCurrency: "USD",
      agencyCurrency: "EGP",
      rates: [{ fromCurrency: "USD", toCurrency: "EGP", rate: "49.5" }],
      asOf: "2026-08-06T00:00:00.000Z",
    });
    expect(resolved.amount).toBe(4950);
  });
});
