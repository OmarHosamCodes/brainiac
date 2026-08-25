/** Pure salary pool totals and payment transition helpers. */

export type RateDerivedSalaryLineRow = {
  payeeUserId: string | null;
  amount: number;
};

export function salaryPoolRemaining(totalAmount: number, paidTotal: number): number {
  return Math.max(0, totalAmount - Math.max(0, paidTotal));
}

export function validateSalaryPoolTotalUpdate(
  totalAmount: number,
  paidTotal: number,
): string | null {
  if (!Number.isInteger(totalAmount) || totalAmount <= 0) {
    return "Team salaries total must be a positive whole amount.";
  }
  if (totalAmount < paidTotal) {
    return "Team salaries total cannot be less than what has already been paid.";
  }
  return null;
}

export function periodHasRateDerivedSalaryLines(
  rows: ReadonlyArray<RateDerivedSalaryLineRow>,
): boolean {
  return rows.some((row) => row.payeeUserId != null && row.amount > 0);
}

export function validateSalaryPoolCreateAllowed(hasRateDerivedLines: boolean): string | null {
  if (hasRateDerivedLines) {
    return "This period already has rate-derived salary lines. Remove them before creating a manual Team salaries pool.";
  }
  return null;
}

export function validateSalaryPoolPayment(input: {
  paymentAmount: number;
  poolRemaining: number;
}): string | null {
  if (!Number.isInteger(input.paymentAmount) || input.paymentAmount <= 0) {
    return "Payment amount must be a positive whole amount.";
  }
  if (input.paymentAmount > input.poolRemaining) {
    return "Payment exceeds the Team salaries remaining balance.";
  }
  return null;
}

export function nextPoolPaidAmount(currentPaid: number, paymentAmount: number): number {
  return Math.max(0, currentPaid) + paymentAmount;
}

export function salaryPoolTotalsFromPool(input: {
  totalAmount: number;
  paidAmount: number;
  currency: string;
}) {
  const paidAmount = Math.max(0, input.paidAmount);
  return {
    totalAmount: input.totalAmount,
    paidAmount,
    remainingAmount: salaryPoolRemaining(input.totalAmount, paidAmount),
    currency: input.currency,
  };
}
