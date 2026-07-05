import { useEffect, useMemo, useState } from "react";

import { useAgencyElapsedTimer } from "@/lib/agency/work/hooks/use-agency-elapsed-timer";
import {
  canStartAgencyTimer,
  canStopAgencyTimer,
  resolveAgencyTimerStartProject,
} from "@/lib/agency/work/timer-validation";
import type { AgencyProject, AgencyProjectTask } from "@/lib/schemas/agency-work";
import {
  useAgencyActiveTimerQuery,
  useAgencyProjectTasksForChooserQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
  type AgencyProjectTaskStatus,
} from "@/lib/queries/agency";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
  useTrackerDraft,
} from "@/stores/agency-time-tracking";

const OPEN_TASK_STATUSES: AgencyProjectTaskStatus[] = ["open", "in_progress"];
const TRACKER_SUGGESTION_LIMIT = 3;

type UseAgencyTimeTrackerOptions = {
  teamId: string;
};

export type AgencyTimeTrackerSuggestion = {
  description: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
};

export type AgencyTimeTrackerViewModel = {
  teamId: string;
  timerDescription: string;
  selectedTaskId: string;
  taskChooserOpen: boolean;
  taskChooserLabel: string;
  taskChooserWarning: boolean;
  projects: AgencyProject[];
  tasksForChooser: AgencyProjectTask[];
  projectsLoading: boolean;
  tasksLoading: boolean;
  activeTimer: NonNullable<
    NonNullable<ReturnType<typeof useAgencyActiveTimerQuery>["data"]>["timer"]
  > | null;
  elapsedLabel: string | null;
  canStartTimer: boolean;
  canStopTimer: boolean;
  stopButtonLabel: string;
  stopButtonWarningRing: boolean;
  isTimerMutationPending: boolean;
  descriptionSuggestions: AgencyTimeTrackerSuggestion[];
  onDescriptionChange: (value: string) => void;
  onDescriptionKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onTaskChange: (taskId: string) => void;
  onTaskChooserOpenChange: (open: boolean) => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onDiscardTimer: () => void;
  onApplySuggestion: (suggestion: AgencyTimeTrackerSuggestion) => void;
};

