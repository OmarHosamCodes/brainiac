export type TimeEntryDraft = {
  taskId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationInput: string;
  description: string;
  linkUrl: string;
  tagIds: string[];
};

type DraftEntrySource = {
  taskId: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  description: string;
  linkUrl: string | null;
  tags: Array<{ id: string }>;
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
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0 || secs > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(secs)}`;
  }
  return `${hours}:${pad2(minutes)}`;
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
    linkUrl: entry.linkUrl ?? "",
    tagIds: entry.tags.map((tag) => tag.id),
  };
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
    durationInput,
    endTime: toTimeInputValue(end),
    date: toDateInputValue(end),
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
    date: toDateInputValue(endDate),
    durationInput: formatDurationInput(durationSeconds),
  };
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

  const parsedDuration = parseDurationInput(draft.durationInput);
  let end: Date | null = combineDateAndTime(draft.date, draft.endTime);

  if (parsedDuration !== null && draft.durationInput.trim()) {
    end = new Date(start.getTime() + parsedDuration * 1_000);
  }

  if (!end) return { error: "Invalid end time." };
  if (end.getTime() < start.getTime()) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1_000);
  }

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
