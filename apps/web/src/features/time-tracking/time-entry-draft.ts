import { formatDuration } from "@/lib/utils/format-duration";

export type TimeEntryDraft = {
  projectId: string;
  taskId: string;
  tagIds: string[];
  isBillable: boolean;
  date: string;
  startTime: string;
  endTime: string;
  durationInput: string;
  description: string;
};

type DraftEntrySource = {
  projectId?: string;
  taskId: string | null;
  tags?: Array<{ id: string }>;
  isBillable?: boolean;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  description: string;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toTimeInputValue(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Display label for draft `HH:MM` — e.g. `5:17AM` (Clockify-style, no space). */
export function formatClockTimeLabel(timeHhMm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeHhMm.trim());
  if (!match) return timeHhMm;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return timeHhMm;
  const date = new Date(2000, 0, 1, hours, minutes);
  return date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s/g, "");
}

/** AM/PM from draft `HH:MM` — used so numpad digit edits keep the field's meridiem. */
export function meridiemFromDraftTime(timeHhMm: string): "AM" | "PM" | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeHhMm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  if (!Number.isFinite(hours) || hours < 0 || hours > 23) return null;
  return hours < 12 ? "AM" : "PM";
}

/**
 * Parse free-text clock times into draft `HH:MM`.
 * Accepts `5:17AM`, `5:17 pm`, `17:17`, `5:17`, `517am`, and numpad forms like `12.48` / `1248`.
 * When digits have no meridiem and hours are 1–12, `preferMeridiem` keeps AM/PM from the prior value.
 */
export function parseClockTimeLabel(
  value: string,
  options?: { preferMeridiem?: "AM" | "PM" | null },
): string | null {
  // Numpad decimal / locale comma often stands in for `:`.
  const trimmed = value.trim().toUpperCase().replace(/\s+/g, "").replace(/[.,]/g, ":");
  if (!trimmed) return null;

  const match = /^(\d{1,4})(?::(\d{2}))?(AM|PM|A|P)?$/.exec(trimmed);
  if (!match) return null;

  const meridiemRaw = match[3];
  let meridiem: "AM" | "PM" | null =
    meridiemRaw === "A" || meridiemRaw === "AM"
      ? "AM"
      : meridiemRaw === "P" || meridiemRaw === "PM"
        ? "PM"
        : null;

  let hours: number;
  let minutes: number;

  if (match[2] !== undefined) {
    hours = Number(match[1]);
    minutes = Number(match[2]);
  } else {
    const digits = match[1]!;
    if (digits.length <= 2) {
      hours = Number(digits);
      minutes = 0;
    } else if (digits.length === 3) {
      hours = Number(digits.slice(0, 1));
      minutes = Number(digits.slice(1));
    } else if (digits.length === 4) {
      hours = Number(digits.slice(0, 2));
      minutes = Number(digits.slice(2));
    } else {
      return null;
    }
  }

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) return null;

  if (!meridiem && options?.preferMeridiem && hours >= 1 && hours <= 12) {
    meridiem = options.preferMeridiem;
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "AM") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  } else if (hours > 23) {
    return null;
  }

  return `${pad2(hours)}:${pad2(minutes)}`;
}

export function formatDurationInput(seconds: number): string {
  return formatDuration(seconds, "clock");
}

export function parseDurationInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":").map((part) => part.trim());
  if (parts.some((part) => part === "" || Number.isNaN(Number(part)))) {
    return null;
  }

  if (parts.length === 2) {
    const [hours, minutes] = parts.map(Number);
    if (minutes! >= 60) return null;
    return hours! * 3_600 + minutes! * 60;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts.map(Number);
    if (minutes! >= 60 || seconds! >= 60) return null;
    return hours! * 3_600 + minutes! * 60 + seconds!;
  }

  return null;
}

