type TaskAssignee = { userId: string };

type TaskForDelegatedFilter = {
  assignedToTeam: boolean;
  assignees: TaskAssignee[];
};

type TaskForJourneyDiscoveryFilter = {
  projectId: string;
  taskKind: "standard" | "journey_anchor" | "journey_milestone";
  assignees?: TaskAssignee[];
};

/** Task created by viewer and delegated to someone other than the viewer. */
export function taskMatchesDelegatedByFilter(
  task: TaskForDelegatedFilter,
  delegatedByUserId: string,
): boolean {
  if (!delegatedByUserId) return false;
  if (task.assignedToTeam) return true;
  return task.assignees.some((assignee) => assignee.userId !== delegatedByUserId);
}

/** Journey row on a project where the viewer has no milestone assignment. */
export function taskMatchesJourneyDiscoveryFilter(
  task: TaskForJourneyDiscoveryFilter,
  allTasks: TaskForJourneyDiscoveryFilter[],
  journeyDiscoveryForUserId: string,
): boolean {
  if (!journeyDiscoveryForUserId) return false;
  if (task.taskKind !== "journey_anchor" && task.taskKind !== "journey_milestone") {
    return false;
  }

  const hasMilestoneForViewer = allTasks.some(
    (candidate) =>
      candidate.projectId === task.projectId &&
      candidate.taskKind === "journey_milestone" &&
      (candidate.assignees ?? []).some((assignee) => assignee.userId === journeyDiscoveryForUserId),
  );

  return !hasMilestoneForViewer;
}
