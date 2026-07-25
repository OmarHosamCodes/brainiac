/** Local calendar date (YYYY-MM-DD) for an instant using JS getTimezoneOffset() semantics. */
export function localDateKeyFromInstant(instant: Date, utcOffsetMinutes: number): string {
  const localMs = instant.getTime() - utcOffsetMinutes * 60_000;
  const local = new Date(localMs);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + days));
  const nextYear = next.getUTCFullYear();
  const nextMonth = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(next.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function getLocalWeekStartKeyFromDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  const dayOfWeek = date.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setUTCDate(date.getUTCDate() + diff);
  const weekYear = date.getUTCFullYear();
  const weekMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const weekDay = String(date.getUTCDate()).padStart(2, "0");
  return `${weekYear}-${weekMonth}-${weekDay}`;
}

export function localInstantFromDateKey(
  dateKey: string,
  utcOffsetMinutes: number,
  endOfDay = false,
): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const ms =
    Date.UTC(
      year!,
      month! - 1,
      day!,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ) +
    utcOffsetMinutes * 60_000;
  return new Date(ms);
}

export function getLocalWeekBounds(anchor: Date, utcOffsetMinutes: number) {
  const anchorDateKey = localDateKeyFromInstant(anchor, utcOffsetMinutes);
  const weekStartKey = getLocalWeekStartKeyFromDateKey(anchorDateKey);
  const weekEndKey = addDaysToDateKey(weekStartKey, 6);
  return {
    weekStartKey,
    weekStart: localInstantFromDateKey(weekStartKey, utcOffsetMinutes),
    weekEnd: localInstantFromDateKey(weekEndKey, utcOffsetMinutes, true),
  };
}
