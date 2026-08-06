import { describe, expect, test } from "bun:test";

import {
  amountToMajor,
  lookupFxMultiplier,
  majorToAmount,
  MoneyCurrencyError,
  normalizeCurrencyCode,
  resolveMoneyValue,
} from "./money-currency";

describe("money-currency", () => {
  test("normalizeCurrencyCode uppercases", () => {
    expect(normalizeCurrencyCode(" egp ")).toBe("EGP");
  });

  test("majorToAmount / amountToMajor round trip", () => {
    expect(majorToAmount(12.5)).toBe(1250);
    expect(amountToMajor(1250)).toBe(12.5);
    expect(majorToAmount(12.505)).toBe(1251);
  });

  test("same currency resolves 1:1", () => {
    const resolved = resolveMoneyValue({
      sourceAmount: 10_000,
      sourceCurrency: "EGP",
      agencyCurrency: "EGP",
      rates: [],
      asOf: "2026-08-06T00:00:00.000Z",
    });
    expect(resolved).toEqual({
      sourceAmount: 10_000,
      sourceCurrency: "EGP",
      amount: 10_000,
      fxRate: "1",
      fxAsOf: "2026-08-06T00:00:00.000Z",
    });
  });

  test("direct FX multiplies and rounds", () => {
    const resolved = resolveMoneyValue({
      sourceAmount: 100, // $1.00
      sourceCurrency: "USD",
      agencyCurrency: "EGP",
      rates: [{ fromCurrency: "USD", toCurrency: "EGP", rate: "50.2" }],
      asOf: "2026-08-06T00:00:00.000Z",
    });
    expect(resolved.amount).toBe(5020);
    expect(resolved.fxRate).toBe("50.2");
    expect(resolved.sourceAmount).toBe(100);
    expect(resolved.sourceCurrency).toBe("USD");
  });

  test("inverse FX uses 1/rate", () => {
    const mult = lookupFxMultiplier(
      [{ fromCurrency: "EGP", toCurrency: "USD", rate: "0.02" }],
      "USD",
      "EGP",
    );
    expect(mult).toBe("50");
    const resolved = resolveMoneyValue({
      sourceAmount: 100,
      sourceCurrency: "USD",
      agencyCurrency: "EGP",
      rates: [{ fromCurrency: "EGP", toCurrency: "USD", rate: "0.02" }],
      asOf: "2026-08-06T00:00:00.000Z",
    });
    expect(resolved.amount).toBe(5000);
  });

  test("missing FX throws MoneyCurrencyError", () => {
    expect(() =>
      resolveMoneyValue({
        sourceAmount: 100,
        sourceCurrency: "USD",
        agencyCurrency: "EGP",
        rates: [],
      }),
    ).toThrow(MoneyCurrencyError);
    expect(() =>
      resolveMoneyValue({
        sourceAmount: 100,
        sourceCurrency: "USD",
        agencyCurrency: "EGP",
        rates: [],
      }),
    ).toThrow(/Add an FX rate for USD→EGP/);
  });

  test("non-integer sourceAmount rejected", () => {
    expect(() =>
      resolveMoneyValue({
        sourceAmount: 10.5,
        sourceCurrency: "EGP",
        agencyCurrency: "EGP",
        rates: [],
      }),
    ).toThrow(/integer/);
  });
});
