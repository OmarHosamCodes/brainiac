import type { AgencyProjectTask, AgencyTaskProject } from "@/lib/schemas/agency-work";

export type ClientTaskGroup = {
  clientId: string;
  clientName: string;
  tasks: AgencyProjectTask[];
};

export function isTaskOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.setHours(23, 59, 59, 999) < Date.now();
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
