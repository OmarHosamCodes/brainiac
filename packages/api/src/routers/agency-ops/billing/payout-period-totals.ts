/** Pure salaries period totals for Money Deductions card. */

export type PayoutPeriodTotalsInputRow = {
  amountCents: number;
  paidCents: number;
  currency: string;
};

export type PayoutPeriodTotals = {
  salariesDueCents: number;
  salariesPaidCents: number;
  salariesRemainingCents: number;
  currency: string;
};

export function payoutSalariesTotalsFromRows(
  rows: ReadonlyArray<PayoutPeriodTotalsInputRow>,
): PayoutPeriodTotals {
  let salariesDueCents = 0;
  let salariesPaidCents = 0;
  let currency = "USD";

  for (const row of rows) {
    salariesDueCents += row.amountCents;
    salariesPaidCents += row.paidCents;
    currency = row.currency || currency;
  }

  return {
    salariesDueCents,
    salariesPaidCents,
    salariesRemainingCents: Math.max(0, salariesDueCents - salariesPaidCents),
    currency,
  };
}
