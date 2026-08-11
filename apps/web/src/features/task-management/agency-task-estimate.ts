const ESTIMATE_MINUTES_MAX = 1440;

export const AGENCY_TASK_ESTIMATE_PRESETS = [
  { minutes: 15, label: "15m" },
  { minutes: 30, label: "30m" },
  { minutes: 60, label: "1h" },
  { minutes: 120, label: "2h" },
  { minutes: 240, label: "4h" },
] as const;

function clampEstimateMinutes(total: number): number | null {
  if (!Number.isFinite(total)) return null;
  const minutes = Math.round(total);
  if (minutes < 1 || minutes > ESTIMATE_MINUTES_MAX) return null;
  return minutes;
}

/** Parse `90`, `45m`, `1h`, `1h 30m`, `2.5h`, or `1:30` into whole minutes. */
export function parseEstimateInput(input: string): number | null {
  const raw = input.trim().toLowerCase().replace(/,/g, "");
  if (!raw) return null;

  if (/^\d+$/.test(raw)) return clampEstimateMinutes(Number(raw));

  const clockMatch = raw.match(/^(\d{1,2}):([0-5]\d)$/);
  if (clockMatch) {
    return clampEstimateMinutes(Number(clockMatch[1]) * 60 + Number(clockMatch[2]));
  }

  const compoundMatch = raw.match(
    /^(?:(\d+(?:\.\d+)?)\s*h(?:ours?)?)?(?:\s*(\d+)\s*m(?:in(?:utes?)?)?)?$/,
  );
  if (compoundMatch && (compoundMatch[1] || compoundMatch[2])) {
    const hours = compoundMatch[1] ? Number(compoundMatch[1]) : 0;
    const minutes = compoundMatch[2] ? Number(compoundMatch[2]) : 0;
    return clampEstimateMinutes(hours * 60 + minutes);
  }

  return null;
}

export function formatEstimateMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe}m`;
  const hours = Math.floor(safe / 60);
  const remainder = safe % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}
