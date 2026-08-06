/** Pure salaries period totals for Money Deductions card. */

export type PayoutPeriodTotalsInputRow = {
  amount: number;
  paidAmount: number;
  currency: string;
};

export type PayoutPeriodTotals = {
  salariesDueAmount: number;
  salariesPaidAmount: number;
  salariesRemainingAmount: number;
  currency: string;
};

export function payoutSalariesTotalsFromRows(
  rows: ReadonlyArray<PayoutPeriodTotalsInputRow>,
): PayoutPeriodTotals {
  let salariesDueAmount = 0;
  let salariesPaidAmount = 0;
  let currency = "USD";

  for (const row of rows) {
    salariesDueAmount += row.amount;
    salariesPaidAmount += row.paidAmount;
    currency = row.currency || currency;
  }

  return {
    salariesDueAmount,
    salariesPaidAmount,
    salariesRemainingAmount: Math.max(0, salariesDueAmount - salariesPaidAmount),
    currency,
  };
}
