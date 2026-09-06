/**
 * Pure money amount helpers: minor-unit storage, major UI boundary, FX resolve.
 * Product language is "amount"; storage is integer minor units (÷100 for 2-decimal ISO currencies).
 */

export type MoneyFxRateRow = {
  fromCurrency: string;
  toCurrency: string;
  /** Decimal string: 1 fromCurrency = rate toCurrency */
  rate: string;
};

export type ResolvedMoneyValue = {
  sourceAmount: number;
  sourceCurrency: string;
  amount: number;
  fxRate: string;
  fxAsOf: string;
};

export class MoneyCurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyCurrencyError";
  }
}

export function normalizeCurrencyCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Major (UI) → integer minor units. */
export function majorToAmount(major: number): number {
  return Math.round(major * 100);
}

/** Integer minor → major for display/forms. */
export function amountToMajor(amount: number): number {
  return amount / 100;
}

function parseRate(rate: string): number {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) {
    throw new MoneyCurrencyError(`Invalid FX rate: ${rate}`);
  }
  return n;
}

/**
 * Find a usable rate converting `from` → `to`.
 * Prefers direct row; else inverse of to→from.
 */
export function lookupFxMultiplier(
  rates: readonly MoneyFxRateRow[],
  fromCurrency: string,
  toCurrency: string,
): string | null {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (from === to) return "1";

  const direct = rates.find(
    (r) =>
      normalizeCurrencyCode(r.fromCurrency) === from && normalizeCurrencyCode(r.toCurrency) === to,
  );
  if (direct) return direct.rate;

  const inverse = rates.find(
    (r) =>
      normalizeCurrencyCode(r.fromCurrency) === to && normalizeCurrencyCode(r.toCurrency) === from,
  );
  if (inverse) {
    const inv = parseRate(inverse.rate);
    return String(1 / inv);
  }

  return null;
}

export function resolveMoneyValue(input: {
  sourceAmount: number;
  sourceCurrency: string;
  agencyCurrency: string;
  rates: readonly MoneyFxRateRow[];
  /** ISO timestamp; defaults to now. */
  asOf?: string;
  /** Positive decimal; used instead of team FX when source !== agency. */
  fxRateOverride?: string;
}): ResolvedMoneyValue {
  if (!Number.isInteger(input.sourceAmount)) {
    throw new MoneyCurrencyError("sourceAmount must be an integer minor amount");
  }

  const sourceCurrency = normalizeCurrencyCode(input.sourceCurrency);
  const agencyCurrency = normalizeCurrencyCode(input.agencyCurrency);
  const fxAsOf = input.asOf ?? new Date().toISOString();

  if (sourceCurrency === agencyCurrency) {
    return {
      sourceAmount: input.sourceAmount,
      sourceCurrency,
      amount: input.sourceAmount,
      fxRate: "1",
      fxAsOf,
    };
  }

  const override = input.fxRateOverride?.trim();
  const fxRate = override || lookupFxMultiplier(input.rates, sourceCurrency, agencyCurrency);
  if (fxRate == null) {
    throw new MoneyCurrencyError(`Add an FX rate for ${sourceCurrency}→${agencyCurrency}`);
  }

  const multiplier = parseRate(fxRate);
  const amount = Math.round(input.sourceAmount * multiplier);

  return {
    sourceAmount: input.sourceAmount,
    sourceCurrency,
    amount,
    fxRate,
    fxAsOf,
  };
}
