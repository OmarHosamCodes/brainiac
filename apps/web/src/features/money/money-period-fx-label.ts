export type PeriodFxLockItem = {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
};

function formatFxRate(rate: string): string {
  const n = Number(rate);
  if (!Number.isFinite(n)) return rate;
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function formatPeriodFxLockLabel(items: readonly PeriodFxLockItem[]): string | null {
  if (items.length === 0) return null;
  const pairs = items.map(
    (row) => `${row.fromCurrency}→${row.toCurrency} ${formatFxRate(row.rate)}`,
  );
  return `${pairs.join(" · ")} locked for this period`;
}
