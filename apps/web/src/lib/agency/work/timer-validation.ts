export type AgencyTimerProjectRef = {
  id: string;
  name: string;
};

export type AgencyTimerTaskRef = {
  id: string;
  title: string;
};

export type AgencyActiveTimerRef = {
  taskId: string | null;
  taskTitle: string | null;
  description: string;
};

export function canStartAgencyTimer(input: {
  activeTimer: AgencyActiveTimerRef | null;
  project: AgencyTimerProjectRef | null;
}): boolean {
  return Boolean(!input.activeTimer && input.project);
}

export function resolveAgencyTimerTaskRef(input: {
  activeTimer: AgencyActiveTimerRef | null;
  selectedTaskId?: string;
  selectedTaskTitle?: string | null;
  catalogTasks?: AgencyTimerTaskRef[];
}): AgencyTimerTaskRef | null {
  if (input.activeTimer?.taskId) {
    return {
      id: input.activeTimer.taskId,
      title: input.activeTimer.taskTitle ?? input.selectedTaskTitle?.trim() ?? "",
    };
  }

  const draftTaskId = input.selectedTaskId?.trim() ?? "";
  if (!draftTaskId) {
    return null;
  }

  const fromCatalog = input.catalogTasks?.find((task) => task.id === draftTaskId);
  if (fromCatalog) {
    return fromCatalog;
  }

  const draftTitle = input.selectedTaskTitle?.trim() ?? "";
  if (draftTitle) {
    return { id: draftTaskId, title: draftTitle };
  }

  return null;
}

export function canStopAgencyTimer(input: {
  activeTimer: AgencyActiveTimerRef | null;
  description: string;
  selectedTask?: AgencyTimerTaskRef | null;
  selectedTaskId?: string;
  selectedTaskTitle?: string | null;
  catalogTasks?: AgencyTimerTaskRef[];
}): boolean {
  if (!input.activeTimer) {
    return false;
  }

  const descriptionTrimmed = input.description.trim();
  const task =
    input.selectedTask ??
    resolveAgencyTimerTaskRef({
      activeTimer: input.activeTimer,
      selectedTaskId: input.selectedTaskId,
      selectedTaskTitle: input.selectedTaskTitle,
      catalogTasks: input.catalogTasks,
    });

  return Boolean(descriptionTrimmed && task);
}

// ponytail: naive fallback chain (draft → recent entry → first project); upgrade path is explicit project picker
export function resolveAgencyTimerStartProject(input: {
  projects: AgencyTimerProjectRef[];
  selectedTaskProjectId: string | null;
  draftProjectId: string;
  recentEntryProjectId: string | null;
}): AgencyTimerProjectRef | null {
  const findProject = (projectId: string) =>
    input.projects.find((project) => project.id === projectId) ?? null;

  if (input.selectedTaskProjectId) {
    const project = findProject(input.selectedTaskProjectId);
    if (project) return project;
  }

  if (input.draftProjectId) {
    const project = findProject(input.draftProjectId);
    if (project) return project;
  }

  if (input.recentEntryProjectId) {
    const project = findProject(input.recentEntryProjectId);
    if (project) return project;
  }

  return input.projects[0] ?? null;
}

export function getAgencyTimerStartBlockedMessage(input: {
  activeTimer: AgencyActiveTimerRef | null;
  project: AgencyTimerProjectRef | null;
}): string | null {
  if (input.activeTimer) {
    return "Stop the active timer in the time tracker before starting another.";
  }

  if (!input.project) {
    return "No project available to start the timer.";
  }

  return null;
}

export function getAgencyTimerStopBlockedMessage(input: {
  activeTimer: AgencyActiveTimerRef | null;
  description: string;
  selectedTask?: AgencyTimerTaskRef | null;
  selectedTaskId?: string;
  selectedTaskTitle?: string | null;
  catalogTasks?: AgencyTimerTaskRef[];
}): string | null {
  if (!input.activeTimer) {
    return null;
  }

  const descriptionTrimmed = input.description.trim();
  const task =
    input.selectedTask ??
    resolveAgencyTimerTaskRef({
      activeTimer: input.activeTimer,
      selectedTaskId: input.selectedTaskId,
      selectedTaskTitle: input.selectedTaskTitle,
      catalogTasks: input.catalogTasks,
    });

  if (!descriptionTrimmed) {
    return "Add a description in the time tracker before stopping the timer.";
  }

  if (!task) {
    return "Choose a task in the time tracker before stopping the timer.";
  }

  return null;
}
