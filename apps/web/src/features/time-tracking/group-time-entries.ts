import {
  formatAgencyWeekLabel,
  getLocalWeekStartKey,
  localDateKeyFromIso,
} from "@/features/time-tracking/format-agency-day-label";

export type TimeEntryRecord = {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  taskIsWaste?: boolean | null;
  projectName: string;
  clientId: string;
  clientName: string;
  tags?: Array<{ id: string; name: string }>;
  source: "timer" | "manual";
  description: string;
  isBillable?: boolean;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type CollapsedEntryGroup = {
  collapseKey: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string;
  projectName: string;
  clientName: string;
  description: string;
  totalSeconds: number;
  entries: TimeEntryRecord[];
};

export type TimeEntryDayGroup = {
  dateKey: string;
  totalSeconds: number;
  groups: CollapsedEntryGroup[];
};

export type TimeEntryWeekGroup = {
  weekStartKey: string;
  label: string;
  totalSeconds: number;
  days: TimeEntryDayGroup[];
};

function collapseKeyFor(entry: TimeEntryRecord): string {
  const taskKey = entry.taskId ?? `project-only:${entry.projectId}`;
  return `${taskKey}||${entry.description ?? ""}`;
}

export function collapseDuplicatesWithinDay(entries: TimeEntryRecord[]): CollapsedEntryGroup[] {
  const map = new Map<string, CollapsedEntryGroup>();

  for (const entry of entries) {
    const key = collapseKeyFor(entry);
    const existing = map.get(key);

    if (existing) {
      existing.totalSeconds += entry.durationSeconds;
      existing.entries.push(entry);
    } else {
      map.set(key, {
        collapseKey: key,
        projectId: entry.projectId,
        taskId: entry.taskId,
        taskTitle: (entry.taskTitle ?? entry.description) || "Project-only entry",
        projectName: entry.projectName,
        clientName: entry.clientName,
        description: entry.description,
        totalSeconds: entry.durationSeconds,
        entries: [entry],
      });
    }
  }

  return [...map.values()].sort(
    (left, right) =>
      new Date(right.entries[0]!.startedAt).getTime() -
      new Date(left.entries[0]!.startedAt).getTime(),
  );
}

export function groupEntriesByDay(entries: TimeEntryRecord[]): TimeEntryDayGroup[] {
  const byDay = new Map<string, TimeEntryRecord[]>();

  for (const entry of entries) {
    const dateKey = localDateKeyFromIso(entry.startedAt);
    if (!dateKey) continue;
    const bucket = byDay.get(dateKey) ?? [];
    bucket.push(entry);
    byDay.set(dateKey, bucket);
  }

  return [...byDay.entries()]
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
    .map(([dateKey, dayEntries]) => {
      const sorted = [...dayEntries].sort(
        (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
      );
      const groups = collapseDuplicatesWithinDay(sorted);
      return {
        dateKey,
        totalSeconds: sorted.reduce((sum, entry) => sum + entry.durationSeconds, 0),
        groups,
      };
    });
}

export function groupEntriesByWeek(
  entries: TimeEntryRecord[],
  referenceDate = new Date(),
): TimeEntryWeekGroup[] {
  const dayGroups = groupEntriesByDay(entries);
  const byWeek = new Map<string, TimeEntryDayGroup[]>();

  for (const day of dayGroups) {
    const weekStartKey = getLocalWeekStartKey(day.dateKey);
    const bucket = byWeek.get(weekStartKey) ?? [];
    bucket.push(day);
    byWeek.set(weekStartKey, bucket);
  }

  return [...byWeek.entries()]
    .sort(([leftWeek], [rightWeek]) => rightWeek.localeCompare(leftWeek))
    .map(([weekStartKey, days]) => ({
      weekStartKey,
      label: formatAgencyWeekLabel(weekStartKey, referenceDate),
      totalSeconds: days.reduce((sum, day) => sum + day.totalSeconds, 0),
      days,
    }));
}
