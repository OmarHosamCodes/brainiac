import type { AgencyProjectTask } from "@/lib/schemas/agency-work";
import { localDateKeyFromIso, todayLocalDateKey } from "@/lib/utils/format-agency-day-label";

export type TaskRecencyGroupId = "today" | "yesterday" | "earlier";

export type TaskRecencyGroupSection = {
  id: TaskRecencyGroupId;
  label: string;
  tasks: AgencyProjectTask[];
};

function yesterdayLocalDateKey(referenceDate = new Date()): string {
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveRecencyGroup(dateKey: string, referenceDate = new Date()): TaskRecencyGroupId {
  const todayKey = todayLocalDateKey(referenceDate);
  if (dateKey === todayKey) return "today";
  if (dateKey === yesterdayLocalDateKey(referenceDate)) return "yesterday";
  return "earlier";
}

export function groupTasksByRecency(
  tasks: AgencyProjectTask[],
  getDateIso: (task: AgencyProjectTask) => string | null | undefined,
  referenceDate = new Date(),
): TaskRecencyGroupSection[] {
  const buckets: Record<TaskRecencyGroupId, AgencyProjectTask[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  for (const task of tasks) {
    const iso = getDateIso(task);
    const dateKey = iso ? localDateKeyFromIso(iso) : "";
    const groupId = dateKey ? resolveRecencyGroup(dateKey, referenceDate) : "earlier";
    buckets[groupId].push(task);
  }

  const sections: TaskRecencyGroupSection[] = [];
  if (buckets.today.length > 0) {
    sections.push({ id: "today", label: "Today", tasks: buckets.today });
  }
  if (buckets.yesterday.length > 0) {
    sections.push({ id: "yesterday", label: "Yesterday", tasks: buckets.yesterday });
  }
  if (buckets.earlier.length > 0) {
    sections.push({ id: "earlier", label: "Earlier", tasks: buckets.earlier });
  }
  return sections;
}

export type DelegatedTaskGroupId = "due-today" | "due-this-week" | "completed";

export type DelegatedTaskGroupSection = {
  id: DelegatedTaskGroupId;
  label: string;
  tasks: AgencyProjectTask[];
};

function endOfWeekDateKey(referenceDate = new Date()): string {
  const date = new Date(referenceDate);
  const dayOfWeek = date.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  date.setDate(date.getDate() + daysUntilSunday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDoneDelegatedTask(task: AgencyProjectTask): boolean {
  return task.status === "done" || task.viewerStatus === "done";
}

export function groupDelegatedTasks(
  tasks: AgencyProjectTask[],
  referenceDate = new Date(),
): DelegatedTaskGroupSection[] {
  const todayKey = todayLocalDateKey(referenceDate);
  const weekEndKey = endOfWeekDateKey(referenceDate);

  const buckets: Record<DelegatedTaskGroupId, AgencyProjectTask[]> = {
    "due-today": [],
    "due-this-week": [],
    completed: [],
  };

  for (const task of tasks) {
    if (isDoneDelegatedTask(task)) {
      buckets.completed.push(task);
      continue;
    }

    const dueKey = task.dueDate ? localDateKeyFromIso(task.dueDate) : "";
    if (dueKey === todayKey) {
      buckets["due-today"].push(task);
    } else if (dueKey && dueKey > todayKey && dueKey <= weekEndKey) {
      buckets["due-this-week"].push(task);
    } else {
      buckets["due-this-week"].push(task);
    }
  }

  const sections: DelegatedTaskGroupSection[] = [];
  if (buckets["due-today"].length > 0) {
    sections.push({ id: "due-today", label: "Due Today", tasks: buckets["due-today"] });
  }
  if (buckets["due-this-week"].length > 0) {
    sections.push({ id: "due-this-week", label: "Due This Week", tasks: buckets["due-this-week"] });
  }
  if (buckets.completed.length > 0) {
    sections.push({ id: "completed", label: "Completed", tasks: buckets.completed });
  }
  return sections;
}
