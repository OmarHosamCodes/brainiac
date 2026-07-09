import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { setTrackingFavicon } from "@/lib/favicon";

import {
  buildDescriptionSuggestions,
  type AgencyDescriptionSuggestion,
} from "@/features/time-tracking/description-suggestions";
import { useAgencyElapsedTimer } from "@/features/time-tracking/hooks/use-agency-elapsed-timer";
import {
  canStartAgencyTimer,
  canStopAgencyTimer,
  getAgencyTimerStopButtonPresentation,
  resolveAgencyTimerStartProject,
  resolveAgencyTimerTaskRef,
} from "@/features/time-tracking/timer-validation";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import {
  useAgencyActiveTimerQuery,
  useAgencyProjectTasksForChooserQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
} from "@/features/shared/agency-queries";
import { formatAgencyDayLabel } from "@/features/time-tracking/format-agency-day-label";
import { findProjectTaskInCache } from "@/features/shared/agency-query-cache";
import {
  activeTimerStartToIso,
  startedAtToDateTimeDraft,
} from "@/features/time-tracking/time-entry-draft";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
  useTrackerDraft,
} from "@/features/time-tracking/stores/agency-time-tracking";

const START_TIME_DEBOUNCE_MS = 300;

const emptyStartDraft = { date: "", startTime: "" };

export type AgencyTimerStartDraft = {
  date: string;
  startTime: string;
};

type UseAgencyTimeTrackerOptions = {
  teamId: string;
};

export type AgencyTimeTrackerSuggestion = AgencyDescriptionSuggestion;

export type AgencyTimeTrackerViewModel = {
  teamId: string;
  timerDescription: string;
  selectedTaskId: string;
  taskChooserOpen: boolean;
  taskChooserLabel: string;
  taskChooserWarning: boolean;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  projectsLoading: boolean;
  tasksLoading: boolean;
  activeTimer: NonNullable<
    NonNullable<ReturnType<typeof useAgencyActiveTimerQuery>["data"]>["timer"]
  > | null;
  elapsedLabel: string | null;
  canStartTimer: boolean;
  canStopTimer: boolean;
  stopButtonLabel: string;
  stopButtonDisabled: boolean;
  stopButtonWarningRing: boolean;
  isTimerMutationPending: boolean;
  isStartTimeSaving: boolean;
  startTimePopoverOpen: boolean;
  startTimeDraft: AgencyTimerStartDraft;
  startTimeDayLabel: string;
  startTimeError: string | null;
  descriptionSuggestions: AgencyTimeTrackerSuggestion[];
  trackerStatusLine: string;
  onDescriptionChange: (value: string) => void;
  onDescriptionKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onTaskChange: (taskId: string) => void;
  onTaskChooserOpenChange: (open: boolean) => void;
  onStartTimePopoverOpenChange: (open: boolean) => void;
  onStartTimeDraftChange: (patch: Partial<AgencyTimerStartDraft>) => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onDiscardTimer: () => void;
  onApplySuggestion: (suggestion: AgencyTimeTrackerSuggestion) => void;
};

export function useAgencyTrackingFavicon(isTracking: boolean) {
  useEffect(() => {
    setTrackingFavicon(isTracking);
  }, [isTracking]);
}

