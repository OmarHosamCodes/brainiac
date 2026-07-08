export function formatRate(
  cents: number | null,
  currency: string,
  options?: { perHour?: boolean },
): string {
  if (cents === null) return "Not set";
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
  return options?.perHour ? `${formatted}/hr` : formatted;
}

export function parseBillableRateCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dollars = Number.parseFloat(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}
