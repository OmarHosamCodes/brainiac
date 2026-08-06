/** Pure period totals for Money Income card (excludes refunded). */

export type InvoicePeriodTotalsInputRow = {
  status: string;
  amount: number;
  receivedAmount: number;
  currency: string;
};

export type InvoicePeriodTotals = {
  billedAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  currency: string;
};

export function invoicePeriodTotalsFromRows(
  rows: ReadonlyArray<InvoicePeriodTotalsInputRow>,
): InvoicePeriodTotals {
  let billedAmount = 0;
  let receivedAmount = 0;
  const currencyCounts = new Map<string, number>();

  for (const row of rows) {
    if (row.status === "refunded") continue;
    billedAmount += row.amount;
    receivedAmount += row.receivedAmount;
    currencyCounts.set(row.currency, (currencyCounts.get(row.currency) ?? 0) + row.amount);
  }

  let currency = "USD";
  let top = -1;
  for (const [code, amount] of currencyCounts) {
    if (amount > top) {
      top = amount;
      currency = code;
    }
  }

  return {
    billedAmount,
    receivedAmount,
    remainingAmount: Math.max(0, billedAmount - receivedAmount),
    currency,
  };
}
