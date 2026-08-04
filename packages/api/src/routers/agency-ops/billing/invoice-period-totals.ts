/** Pure period totals for Money Income card (excludes refunded). */

export type InvoicePeriodTotalsInputRow = {
  status: string;
  amountCents: number;
  receivedCents: number;
  currency: string;
};

export type InvoicePeriodTotals = {
  billedCents: number;
  receivedCents: number;
  remainingCents: number;
  currency: string;
};

export function invoicePeriodTotalsFromRows(
  rows: ReadonlyArray<InvoicePeriodTotalsInputRow>,
): InvoicePeriodTotals {
  let billedCents = 0;
  let receivedCents = 0;
  const currencyCounts = new Map<string, number>();

  for (const row of rows) {
    if (row.status === "refunded") continue;
    billedCents += row.amountCents;
    receivedCents += row.receivedCents;
    currencyCounts.set(row.currency, (currencyCounts.get(row.currency) ?? 0) + row.amountCents);
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
    billedCents,
    receivedCents,
    remainingCents: Math.max(0, billedCents - receivedCents),
    currency,
  };
}