function normalizeSuggestionText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function useAgencyTimeTracker({ teamId }: UseAgencyTimeTrackerOptions): AgencyTimeTrackerViewModel {
  const setTrackerDescription = useAgencyTimeTrackingStore((s) => s.setTrackerDescription);
  const setTrackerProjectId = useAgencyTimeTrackingStore((s) => s.setTrackerProjectId);
  const setTrackerTaskId = useAgencyTimeTrackingStore((s) => s.setTrackerTaskId);
  const ensureTrackerDraft = useAgencyTimeTrackingStore((s) => s.ensureTrackerDraft);
  const syncDraftFromActiveTimer = useAgencyTimeTrackingStore((s) => s.syncDraftFromActiveTimer);
  const startTimerAction = useAgencyTimeTrackingStore((s) => s.startTimer);
  const stopTimerAction = useAgencyTimeTrackingStore((s) => s.stopTimer);
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);
  const taskChooserOpenRequest = useAgencyTimeTrackingStore((s) => s.taskChooserOpenRequest);

  const [taskChooserOpen, setTaskChooserOpen] = useState(false);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksForChooserQuery(teamId, {
    statuses: OPEN_TASK_STATUSES,
  });
  const recentEntriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 50);
  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);

  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.items ?? [];
  const activeTimer = activeTimerQuery.data?.timer ?? null;
  const trackerDraft = useTrackerDraft(teamId);

  const selectedTaskId = trackerDraft?.taskId ?? "";
  const timerDescription = trackerDraft?.description ?? "";

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const recentEntryProjectId = recentEntriesQuery.data?.items[0]?.projectId ?? null;
  const startProject = resolveAgencyTimerStartProject({
    projects,
    selectedTaskProjectId: selectedTask?.projectId ?? null,
    draftProjectId: trackerDraft?.projectId ?? "",
    recentEntryProjectId,
  });
  const activeTimerHasTask = Boolean(activeTimer?.taskId);
  const descriptionTrimmed = timerDescription.trim();
  const tasksForChooser =
    activeTimer && !activeTimer.taskId
      ? tasks.filter((task) => task.projectId === activeTimer.projectId)
      : tasks;

  useEffect(() => {
    if (!teamId) return;
    ensureTrackerDraft(teamId);
  }, [teamId, ensureTrackerDraft]);

  useEffect(() => {
    if (!teamId) return;
    syncDraftFromActiveTimer(teamId, activeTimer);
  }, [teamId, activeTimer, syncDraftFromActiveTimer]);

  useEffect(() => {
    if (taskChooserOpenRequest === 0) return;
    setTaskChooserOpen(true);
  }, [taskChooserOpenRequest]);

  const canStartTimer = Boolean(
    teamId &&
      canStartAgencyTimer({
        activeTimer,
        project: startProject,
      }),
  );
  const canStopTimer = canStopAgencyTimer({
    activeTimer,
    description: timerDescription,
    selectedTask,
  });

  const elapsedLabel = useAgencyElapsedTimer({
    startedAt: activeTimer?.startedAt,
    enabled: Boolean(activeTimer),
    format: "clock",
  });

  const descriptionSuggestions = useMemo(() => {
    const entries = recentEntriesQuery.data?.items ?? [];
    const normalizedQuery = normalizeSuggestionText(timerDescription);
    const seen = new Set<string>();

    return entries
      .map((entry) => {
        const description = entry.description.trim();
        const taskId = entry.taskId ?? "";
        const taskTitle = entry.taskTitle ?? "";
        const searchable = normalizeSuggestionText(`${description} ${taskTitle}`);
        const startsWithQuery = normalizedQuery ? searchable.startsWith(normalizedQuery) : false;
        const includesQuery = normalizedQuery ? searchable.includes(normalizedQuery) : false;
        return {
          description,
          taskId,
          taskTitle,
          projectName: entry.projectName,
          score: startsWithQuery ? 3 : includesQuery ? 2 : normalizedQuery ? 0 : 1,
        };
      })
      .filter((entry) => {
        if (!entry.description || !entry.taskId || entry.score <= 0) return false;
        const key = `${normalizeSuggestionText(entry.description)}||${entry.taskId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, TRACKER_SUGGESTION_LIMIT);
  }, [recentEntriesQuery.data?.items, timerDescription]);

  useEffect(() => {
    if (selectedTaskId || activeTimerHasTask) {
      setTaskChooserOpen(false);
    }
  }, [activeTimerHasTask, selectedTaskId]);

  function revealTaskChooser() {
    setTaskChooserOpen(true);
  }

  async function startTimer() {
    if (!teamId || activeTimer || !startProject) return;

    await startTimerAction({
      teamId,
      project: startProject,
      task: selectedTask,
      description: timerDescription,
    });
  }

  async function stopTimer(discard = false) {
    if (!teamId || !activeTimer) return;
    if (!discard && !canStopTimer) {
      if (descriptionTrimmed && !activeTimerHasTask && !selectedTask) revealTaskChooser();
      return;
    }

    await stopTimerAction({
      teamId,
      activeTimer,
      description: timerDescription,
      discard,
      task:
        !activeTimerHasTask && selectedTask
          ? { id: selectedTask.id, title: selectedTask.title }
          : null,
    });
  }

  const taskChooserLabel = activeTimer?.taskTitle ?? selectedTask?.title ?? "Choose task";

  let stopButtonLabel = "Stop";
  if (isTimerMutationPending) {
    stopButtonLabel = "…";
  } else if (!canStopTimer) {
    stopButtonLabel = descriptionTrimmed ? "Choose task" : "Add details";
  }

  return {
    teamId,
    timerDescription,
    selectedTaskId,
    taskChooserOpen,
    taskChooserLabel,
    taskChooserWarning: !activeTimerHasTask && !selectedTask && taskChooserOpen,
    projects,
    tasksForChooser,
    projectsLoading: projectsQuery.isPending,
    tasksLoading: tasksQuery.isPending,
    activeTimer,
    elapsedLabel,
    canStartTimer,
    canStopTimer,
    stopButtonLabel,
    stopButtonWarningRing: Boolean(activeTimer && !canStopTimer),
    isTimerMutationPending,
    descriptionSuggestions,
    onDescriptionChange: (value) => setTrackerDescription(teamId, value),
    onDescriptionKeyDown: (event) => {
      if (event.key === "Enter" && canStartTimer) {
        event.preventDefault();
        void startTimer();
      }
    },
    onTaskChange: (value) => {
      setTrackerTaskId(teamId, value || "");
      const task = tasks.find((entry) => entry.id === value);
      if (task) {
        setTrackerProjectId(teamId, task.projectId);
      }
    },
    onTaskChooserOpenChange: setTaskChooserOpen,
    onStartTimer: () => void startTimer(),
    onStopTimer: () => void stopTimer(),
    onDiscardTimer: () => void stopTimer(true),
    onApplySuggestion: (suggestion) => {
      setTrackerDescription(teamId, suggestion.description);
      setTrackerTaskId(teamId, suggestion.taskId);
      const task = tasks.find((entry) => entry.id === suggestion.taskId);
      if (task) {
        setTrackerProjectId(teamId, task.projectId);
      }
    },
  };
}
