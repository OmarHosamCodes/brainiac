import { describe, expect, test } from "bun:test";

import { missingPeriodFxPairs, periodFxApplyBlockedMessage } from "./money-period-fx";

describe("missingPeriodFxPairs", () => {
  test("copies pairs the snapshot does not have", () => {
    expect(
      missingPeriodFxPairs(
        [
          { fromCurrency: "USD", toCurrency: "EGP", rate: "50.94" },
          { fromCurrency: "EUR", toCurrency: "EGP", rate: "55" },
        ],
        [{ fromCurrency: "USD", toCurrency: "EGP", rate: "50.94" }],
      ),
    ).toEqual([{ fromCurrency: "EUR", toCurrency: "EGP", rate: "55" }]);
  });

  test("does not replace an existing snapshot pair when current FX changed", () => {
    expect(
      missingPeriodFxPairs(
        [{ fromCurrency: "USD", toCurrency: "EGP", rate: "51.2" }],
        [{ fromCurrency: "USD", toCurrency: "EGP", rate: "50.94" }],
      ),
    ).toEqual([]);
  });

  test("treats inverse-cased codes as the same pair", () => {
    expect(
      missingPeriodFxPairs(
        [{ fromCurrency: "usd", toCurrency: "egp", rate: "50.94" }],
        [{ fromCurrency: "USD", toCurrency: "EGP", rate: "50.94" }],
      ),
    ).toEqual([]);
  });
});

describe("periodFxApplyBlockedMessage", () => {
  test("blocks refresh after invoices exist", () => {
    expect(periodFxApplyBlockedMessage(true)).toBe(
      "Can't update this period's FX after invoices exist.",
    );
    expect(periodFxApplyBlockedMessage(false)).toBeNull();
  });
});
