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
  /** Tracker draft description when switching; defaults to active timer description. */
  description?: string;
  selectedTask?: AgencyTimerTaskRef | null;
  selectedTaskId?: string;
  selectedTaskTitle?: string | null;
  catalogTasks?: AgencyTimerTaskRef[];
}): boolean {
  if (!input.project) {
    return false;
  }

  // Allow start while another timer runs only when that timer is stoppable;
  // API startAgencyTimer then rolls it into an entry and starts the new one.
  if (!input.activeTimer) {
    const selectedTask =
      input.selectedTask ??
      resolveAgencyTimerTaskRef({
        activeTimer: null,
        selectedTaskId: input.selectedTaskId,
        selectedTaskTitle: input.selectedTaskTitle,
        catalogTasks: input.catalogTasks,
      });
    return Boolean(selectedTask);
  }

  return canStopAgencyTimer({
    activeTimer: input.activeTimer,
    description: input.description ?? input.activeTimer.description,
    selectedTask: input.selectedTask,
    selectedTaskId: input.selectedTaskId,
    selectedTaskTitle: input.selectedTaskTitle,
    catalogTasks: input.catalogTasks,
  });
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
  description?: string;
  selectedTask?: AgencyTimerTaskRef | null;
  selectedTaskId?: string;
  selectedTaskTitle?: string | null;
  catalogTasks?: AgencyTimerTaskRef[];
}): string | null {
  if (!input.project) {
    return "No project available to start the timer.";
  }

  if (!input.activeTimer) {
    const selectedTask =
      input.selectedTask ??
      resolveAgencyTimerTaskRef({
        activeTimer: null,
        selectedTaskId: input.selectedTaskId,
        selectedTaskTitle: input.selectedTaskTitle,
        catalogTasks: input.catalogTasks,
      });
    if (!selectedTask) {
      return "Choose a task to start the timer.";
    }
    return null;
  }

  const stopInput = {
    activeTimer: input.activeTimer,
    description: input.description ?? input.activeTimer.description,
    selectedTask: input.selectedTask,
    selectedTaskId: input.selectedTaskId,
    selectedTaskTitle: input.selectedTaskTitle,
    catalogTasks: input.catalogTasks,
  };

  if (canStopAgencyTimer(stopInput)) {
    return null;
  }

  const stopBlockedMessage = getAgencyTimerStopBlockedMessage(stopInput);

  return (
    stopBlockedMessage ?? "Finish the active timer in the time tracker before starting another."
  );
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

/** Stop CTA while a timer is running: Stop, or a guided next step that stays clickable when it opens the chooser. */
export function getAgencyTimerStopButtonPresentation(input: {
  isPending: boolean;
  canStop: boolean;
  descriptionTrimmed: boolean;
}): { label: string; disabled: boolean } {
  if (input.isPending) {
    return { label: "…", disabled: true };
  }
  if (input.canStop) {
    return { label: "Stop", disabled: false };
  }
  // Keep "Choose task" enabled so the click opens the chooser (stop is still blocked until a task is set).
  if (input.descriptionTrimmed) {
    return { label: "Choose task", disabled: false };
  }
  return { label: "Add details", disabled: true };
}
