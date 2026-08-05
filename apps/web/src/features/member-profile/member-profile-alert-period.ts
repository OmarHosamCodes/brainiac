export type AlertPeriodTarget =
  | { kind: "day"; dateKey: string; from: string; to: string }
  | { kind: "month"; monthKey: string; from: string; to: string; focusDate: string };

/** Last calendar day key for a YYYY-MM month key (UTC date math). */
export function lastDateKeyOfMonth(monthKey: string): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return `${monthKey}-01`;
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthKey}-${String(lastDay).padStart(2, "0")}`;
}

/**
 * Map alert context to a profile period the UI can open.
 * Day alerts focus that date; month-keyed alerts open the full month.
 */
export function resolveAlertPeriodTarget(context: {
  dateKey?: string;
  periodKey?: string;
}): AlertPeriodTarget | null {
  const dateKey = context.dateKey;
  if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { kind: "day", dateKey, from: dateKey, to: dateKey };
  }

  const periodKey = context.periodKey;
  if (periodKey && /^\d{4}-\d{2}$/.test(periodKey)) {
    const from = `${periodKey}-01`;
    const to = lastDateKeyOfMonth(periodKey);
    return { kind: "month", monthKey: periodKey, from, to, focusDate: from };
  }

  return null;
}
