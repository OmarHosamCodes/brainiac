import { describe, expect, test } from "bun:test";

import { formatPeriodFxLockLabel } from "./money-period-fx-label";

describe("formatPeriodFxLockLabel", () => {
  test("formats snapshotted pairs", () => {
    expect(
      formatPeriodFxLockLabel([{ fromCurrency: "USD", toCurrency: "EGP", rate: "50.94" }]),
    ).toBe("USD→EGP 50.94 locked for this period");
  });

  test("joins multiple pairs", () => {
    expect(
      formatPeriodFxLockLabel([
        { fromCurrency: "USD", toCurrency: "EGP", rate: "50.94" },
        { fromCurrency: "EUR", toCurrency: "EGP", rate: "55" },
      ]),
    ).toBe("USD→EGP 50.94 · EUR→EGP 55 locked for this period");
  });

  test("returns null when nothing is locked", () => {
    expect(formatPeriodFxLockLabel([])).toBeNull();
  });
});
