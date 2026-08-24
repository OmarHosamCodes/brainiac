/** Pure salary pool totals and payment transition helpers. */

export type SalaryPoolMemberPaidRow = {
  paidAmount: number;
};

export type RateDerivedSalaryLineRow = {
  payeeUserId: string | null;
  amount: number;
};

export function salaryPoolPaidTotal(members: ReadonlyArray<SalaryPoolMemberPaidRow>): number {
  let total = 0;
  for (const member of members) {
    total += Math.max(0, member.paidAmount);
  }
  return total;
}

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

export function validateSalaryMemberPayment(input: {
  paymentAmount: number;
  poolRemaining: number;
  isFinalized: boolean;
}): string | null {
  if (input.isFinalized) {
    return "This member is finalized. Reopen them before recording another payment.";
  }
  if (!Number.isInteger(input.paymentAmount) || input.paymentAmount <= 0) {
    return "Payment amount must be a positive whole amount.";
  }
  if (input.paymentAmount > input.poolRemaining) {
    return "Payment exceeds the shared Team salaries remaining balance.";
  }
  return null;
}

export function nextMemberPaidAmount(currentPaid: number, paymentAmount: number): number {
  return Math.max(0, currentPaid) + paymentAmount;
}

export function salaryPoolTotalsFromPool(input: {
  totalAmount: number;
  members: ReadonlyArray<SalaryPoolMemberPaidRow>;
  currency: string;
}) {
  const paidAmount = salaryPoolPaidTotal(input.members);
  return {
    totalAmount: input.totalAmount,
    paidAmount,
    remainingAmount: salaryPoolRemaining(input.totalAmount, paidAmount),
    currency: input.currency,
  };
}
