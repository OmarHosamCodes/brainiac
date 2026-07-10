import { formatDuration } from "@/lib/utils/format-duration";

export type TimeEntryDraft = {
  taskId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationInput: string;
  description: string;
};

type DraftEntrySource = {
  taskId: string | null;
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
    taskId: entry.taskId ?? "",
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
}
