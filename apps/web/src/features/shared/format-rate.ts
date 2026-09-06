import { resolveMoneyValue } from "@orch/api/routers/agency-ops/billing/money-currency";

export const AGENCY_CURRENCY_OPTIONS = ["EGP", "USD", "EUR", "GBP", "CAD", "SAR", "AED"] as const;

export function formatRate(
  amount: number | null,
  currency: string,
  options?: { perHour?: boolean },
): string {
  if (amount === null) return "Not set";
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
  return options?.perHour ? `${formatted}/hr` : formatted;
}

export function parseBillableRateAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dollars = Number.parseFloat(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

/** Catalog editors show the source amount when present; legacy rows only have agency amount. */
export function catalogRateAmount(
  sourceBillableRateAmount: number | null | undefined,
  billableRateAmount: number | null | undefined,
): number | null {
  if (sourceBillableRateAmount != null) return sourceBillableRateAmount;
  if (billableRateAmount != null) return billableRateAmount;
  return null;
}

export type CatalogRateLevel = {
  billableRateAmount: number | null;
  sourceBillableRateAmount?: number | null;
  currency?: string | null;
};

/** Winning catalog rate for display (task → project → client), in source currency. */
export function catalogWinningRate(
  task: CatalogRateLevel,
  project: CatalogRateLevel,
  client: CatalogRateLevel,
): { amount: number | null; currency: string } {
  const winning =
    task.billableRateAmount != null
      ? task
      : project.billableRateAmount != null
        ? project
        : client.billableRateAmount != null
          ? client
          : null;
  if (!winning) {
    return { amount: null, currency: client.currency || project.currency || "USD" };
  }
  return {
    amount: catalogRateAmount(winning.sourceBillableRateAmount, winning.billableRateAmount),
    currency: winning.currency || "USD",
  };
}

export function previewConvertedRate(
  sourceAmount: number,
  sourceCurrency: string,
  agencyCurrency: string,
  rates: readonly { fromCurrency: string; toCurrency: string; rate: string }[],
  fxRateOverride?: string,
): number | null {
  try {
    return resolveMoneyValue({
      sourceAmount,
      sourceCurrency,
      agencyCurrency,
      rates,
      fxRateOverride,
    }).amount;
  } catch {
    return null;
  }
}
