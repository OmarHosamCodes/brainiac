import { describe, expect, test } from "bun:test";

import { catalogRateAmount, catalogWinningRate, previewConvertedRate } from "./format-rate";

describe("catalogRateAmount", () => {
  test("prefers the source amount", () => {
    expect(catalogRateAmount(2_000, 101_880)).toBe(2_000);
  });

  test("falls back to the agency amount", () => {
    expect(catalogRateAmount(null, 10_000)).toBe(10_000);
  });
});

describe("catalogWinningRate", () => {
  test("prefers the task source amount and currency", () => {
    expect(
      catalogWinningRate(
        { billableRateAmount: 50_940, sourceBillableRateAmount: 2_500, currency: "USD" },
        { billableRateAmount: 101_880, sourceBillableRateAmount: 2_000, currency: "USD" },
        { billableRateAmount: 10_000, sourceBillableRateAmount: 10_000, currency: "EGP" },
      ),
    ).toEqual({ amount: 2_500, currency: "USD" });
  });

  test("falls back to the client when overrides are unset", () => {
    expect(
      catalogWinningRate(
        { billableRateAmount: null },
        { billableRateAmount: null },
        { billableRateAmount: 101_880, sourceBillableRateAmount: 2_000, currency: "USD" },
      ),
    ).toEqual({ amount: 2_000, currency: "USD" });
  });
});

describe("previewConvertedRate", () => {
  test("converts USD to EGP with the current team FX", () => {
    expect(
      previewConvertedRate(2_000, "USD", "EGP", [
        { fromCurrency: "USD", toCurrency: "EGP", rate: "50.94" },
      ]),
    ).toBe(101_880);
  });

  test("returns null when the FX pair is missing", () => {
    expect(previewConvertedRate(2_000, "USD", "EGP", [])).toBeNull();
  });
});
