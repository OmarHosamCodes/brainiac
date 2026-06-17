const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year!, month! - 1, day);
}

/** Smart day label: Today, Yesterday, or "Tue, Jun 16". */
export function formatAgencyDayLabel(dateKey: string, referenceDate = new Date()): string {
  const target = parseDateKey(dateKey);
  const todayKey = toLocalDateKey(referenceDate);
  if (dateKey === todayKey) return "Today";

  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === toLocalDateKey(yesterday)) return "Yesterday";

  return weekdayFormatter.format(target);
}

export function localDateKeyFromIso(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return toLocalDateKey(parsed);
}

export function todayLocalDateKey(referenceDate = new Date()): string {
  return toLocalDateKey(referenceDate);
}
