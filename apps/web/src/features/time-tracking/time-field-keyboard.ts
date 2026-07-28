import {
  formatClockTimeLabel,
  formatDurationInput,
  parseClockTimeLabel,
  parseDurationInput,
} from "./time-entry-draft";

const DRAFT_CLOCK_RE = /^(\d{2}):(\d{2}):(\d{2})$/;

export function clockNudgeMinutes(event: { key: string; shiftKey: boolean }): number | null {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return null;
  const step = event.shiftKey ? 5 : 1;
  return event.key === "ArrowUp" ? step : -step;
}

export function durationNudgeSeconds(event: { key: string; shiftKey: boolean }): number | null {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return null;
  const step = event.shiftKey ? 60 : 1;
  return event.key === "ArrowUp" ? step : -step;
}

export function nudgeDraftClockTime(timeHhMmSs: string, deltaMinutes: number): string | null {
  const match = DRAFT_CLOCK_RE.exec(timeHhMmSs.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  // Wrap minutes within 24h; keep seconds (clock labels ignore them on display).
  const total = (((hours * 60 + minutes + deltaMinutes) % 1440) + 1440) % 1440;
  const nextH = Math.floor(total / 60);
  const nextM = total % 60;
  return `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function nudgeClockTimeLabel(
  label: string,
  deltaMinutes: number,
  preferMeridiem?: "AM" | "PM" | null,
): string | null {
  const parsed = parseClockTimeLabel(label, { preferMeridiem });
  if (!parsed) return null;
  const nudged = nudgeDraftClockTime(parsed, deltaMinutes);
  if (!nudged) return null;
  return formatClockTimeLabel(nudged);
}

export function nudgeDurationInput(durationInput: string, deltaSeconds: number): string | null {
  const seconds = parseDurationInput(durationInput);
  if (seconds === null) return null;
  return formatDurationInput(Math.max(0, seconds + deltaSeconds));
}

export function shouldSyncTimeDraftFromEntry(options: {
  editingDuration: boolean;
  timeEditorOpen: boolean;
}): boolean {
  return !(options.editingDuration || options.timeEditorOpen);
}
