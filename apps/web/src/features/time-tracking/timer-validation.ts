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

  // Idle: project is enough (task optional). Switch: previous timer must be stoppable.
  if (!input.activeTimer) {
    return true;
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
  // Prefer tracker draft so mid-run task changes stick through stop/save.
  const draftTaskId = input.selectedTaskId?.trim() ?? "";
  if (draftTaskId) {
    const fromCatalog = input.catalogTasks?.find((task) => task.id === draftTaskId);
    if (fromCatalog) {
      return fromCatalog;
    }

    const draftTitle = input.selectedTaskTitle?.trim() ?? "";
    if (input.activeTimer?.taskId === draftTaskId) {
      return {
        id: draftTaskId,
        title: input.activeTimer.taskTitle ?? draftTitle,
      };
    }

    if (draftTitle) {
      return { id: draftTaskId, title: draftTitle };
    }

    return { id: draftTaskId, title: "" };
  }

  if (input.activeTimer?.taskId) {
    return {
      id: input.activeTimer.taskId,
      title: input.activeTimer.taskTitle ?? input.selectedTaskTitle?.trim() ?? "",
    };
  }

  return null;
}

/** Prefer typed description; fall back to task title so stop/save works without typing. */
export function resolveAgencyTimerStopDescription(
  description: string,
  taskTitle?: string | null,
): string {
  return description.trim() || (taskTitle?.trim() ?? "");
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

  const task =
    input.selectedTask ??
    resolveAgencyTimerTaskRef({
      activeTimer: input.activeTimer,
      selectedTaskId: input.selectedTaskId,
      selectedTaskTitle: input.selectedTaskTitle,
      catalogTasks: input.catalogTasks,
    });

  const descriptionTrimmed = resolveAgencyTimerStopDescription(
    input.description,
    task?.title ?? input.activeTimer.taskTitle,
  );

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

  const task =
    input.selectedTask ??
    resolveAgencyTimerTaskRef({
      activeTimer: input.activeTimer,
      selectedTaskId: input.selectedTaskId,
      selectedTaskTitle: input.selectedTaskTitle,
      catalogTasks: input.catalogTasks,
    });

  if (!task) {
    return "Choose a task in the time tracker before stopping the timer.";
  }

  const descriptionTrimmed = resolveAgencyTimerStopDescription(
    input.description,
    task.title || input.activeTimer.taskTitle,
  );

  if (!descriptionTrimmed) {
    return "Add a description in the time tracker before stopping the timer.";
  }

  return null;
}

/** Stop CTA while a timer is running: Stop, or a guided next step that stays clickable when it opens the chooser. */
export function getAgencyTimerStopButtonPresentation(input: {
  isPending: boolean;
  canStop: boolean;
}): { label: string; disabled: boolean } {
  if (input.isPending) {
    return { label: "…", disabled: true };
  }
  if (input.canStop) {
    return { label: "Stop", disabled: false };
  }
  // Always keep the CTA clickable so users can open the task chooser after a task-less start.
  return { label: "Choose task", disabled: false };
}
