import { describe, expect, test } from "bun:test";
import { ORPCError } from "@orpc/server";

import { nextInvoiceTotalsAfterDelta } from "./client-bill-adjustment";

describe("nextInvoiceTotalsAfterDelta", () => {
  test("surcharge raises amount and source", () => {
    expect(
      nextInvoiceTotalsAfterDelta(
        { amount: 10_000, sourceAmount: 10_000, receivedAmount: 0 },
        2_000,
      ),
    ).toEqual({ amount: 12_000, sourceAmount: 12_000 });
  });

  test("discount cannot drop the bill below zero", () => {
    expect(() =>
      nextInvoiceTotalsAfterDelta(
        { amount: 1_000, sourceAmount: 1_000, receivedAmount: 0 },
        -2_000,
      ),
    ).toThrow(ORPCError);
  });

  test("discount cannot leave received above the bill total", () => {
    expect(() =>
      nextInvoiceTotalsAfterDelta(
        { amount: 10_000, sourceAmount: 10_000, receivedAmount: 8_000 },
        -3_000,
      ),
    ).toThrow(ORPCError);
  });
});