export function useAgencyTimeTracker({
  teamId,
}: UseAgencyTimeTrackerOptions): AgencyTimeTrackerViewModel {
  const setTrackerDescription = useAgencyTimeTrackingStore((s) => s.setTrackerDescription);
  const setTrackerProjectId = useAgencyTimeTrackingStore((s) => s.setTrackerProjectId);
  const setTrackerTaskId = useAgencyTimeTrackingStore((s) => s.setTrackerTaskId);
  const ensureTrackerDraft = useAgencyTimeTrackingStore((s) => s.ensureTrackerDraft);
  const syncDraftFromActiveTimer = useAgencyTimeTrackingStore((s) => s.syncDraftFromActiveTimer);
  const startTimerAction = useAgencyTimeTrackingStore((s) => s.startTimer);
  const stopTimerAction = useAgencyTimeTrackingStore((s) => s.stopTimer);
  const updateActiveTimerStartAction = useAgencyTimeTrackingStore((s) => s.updateActiveTimerStart);
  const timerAdjustCount = useAgencyTimeTrackingStore((s) => s.timerAdjustCount);
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);
  const taskChooserOpenRequest = useAgencyTimeTrackingStore((s) => s.taskChooserOpenRequest);

  const [taskChooserOpen, setTaskChooserOpen] = useState(false);
  const [startTimePopoverOpen, setStartTimePopoverOpen] = useState(false);
  const [startTimeDraft, setStartTimeDraft] = useState<AgencyTimerStartDraft>(emptyStartDraft);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDraftRef = useRef<AgencyTimerStartDraft | null>(null);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksForChooserQuery(teamId);
  const recentEntriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 50);
  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);

  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.items ?? [];
  const activeTimer = activeTimerQuery.data?.timer ?? null;
  useAgencyTrackingFavicon(Boolean(activeTimer));
  const trackerDraft = useTrackerDraft(teamId);

  const selectedTaskId = trackerDraft?.taskId ?? "";
  const timerDescription = trackerDraft?.description ?? "";

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const cachedTask =
    selectedTask ??
    (selectedTaskId && teamId ? findProjectTaskInCache(teamId, selectedTaskId) : null);
  const selectedTaskTitle = activeTimer?.taskTitle ?? cachedTask?.title ?? null;
  const resolvedTimerTask = resolveAgencyTimerTaskRef({
    activeTimer,
    selectedTaskId,
    selectedTaskTitle,
    catalogTasks: tasks,
  });
  const recentEntryProjectId = recentEntriesQuery.data?.items[0]?.projectId ?? null;
  const startProject = resolveAgencyTimerStartProject({
    projects,
    selectedTaskProjectId: cachedTask?.projectId ?? selectedTask?.projectId ?? null,
    draftProjectId: trackerDraft?.projectId ?? "",
    recentEntryProjectId,
  });
  const activeTimerHasTask = Boolean(activeTimer?.taskId);
  const descriptionTrimmed = timerDescription.trim();
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

  // Tracker Start is idle-only; switching while running is done from task rows / restart / etc.
  const canStartTimer = Boolean(
    teamId &&
    !activeTimer &&
    canStartAgencyTimer({
      activeTimer: null,
      project: startProject,
    }),
  );
  const canStopTimer = canStopAgencyTimer({
    activeTimer,
    description: timerDescription,
    selectedTask: resolvedTimerTask,
  });

  const elapsedLabel = useAgencyElapsedTimer({
    startedAt: activeTimer?.startedAt,
    enabled: Boolean(activeTimer),
    format: "clock",
  });

  const startTimeDayLabel = useMemo(
    () => (startTimeDraft.date ? formatAgencyDayLabel(startTimeDraft.date) : ""),
    [startTimeDraft.date],
  );

  const startTimeError = useMemo(() => {
    if (!startTimeDraft.date || !startTimeDraft.startTime) return null;
    const result = activeTimerStartToIso(startTimeDraft.date, startTimeDraft.startTime);
    return "error" in result ? result.error : null;
  }, [startTimeDraft]);

  const persistStartDraft = useCallback(
    (draft: AgencyTimerStartDraft) => {
      if (!teamId || !activeTimer) return;
      const result = activeTimerStartToIso(draft.date, draft.startTime);
      if ("error" in result) return;
      const nextMs = new Date(result.startAt).getTime();
      const currentMs = new Date(activeTimer.startedAt).getTime();
      if (nextMs === currentMs) return;
      void updateActiveTimerStartAction({
        teamId,
        activeTimer,
        startedAt: result.startAt,
      });
    },
    [teamId, activeTimer, updateActiveTimerStartAction],
  );

  const flushStartDraftPersist = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const draft = pendingDraftRef.current ?? startTimeDraft;
    pendingDraftRef.current = null;
    persistStartDraft(draft);
  }, [persistStartDraft, startTimeDraft]);

  const scheduleStartDraftPersist = useCallback(
    (draft: AgencyTimerStartDraft) => {
      pendingDraftRef.current = draft;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pendingDraftRef.current = null;
        persistStartDraft(draft);
      }, START_TIME_DEBOUNCE_MS);
    },
    [persistStartDraft],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeTimer) {
      setStartTimePopoverOpen(false);
    }
  }, [activeTimer]);

  const descriptionSuggestions = useMemo(
    () => buildDescriptionSuggestions(recentEntriesQuery.data?.items ?? [], timerDescription),
    [recentEntriesQuery.data?.items, timerDescription],
  );

  useEffect(() => {
    if (selectedTaskId || activeTimerHasTask) {
      setTaskChooserOpen(false);
    }
  }, [activeTimerHasTask, selectedTaskId]);

  function revealTaskChooser() {
    setTaskChooserOpen(true);
  }

  async function startTimer() {
    if (!teamId || !startProject || !canStartTimer) return;

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
      if (descriptionTrimmed && !activeTimerHasTask && !resolvedTimerTask) revealTaskChooser();
      return;
    }

    await stopTimerAction({
      teamId,
      activeTimer,
      description: timerDescription,
      discard,
      task:
        !activeTimerHasTask && resolvedTimerTask
          ? { id: resolvedTimerTask.id, title: resolvedTimerTask.title }
          : null,
    });
  }

  const taskChooserLabel =
    activeTimer?.taskTitle ?? cachedTask?.title ?? selectedTask?.title ?? "Choose task";

  const trackerProjectId =
    activeTimer?.projectId ?? cachedTask?.projectId ?? selectedTask?.projectId ?? "";
  const trackerProject = projects.find((project) => project.id === trackerProjectId) ?? null;
  const trackerStatusLine =
    activeTimer || selectedTaskId
      ? `${trackerProject?.clientName ?? "Project"} · ${trackerProject?.name ?? taskChooserLabel}`
      : "Choose task";

  const stopButton = getAgencyTimerStopButtonPresentation({
    isPending: isTimerMutationPending,
    canStop: canStopTimer,
    descriptionTrimmed: Boolean(descriptionTrimmed),
  });
  const stopButtonLabel = stopButton.label;

  function onStartTimePopoverOpenChange(open: boolean) {
    if (open && activeTimer?.startedAt) {
      setStartTimeDraft(startedAtToDateTimeDraft(activeTimer.startedAt));
    } else if (!open) {
      flushStartDraftPersist();
    }
    setStartTimePopoverOpen(open);
  }

  function onStartTimeDraftChange(patch: Partial<AgencyTimerStartDraft>) {
    setStartTimeDraft((current) => {
      const next = { ...current, ...patch };
      const result = activeTimerStartToIso(next.date, next.startTime);
      if (!("error" in result)) {
        scheduleStartDraftPersist(next);
      }
      return next;
    });
  }

  return {
    teamId,
    timerDescription,
    selectedTaskId,
    taskChooserOpen,
    taskChooserLabel,
    taskChooserWarning: !activeTimerHasTask && !resolvedTimerTask && taskChooserOpen,
    projects,
    tasks,
    projectsLoading: projectsQuery.isPending,
    tasksLoading: tasksQuery.isPending,
    activeTimer,
    elapsedLabel,
    canStartTimer,
    canStopTimer,
    stopButtonLabel,
    stopButtonDisabled: !teamId || stopButton.disabled,
    stopButtonWarningRing: Boolean(activeTimer && !canStopTimer),
    isTimerMutationPending,
    isStartTimeSaving: timerAdjustCount > 0,
    startTimePopoverOpen,
    startTimeDraft,
    startTimeDayLabel,
    startTimeError,
    descriptionSuggestions,
    trackerStatusLine,
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
    onStartTimePopoverOpenChange,
    onStartTimeDraftChange,
    onStartTimer: () => void startTimer(),
    onStopTimer: () => void stopTimer(),
    onDiscardTimer: () => void stopTimer(true),
    onApplySuggestion: (suggestion) => {
      setTrackerDescription(teamId, suggestion.description);
      if (suggestion.taskId) {
        setTrackerTaskId(teamId, suggestion.taskId);
        const task = tasks.find((entry) => entry.id === suggestion.taskId);
        if (task) {
          setTrackerProjectId(teamId, task.projectId);
        }
      }
    },
  };
}
