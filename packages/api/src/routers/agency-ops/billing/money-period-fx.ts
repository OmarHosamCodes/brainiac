import { normalizeCurrencyCode, type MoneyFxRateRow } from "./money-currency";

export function fxPairKey(fromCurrency: string, toCurrency: string): string {
  return `${normalizeCurrencyCode(fromCurrency)}\0${normalizeCurrencyCode(toCurrency)}`;
}

/** Current team FX pairs that are not yet locked on the period snapshot. */
export function missingPeriodFxPairs(
  current: readonly MoneyFxRateRow[],
  snapshot: readonly MoneyFxRateRow[],
): MoneyFxRateRow[] {
  const have = new Set(snapshot.map((row) => fxPairKey(row.fromCurrency, row.toCurrency)));
  return current.filter((row) => !have.has(fxPairKey(row.fromCurrency, row.toCurrency)));
}

export function periodFxApplyBlockedMessage(hasInvoices: boolean): string | null {
  return hasInvoices ? "Can't update this period's FX after invoices exist." : null;
}
