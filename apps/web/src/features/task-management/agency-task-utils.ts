import type { AgencyProjectTask, AgencyTaskProject } from "@/features/task-management/agency-work";
import { normalizeTaskTitle } from "./agency-task-title-filter";

export type ClientTaskGroup = {
  clientId: string;
  clientName: string;
  tasks: AgencyProjectTask[];
};

export type TaskGroupItem = {
  id: string;
  projectId: string;
  title: string;
  createdAt?: string;
};

export type AgencyProjectTaskGroup<T extends TaskGroupItem = AgencyProjectTask> = {
  groupKey: string;
  projectId: string;
  title: string;
  instances: T[];
  instanceCount: number;
};

export function getTaskGroupKey(task: Pick<AgencyProjectTask, "projectId" | "title">): string {
  return `${task.projectId}::${normalizeTaskTitle(task.title)}`;
}

export function groupTasksByProjectTitle<T extends TaskGroupItem>(
  tasks: T[],
): AgencyProjectTaskGroup<T>[] {
  const groups = new Map<string, AgencyProjectTaskGroup<T>>();

  for (const task of tasks) {
    const groupKey = getTaskGroupKey(task);
    const existing = groups.get(groupKey);
    if (existing) {
      existing.instances.push(task);
      existing.instanceCount += 1;
    } else {
      groups.set(groupKey, {
        groupKey,
        projectId: task.projectId,
        title: task.title,
        instances: [task],
        instanceCount: 1,
      });
    }
  }

  return Array.from(groups.values())
    .map((group) => {
      const sortedInstances = [...group.instances].sort((left, right) => {
        const rightCreated = new Date(right.createdAt ?? 0).getTime();
        const leftCreated = new Date(left.createdAt ?? 0).getTime();
        return rightCreated - leftCreated;
      });
      return {
        ...group,
        title: sortedInstances[0]?.title ?? group.title,
        instances: sortedInstances,
        instanceCount: sortedInstances.length,
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function isTaskOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.setHours(23, 59, 59, 999) < Date.now();
}

export type TaskDueDateDraft = {
  date: string;
  time: string;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function taskDueDateToDraft(iso: string | null | undefined): TaskDueDateDraft {
  if (!iso) {
    return { date: "", time: "" };
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return taskDueDateToDraft(null);
  }

  return {
    date: `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`,
    time: `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`,
  };
}

export function taskDueDateDraftToIso(draft: TaskDueDateDraft): string | null {
  if (!draft.date || !draft.time) return null;
  const parsed = new Date(`${draft.date}T${draft.time}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function sortTasksByUrgency(tasks: AgencyProjectTask[]): AgencyProjectTask[] {
  return [...tasks].sort((left, right) => {
    const leftOverdue = isTaskOverdue(left.dueDate) ? 0 : 1;
    const rightOverdue = isTaskOverdue(right.dueDate) ? 0 : 1;
    if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue;

    const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (leftDue !== rightDue) return leftDue - rightDue;

    return left.title.localeCompare(right.title);
  });
}

export function groupTasksByClient(
  tasks: AgencyProjectTask[],
  projects: AgencyTaskProject[],
): ClientTaskGroup[] {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const groups = new Map<string, ClientTaskGroup>();

  for (const task of tasks) {
    const project = projectById.get(task.projectId);
    const clientId = project?.clientId ?? `unknown:${task.projectId}`;
    const clientName = project?.clientName ?? "Unknown client";

    const existing = groups.get(clientId);
    if (existing) {
      existing.tasks.push(task);
    } else {
      groups.set(clientId, { clientId, clientName, tasks: [task] });
    }
  }

  return Array.from(groups.values())
    .sort((left, right) => left.clientName.localeCompare(right.clientName))
    .map((group) => ({
      ...group,
      tasks: sortTasksByUrgency(group.tasks),
    }));
}

const ESTIMATE_MINUTES_MAX = 1440;

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
