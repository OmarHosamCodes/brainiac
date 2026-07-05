import type { AgencyProject, AgencyProjectTask } from "@/lib/schemas/agency-work";
import type { TimeEntryRecord } from "@/lib/utils/group-time-entries";

export function isClockifyImportedId(id: string): boolean {
  return id.startsWith("clockify-");
}

function entryTaskStub(entry: TimeEntryRecord): AgencyProjectTask {
  const now = entry.updatedAt || entry.createdAt || new Date().toISOString();
  return {
    id: entry.taskId!,
    teamId: entry.teamId,
    projectId: entry.projectId,
    title: entry.taskTitle?.trim() || entry.description.trim() || "Imported task",
    status: "done",
    taskKind: "standard",
    assignedToTeam: true,
    assignees: [],
    dueDate: null,
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };
}

function entryProjectStub(entry: TimeEntryRecord): AgencyProject {
  const now = entry.updatedAt || entry.createdAt || new Date().toISOString();
  return {
    id: entry.projectId,
    teamId: entry.teamId,
    clientId: entry.clientId,
    clientName: entry.clientName,
    name: entry.projectName,
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };
}

/** Keeps imported / done entry tasks selectable for display, restart, and reassignment. */
export function mergeTimeEntryTasksForChooser(
  loadedTasks: AgencyProjectTask[],
  entries: TimeEntryRecord[],
): AgencyProjectTask[] {
  const byId = new Map(loadedTasks.map((task) => [task.id, task]));

  for (const entry of entries) {
    if (!entry.taskId || byId.has(entry.taskId)) continue;
    byId.set(entry.taskId, entryTaskStub(entry));
  }

  return [...byId.values()];
}

/** Ensures log rows can resolve project labels for imported entries. */
export function mergeTimeEntryProjectsForChooser(
  loadedProjects: AgencyProject[],
  entries: TimeEntryRecord[],
): AgencyProject[] {
  const byId = new Map(loadedProjects.map((project) => [project.id, project]));

  for (const entry of entries) {
    if (byId.has(entry.projectId)) continue;
    byId.set(entry.projectId, entryProjectStub(entry));
  }

  return [...byId.values()];
}
