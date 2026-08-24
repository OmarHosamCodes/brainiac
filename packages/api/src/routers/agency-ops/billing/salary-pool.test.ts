import { describe, expect, test } from "bun:test";

import {
  nextMemberPaidAmount,
  periodHasRateDerivedSalaryLines,
  salaryPoolPaidTotal,
  salaryPoolRemaining,
  salaryPoolTotalsFromPool,
  validateSalaryMemberPayment,
  validateSalaryPoolCreateAllowed,
  validateSalaryPoolTotalUpdate,
} from "./salary-pool";

describe("salaryPoolPaidTotal", () => {
  test("sums member paid amounts", () => {
    expect(
      salaryPoolPaidTotal([{ paidAmount: 5_000 }, { paidAmount: 2_500 }, { paidAmount: 0 }]),
    ).toBe(7_500);
  });
});

describe("salaryPoolRemaining", () => {
  test("never goes negative", () => {
    expect(salaryPoolRemaining(10_000, 3_000)).toBe(7_000);
    expect(salaryPoolRemaining(10_000, 12_000)).toBe(0);
  });
});

describe("validateSalaryPoolTotalUpdate", () => {
  test("rejects total below paid", () => {
    expect(validateSalaryPoolTotalUpdate(5_000, 6_000)).toMatch(/cannot be less/i);
  });

  test("accepts valid update", () => {
    expect(validateSalaryPoolTotalUpdate(10_000, 6_000)).toBeNull();
  });
});

describe("periodHasRateDerivedSalaryLines", () => {
  test("detects member salary lines with amount", () => {
    expect(
      periodHasRateDerivedSalaryLines([
        { payeeUserId: "u1", amount: 0 },
        { payeeUserId: "u2", amount: 1_000 },
      ]),
    ).toBe(true);
  });

  test("ignores non-member and zero lines", () => {
    expect(
      periodHasRateDerivedSalaryLines([
        { payeeUserId: null, amount: 500 },
        { payeeUserId: "u1", amount: 0 },
      ]),
    ).toBe(false);
  });
});

describe("validateSalaryPoolCreateAllowed", () => {
  test("blocks when rate-derived lines exist", () => {
    expect(validateSalaryPoolCreateAllowed(true)).toMatch(/rate-derived/i);
  });
});

describe("validateSalaryMemberPayment", () => {
  test("blocks finalized member", () => {
    expect(
      validateSalaryMemberPayment({
        paymentAmount: 1_000,
        poolRemaining: 5_000,
        isFinalized: true,
      }),
    ).toMatch(/finalized/i);
  });

  test("blocks overpayment", () => {
    expect(
      validateSalaryMemberPayment({
        paymentAmount: 6_000,
        poolRemaining: 5_000,
        isFinalized: false,
      }),
    ).toMatch(/exceeds/i);
  });

  test("accepts valid payment", () => {
    expect(
      validateSalaryMemberPayment({
        paymentAmount: 2_000,
        poolRemaining: 5_000,
        isFinalized: false,
      }),
    ).toBeNull();
  });
});

describe("nextMemberPaidAmount", () => {
  test("accumulates cumulative payments", () => {
    expect(nextMemberPaidAmount(3_000, 2_000)).toBe(5_000);
  });
});

describe("salaryPoolTotalsFromPool", () => {
  test("uses full total for formulas regardless of paid", () => {
    const totals = salaryPoolTotalsFromPool({
      totalAmount: 100_000,
      members: [{ paidAmount: 25_000 }, { paidAmount: 10_000 }],
      currency: "EGP",
    });
    expect(totals.totalAmount).toBe(100_000);
    expect(totals.paidAmount).toBe(35_000);
    expect(totals.remainingAmount).toBe(65_000);
    expect(totals.currency).toBe("EGP");
  });
});