function combineDateAndTime(date: string, time: string): Date | null {
  const parsed = new Date(`${date}T${time}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function entryToDraft(entry: DraftEntrySource): TimeEntryDraft {
  const start = new Date(entry.startedAt);
  const end = new Date(entry.endedAt);

  return {
    projectId: entry.projectId ?? "",
    taskId: entry.taskId ?? "",
    tagIds: entry.tags?.map((tag) => tag.id) ?? [],
    isBillable: entry.isBillable ?? true,
    date: toDateInputValue(start),
    startTime: toTimeInputValue(start),
    endTime: toTimeInputValue(end),
    durationInput: formatDurationInput(entry.durationSeconds),
    description: entry.description,
  };
}

export function startedAtToDateTimeDraft(startedAt: string): { date: string; startTime: string } {
  const start = new Date(startedAt);
  return {
    date: toDateInputValue(start),
    startTime: toTimeInputValue(start),
  };
}

/** Idle-tracker manual mode default: last hour → now on today's date. */
export function createDefaultManualTimeWindow(now: Date = new Date()): {
  date: string;
  startTime: string;
  endTime: string;
  durationInput: string;
} {
  const end = now;
  const start = new Date(now.getTime() - 60 * 60 * 1_000);
  const durationSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1_000));
  return {
    date: toDateInputValue(end),
    startTime: toTimeInputValue(start),
    endTime: toTimeInputValue(end),
    durationInput: formatDurationInput(durationSeconds),
  };
}

export function activeTimerStartToIso(
  date: string,
  startTime: string,
  now: Date = new Date(),
): { startAt: string } | { error: string } {
  const start = combineDateAndTime(date, startTime);
  if (!start) return { error: "Invalid start time." };
  if (start.getTime() > now.getTime()) {
    return { error: "Start time can't be in the future." };
  }
  return { startAt: start.toISOString() };
}

/** Running timer: set startedAt so elapsed ≈ durationSeconds (Clockify-style inline edit). */
export function elapsedDurationToStartedAt(
  durationSeconds: number,
  now: Date = new Date(),
): { startAt: string } | { error: string } {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return { error: "Invalid duration." };
  }
  return { startAt: new Date(now.getTime() - durationSeconds * 1_000).toISOString() };
}

export function applyStartTimeToDraft(draft: TimeEntryDraft, startTime: string): TimeEntryDraft {
  return applyEndTimeToDraft({ ...draft, startTime }, draft.endTime);
}

export function applyDurationToDraft(draft: TimeEntryDraft, durationInput: string): TimeEntryDraft {
  const seconds = parseDurationInput(durationInput);
  const start = combineDateAndTime(draft.date, draft.startTime);
  if (!start || seconds === null) {
    return { ...draft, durationInput };
  }

  const end = new Date(start.getTime() + seconds * 1_000);
  return {
    ...draft,
    durationInput: formatDurationInput(seconds),
    endTime: toTimeInputValue(end),
  };
}

export function applyEndTimeToDraft(draft: TimeEntryDraft, endTime: string): TimeEntryDraft {
  const start = combineDateAndTime(draft.date, draft.startTime);
  const end = combineDateAndTime(draft.date, endTime);
  if (!start || !end) {
    return { ...draft, endTime };
  }

  let endDate = end;
  if (endDate.getTime() < start.getTime()) {
    endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1_000);
  }

  const durationSeconds = Math.max(0, Math.floor((endDate.getTime() - start.getTime()) / 1_000));
  return {
    ...draft,
    endTime,
    durationInput: formatDurationInput(durationSeconds),
  };
}

function resolveDraftEndDate(draft: TimeEntryDraft): Date | null {
  const start = combineDateAndTime(draft.date, draft.startTime);
  if (!start) return null;

  const end = combineDateAndTime(draft.date, draft.endTime);
  if (!end) return null;

  if (end.getTime() < start.getTime()) {
    return new Date(end.getTime() + 24 * 60 * 60 * 1_000);
  }

  return end;
}

export function draftSpansNextDay(draft: TimeEntryDraft): boolean {
  const end = resolveDraftEndDate(draft);
  if (!end) return false;
  return toDateInputValue(end) !== draft.date;
}

export function validateTimeEntryDraft(
  draft: TimeEntryDraft,
  options: { requireTask?: boolean } = {},
): string | null {
  if (options.requireTask !== false && !draft.taskId) {
    return "Select a task.";
  }

  const range = draftToIsoRange(draft);
  if ("error" in range) return range.error;
  if (range.durationSeconds <= 0) {
    return "End time must be after start time.";
  }

  return null;
}

export function draftToIsoRange(
  draft: TimeEntryDraft,
): { startAt: string; endAt: string; durationSeconds: number } | { error: string } {
  const start = combineDateAndTime(draft.date, draft.startTime);
  if (!start) return { error: "Invalid start time." };

  const end = resolveDraftEndDate(draft);
  if (!end) return { error: "Invalid end time." };

  const durationSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1_000));
  if (durationSeconds <= 0) {
    return { error: "End time must be after start time." };
  }

  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    durationSeconds,
  };
}

if (import.meta.main) {
  const now = new Date(2026, 6, 6, 12, 0, 0);
  const past = new Date(2026, 6, 6, 9, 1, 0);
  const draft = startedAtToDateTimeDraft(past.toISOString());
  const ok = activeTimerStartToIso(draft.date, draft.startTime, now);
  console.assert(!("error" in ok));
  const future = activeTimerStartToIso(draft.date, "23:00", now);
  console.assert("error" in future);
  const fromElapsed = elapsedDurationToStartedAt(3_600, now);
  console.assert(!("error" in fromElapsed));
  if (!("error" in fromElapsed)) {
    console.assert(new Date(fromElapsed.startAt).getTime() === now.getTime() - 3_600_000);
  }
  const window = createDefaultManualTimeWindow(now);
  console.assert(window.date === "2026-07-06");
  console.assert(window.startTime === "11:00");
  console.assert(window.endTime === "12:00");
  console.assert(formatClockTimeLabel("05:17") === "5:17AM");
  console.assert(formatClockTimeLabel("22:38") === "10:38PM");
  console.assert(parseClockTimeLabel("5:17AM") === "05:17");
  console.assert(parseClockTimeLabel("10:38 pm") === "22:38");
  console.assert(parseClockTimeLabel("17:17") === "17:17");
  console.assert(parseClockTimeLabel("12.48") === "12:48");
  console.assert(parseClockTimeLabel("130", { preferMeridiem: "PM" }) === "13:30");
  console.assert(parseClockTimeLabel("bogus") === null);
}
