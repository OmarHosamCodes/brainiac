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
  task: AgencyTimerTaskRef | null;
}): boolean {
  return Boolean(!input.activeTimer && input.project && input.task);
}

export function canStopAgencyTimer(input: {
  activeTimer: AgencyActiveTimerRef | null;
  description: string;
  selectedTask: AgencyTimerTaskRef | null;
}): boolean {
  if (!input.activeTimer) {
    return false;
  }

  const descriptionTrimmed = input.description.trim();
  const activeTimerHasTask = Boolean(input.activeTimer.taskId);

  return Boolean(descriptionTrimmed && (activeTimerHasTask || input.selectedTask));
}

export function getAgencyTimerStartBlockedMessage(input: {
  activeTimer: AgencyActiveTimerRef | null;
  project: AgencyTimerProjectRef | null;
  task: AgencyTimerTaskRef | null;
}): string | null {
  if (input.activeTimer) {
    return "Stop the active timer in the time tracker before starting another.";
  }

  if (!input.project || !input.task) {
    return "Choose a task before starting the timer.";
  }

  return null;
}

export function getAgencyTimerStopBlockedMessage(input: {
  activeTimer: AgencyActiveTimerRef | null;
  description: string;
  selectedTask: AgencyTimerTaskRef | null;
}): string | null {
  if (!input.activeTimer) {
    return null;
  }

  const descriptionTrimmed = input.description.trim();
  const activeTimerHasTask = Boolean(input.activeTimer.taskId);

  if (!descriptionTrimmed) {
    return "Add a description in the time tracker before stopping the timer.";
  }

  if (!activeTimerHasTask && !input.selectedTask) {
    return "Choose a task in the time tracker before stopping the timer.";
  }

  return null;
}
