/** Chat-style smart timestamps (Slack / Messages hybrid). */

function formatClock(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function startOfLocalDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatTaskMessageSmartTime(iso: string, nowMs = Date.now()): string {
  const date = new Date(iso);
  const then = date.getTime();
  if (Number.isNaN(then)) return "";

  const deltaMs = Math.max(0, nowMs - then);
  if (deltaMs < 45_000) return "Just now";

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;

  const nowDay = startOfLocalDay(nowMs);
  const thenDay = startOfLocalDay(then);
  const dayDiff = Math.round((nowDay - thenDay) / 86_400_000);

  if (dayDiff === 0) return formatClock(date);
  if (dayDiff === 1) return `Yesterday ${formatClock(date)}`;

  const sameYear = new Date(nowMs).getFullYear() === date.getFullYear();
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTaskMessageAbsoluteTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
