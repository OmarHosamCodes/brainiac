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
