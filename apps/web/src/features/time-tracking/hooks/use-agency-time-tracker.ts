import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import { setTrackingFavicon } from "@/lib/favicon";

import {
  buildDescriptionDatalistOptions,
  draftFromDescriptionSuggestion,
  type DescriptionDatalistOption,
} from "@/features/time-tracking/description-suggestions";
import { formatAgencyDayLabel } from "@/features/time-tracking/format-agency-day-label";
import { useAgencyElapsedTimer } from "@/features/time-tracking/hooks/use-agency-elapsed-timer";
import {
  canStartAgencyTimer,
  canStopAgencyTimer,
  getAgencyTimerStopBlockedMessage,
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
import { findProjectTaskInCache } from "@/features/shared/agency-query-cache";
import {
  activeTimerStartToIso,
  applyEndTimeToDraft,
  applyStartTimeToDraft,
  createDefaultManualTimeWindow,
  draftToIsoRange,
  elapsedDurationToStartedAt,
  formatClockTimeLabel,
  meridiemFromDraftTime,
  parseClockTimeLabel,
  parseDurationInput,
  startedAtToDateTimeDraft,
  validateTimeEntryDraft,
  type TimeEntryDraft,
} from "@/features/time-tracking/time-entry-draft";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
  useTrackerDraft,
} from "@/features/time-tracking/stores/agency-time-tracking";
import {
  createAgencyTag,
  useAgencyTagsQuery,
} from "@/features/time-tracking/hooks/use-agency-tags";
import type { AgencyTagOption } from "@/features/time-tracking/choosers/agency-tag-chooser";

const emptyElapsedDraft = "";

export type AgencyTrackerMode = "timer" | "manual";

export type AgencyManualTimeDraft = {
  date: string;
  startTime: string;
  endTime: string;
};

type UseAgencyTimeTrackerOptions = {
  teamId: string;
};

export type AgencyTimeTrackerViewModel = {
  teamId: string;
  timerDescription: string;
  selectedProjectId: string;
  selectedTaskId: string;
  selectedTagIds: string[];
  tags: AgencyTagOption[];
  tagCreatePending: boolean;
  isBillable: boolean;
  taskChooserOpen: boolean;
  taskChooserLabel: string;
  taskChooserWarning: boolean;
  /** Resolved project Start will use (and idle chooser should show). */
  startProject: Pick<AgencyProject, "id" | "name" | "clientName"> | null;
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
  stopButtonHint: string | null;
  stopButtonDisabled: boolean;
  startButtonDisabled: boolean;
  stopButtonWarningRing: boolean;
  isTimerMutationPending: boolean;
  isStartTimeSaving: boolean;
  elapsedEditing: boolean;
  elapsedDraft: string;
  elapsedError: string | null;
  startTimeEditorOpen: boolean;
  startTimeDraft: string;
  startTimeDayLabel: string;
  startTimeError: string | null;
  mode: AgencyTrackerMode;
  showModeToggle: boolean;
  manualDraft: AgencyManualTimeDraft;
  canAddManual: boolean;
  isManualCreatePending: boolean;
  manualError: string | null;
  descriptionDatalistOptions: DescriptionDatalistOption[];
  trackerStatusLine: string;
  onDescriptionChange: (value: string) => void;
  onDescriptionSuggestionSelect: (option: DescriptionDatalistOption) => void;
  onDescriptionFocus: () => void;
  onDescriptionBlur: () => void;
  onDescriptionKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onProjectChange: (projectId: string) => void;
  onTaskChange: (taskId: string) => void;
  onTagIdsChange: (tagIds: string[]) => void;
  onCreateTag: (name: string) => void;
  onIsBillableChange: (isBillable: boolean) => void;
  onTaskChooserOpenChange: (open: boolean) => void;
  onElapsedFocus: () => void;
  onElapsedChange: (value: string) => void;
  onElapsedBlur: (event: FocusEvent<HTMLInputElement>) => void;
  onElapsedKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onStartTimeEditorOpenChange: (open: boolean) => void;
  onStartTimeDraftChange: (value: string) => void;
  onStartTimeBlur: () => void;
  onStartTimeKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onModeChange: (mode: AgencyTrackerMode) => void;
  onManualStartTimeChange: (startTime: string) => void;
  onManualEndTimeChange: (endTime: string) => void;
  onManualDateChange: (date: string) => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onDiscardTimer: () => void;
  onAddManual: () => void;
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
  const setTrackerTagIds = useAgencyTimeTrackingStore((s) => s.setTrackerTagIds);
  const setTrackerIsBillable = useAgencyTimeTrackingStore((s) => s.setTrackerIsBillable);
  const ensureTrackerDraft = useAgencyTimeTrackingStore((s) => s.ensureTrackerDraft);
  const syncDraftFromActiveTimer = useAgencyTimeTrackingStore((s) => s.syncDraftFromActiveTimer);
  const flushActiveTimerDescription = useAgencyTimeTrackingStore(
    (s) => s.flushActiveTimerDescription,
  );
  const startTimerAction = useAgencyTimeTrackingStore((s) => s.startTimer);
  const stopTimerAction = useAgencyTimeTrackingStore((s) => s.stopTimer);
  const updateActiveTimerStartAction = useAgencyTimeTrackingStore((s) => s.updateActiveTimerStart);
  const createManualEntryAction = useAgencyTimeTrackingStore((s) => s.createManualEntry);
  const timerAdjustCount = useAgencyTimeTrackingStore((s) => s.timerAdjustCount);
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);
  const isManualCreatePending = useAgencyTimeTrackingStore((s) => s.manualCreateCount > 0);
  const taskChooserOpenRequest = useAgencyTimeTrackingStore((s) => s.taskChooserOpenRequest);

  const [taskChooserOpen, setTaskChooserOpen] = useState(false);
  const [elapsedEditing, setElapsedEditing] = useState(false);
  const [elapsedDraft, setElapsedDraft] = useState(emptyElapsedDraft);
  const [elapsedError, setElapsedError] = useState<string | null>(null);
  const [startTimeEditorOpen, setStartTimeEditorOpen] = useState(false);
  const [startTimeDraft, setStartTimeDraft] = useState("");
  const [startDateDraft, setStartDateDraft] = useState("");
  const [startTimeError, setStartTimeError] = useState<string | null>(null);
  const [mode, setMode] = useState<AgencyTrackerMode>("timer");
  const [manualDraft, setManualDraft] = useState<AgencyManualTimeDraft>(() => {
    const window = createDefaultManualTimeWindow();
    return { date: window.date, startTime: window.startTime, endTime: window.endTime };
  });
  const [descriptionFocused, setDescriptionFocused] = useState(false);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksForChooserQuery(teamId);
  const tagsQuery = useAgencyTagsQuery(teamId);
  const recentEntriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 50);
  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);
  const [tagCreatePending, setTagCreatePending] = useState(false);

  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.items ?? [];
  const tags = (tagsQuery.data?.items ?? []) as AgencyTagOption[];
  const activeTimer = activeTimerQuery.data?.timer ?? null;
  useAgencyTrackingFavicon(Boolean(activeTimer));
  const trackerDraft = useTrackerDraft(teamId);

  const selectedTaskId = trackerDraft?.taskId ?? "";
  const selectedTagIds = trackerDraft?.tagIds ?? [];
  const isBillable = trackerDraft?.isBillable ?? true;
  const timerDescription = trackerDraft?.description ?? "";

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const cachedTask =
    selectedTask ??
    (selectedTaskId && teamId ? findProjectTaskInCache(teamId, selectedTaskId) : null);
  const selectedProjectId =
    trackerDraft?.projectId ||
    activeTimer?.projectId ||
    cachedTask?.projectId ||
    selectedTask?.projectId ||
    "";
  const selectedTaskTitle =
    cachedTask?.title ?? selectedTask?.title ?? activeTimer?.taskTitle ?? null;
  const resolvedTimerTask = resolveAgencyTimerTaskRef({
    activeTimer,
    selectedTaskId,
    selectedTaskTitle,
    catalogTasks: tasks,
  });
  const startProject =
    resolveAgencyTimerStartProject({
      projects,
      selectedTaskProjectId: cachedTask?.projectId ?? selectedTask?.projectId ?? null,
    }) ??
    (selectedProjectId
      ? (projects.find((project) => project.id === selectedProjectId) ?? null)
      : null);
  const activeTimerHasTask = Boolean(activeTimer?.taskId);
  useEffect(() => {
    if (!teamId) return;
    ensureTrackerDraft(teamId);
  }, [teamId, ensureTrackerDraft]);

  useEffect(() => {
    if (!teamId) return;
    syncDraftFromActiveTimer(teamId, activeTimer, { skipDescription: descriptionFocused });
  }, [teamId, activeTimer, descriptionFocused, syncDraftFromActiveTimer]);

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
      selectedTask: cachedTask ? { id: cachedTask.id, title: cachedTask.title } : null,
      selectedTaskId,
      selectedTaskTitle,
      catalogTasks: tasks,
    }),
  );
  const stopBlockedMessage = activeTimer
    ? getAgencyTimerStopBlockedMessage({
        activeTimer: {
          taskId: activeTimer.taskId,
          taskTitle: activeTimer.taskTitle,
          description: activeTimer.description,
          projectId: activeTimer.projectId,
        },
        description: timerDescription,
        selectedTask: resolvedTimerTask,
        selectedTaskId,
        selectedTaskTitle,
        catalogTasks: tasks,
      })
    : null;
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

  const manualTimeEntryDraft = useMemo(
    (): TimeEntryDraft => ({
      projectId: selectedProjectId,
      taskId: selectedTaskId,
      tagIds: selectedTagIds,
      isBillable,
      date: manualDraft.date,
      startTime: manualDraft.startTime,
      endTime: manualDraft.endTime,
      durationInput: "",
      description: timerDescription,
    }),
    [isBillable, manualDraft, selectedProjectId, selectedTagIds, selectedTaskId, timerDescription],
  );

  const manualError = useMemo(
    () => validateTimeEntryDraft(manualTimeEntryDraft, { requireTask: false }),
    [manualTimeEntryDraft],
  );

  const manualProject =
    (startProject ? projects.find((project) => project.id === startProject.id) : null) ?? null;

  const canAddManual = Boolean(
    teamId &&
    !activeTimer &&
    mode === "manual" &&
    manualProject &&
    cachedTask &&
    !manualError &&
    !isManualCreatePending,
  );

  const showModeToggle = Boolean(teamId && !activeTimer);

  const persistElapsedDraft = useCallback(
    (draft: string) => {
      if (!teamId || !activeTimer) return false;
      const seconds = parseDurationInput(draft);
      if (seconds === null) {
        setElapsedError("Use hh:mm:ss or hh:mm.");
        return false;
      }
      const result = elapsedDurationToStartedAt(seconds);
      if ("error" in result) {
        setElapsedError(result.error);
        return false;
      }
      const nextMs = new Date(result.startAt).getTime();
      const currentMs = new Date(activeTimer.startedAt).getTime();
      setElapsedError(null);
      if (nextMs === currentMs) return true;
      void updateActiveTimerStartAction({
        teamId,
        activeTimer,
        startedAt: result.startAt,
      });
      return true;
    },
    [teamId, activeTimer, updateActiveTimerStartAction],
  );

  useEffect(() => {
    if (!activeTimer) {
      setElapsedEditing(false);
      setElapsedDraft(emptyElapsedDraft);
      setElapsedError(null);
      setStartTimeEditorOpen(false);
      setStartTimeDraft("");
      setStartDateDraft("");
      setStartTimeError(null);
      return;
    }
    setMode("timer");
  }, [activeTimer]);

  const syncStartDraftFromTimer = useCallback(() => {
    if (!activeTimer) return;
    const draft = startedAtToDateTimeDraft(activeTimer.startedAt);
    setStartDateDraft(draft.date);
    setStartTimeDraft(formatClockTimeLabel(draft.startTime));
    setStartTimeError(null);
  }, [activeTimer]);

  const persistStartTimeDraft = useCallback(
    (draftLabel: string) => {
      if (!teamId || !activeTimer) return false;
      const current = startedAtToDateTimeDraft(activeTimer.startedAt);
      const parsed = parseClockTimeLabel(draftLabel, {
        preferMeridiem: meridiemFromDraftTime(current.startTime),
      });
      if (!parsed) {
        setStartTimeError("Invalid start time.");
        setStartTimeDraft(formatClockTimeLabel(current.startTime));
        return false;
      }
      const date = startDateDraft || current.date;
      const result = activeTimerStartToIso(date, parsed);
      if ("error" in result) {
        setStartTimeError(result.error);
        setStartTimeDraft(formatClockTimeLabel(current.startTime));
        return false;
      }
      const nextMs = new Date(result.startAt).getTime();
      const currentMs = new Date(activeTimer.startedAt).getTime();
      setStartTimeError(null);
      setStartTimeDraft(formatClockTimeLabel(parsed));
      if (nextMs === currentMs) return true;
      void updateActiveTimerStartAction({
        teamId,
        activeTimer,
        startedAt: result.startAt,
      });
      return true;
    },
    [teamId, activeTimer, startDateDraft, updateActiveTimerStartAction],
  );

  const descriptionDatalistOptions = useMemo(
    () => buildDescriptionDatalistOptions(recentEntriesQuery.data?.items ?? []),
    [recentEntriesQuery.data?.items],
  );

  async function startTimer() {
    if (!teamId || !canStartTimer || activeTimer) return;

    await startTimerAction({
      teamId,
      project: startProject,
      task: cachedTask ? { id: cachedTask.id, title: cachedTask.title } : null,
      description: timerDescription,
      tagIds: trackerDraft?.tagIds,
      isBillable: trackerDraft?.isBillable,
    });
  }

  async function addManual() {
    if (!teamId || !manualProject || !cachedTask || !canAddManual) return;

    const range = draftToIsoRange(manualTimeEntryDraft);
    if ("error" in range) return;

    const created = await createManualEntryAction({
      teamId,
      project: {
        id: manualProject.id,
        name: manualProject.name,
        clientId: manualProject.clientId,
        clientName: manualProject.clientName,
      },
      task: { id: cachedTask.id, title: cachedTask.title },
      description: timerDescription,
      startAt: range.startAt,
      endAt: range.endAt,
      tagIds: trackerDraft?.tagIds,
      isBillable: trackerDraft?.isBillable,
    });

    if (!created) return;

    const window = createDefaultManualTimeWindow();
    setManualDraft({ date: window.date, startTime: window.startTime, endTime: window.endTime });
    setTrackerDescription(teamId, "");
  }

  function handleDescriptionChange(value: string) {
    setTrackerDescription(teamId, value);
  }

  function handleDescriptionSuggestionSelect(option: DescriptionDatalistOption) {
    const draft = draftFromDescriptionSuggestion(option);
    setTrackerDescription(teamId, draft.description);
    setTrackerTaskId(teamId, draft.taskId);
    setTrackerProjectId(teamId, draft.projectId);
  }

  function handleDescriptionKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && mode === "timer" && canStartTimer) {
      event.preventDefault();
      void startTimer();
    }
    if (event.key === "Enter" && mode === "manual" && canAddManual) {
      event.preventDefault();
      void addManual();
    }
  }

  function handleDescriptionBlur() {
    setDescriptionFocused(false);
    if (teamId && activeTimer) {
      void flushActiveTimerDescription(teamId);
    }
  }

  async function stopTimer(discard = false) {
    if (!teamId || !activeTimer) return;

    await flushActiveTimerDescription(teamId);

    await stopTimerAction({
      teamId,
      activeTimer,
      description: timerDescription,
      discard,
      task: resolvedTimerTask ? { id: resolvedTimerTask.id, title: resolvedTimerTask.title } : null,
      tagIds: trackerDraft?.tagIds,
      isBillable: trackerDraft?.isBillable,
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

  const stopPresentation = getAgencyTimerStopButtonPresentation({
    isPending: isTimerMutationPending,
    hasActiveTimer: Boolean(activeTimer),
  });
  const stopButtonLabel = stopPresentation.label;
  const stopButtonDisabled =
    !teamId || stopPresentation.disabled || !canStopTimer || Boolean(stopBlockedMessage);
  const stopButtonHint = stopBlockedMessage;

  const startButtonDisabled = !teamId || Boolean(activeTimer) || isTimerMutationPending;

  function onElapsedFocus() {
    setElapsedDraft(elapsedLabel ?? "00:00:00");
    setElapsedError(null);
    setElapsedEditing(true);
    syncStartDraftFromTimer();
    setStartTimeEditorOpen(true);
  }

  function onElapsedChange(value: string) {
    setElapsedDraft(value);
    if (elapsedError) setElapsedError(null);
  }

  function onElapsedBlur(_event: FocusEvent<HTMLInputElement>) {
    if (!elapsedEditing) return;
    const ok = persistElapsedDraft(elapsedDraft);
    if (ok) {
      setElapsedEditing(false);
      setElapsedDraft(emptyElapsedDraft);
    }
  }

  function onElapsedKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const ok = persistElapsedDraft(elapsedDraft);
      if (ok) {
        setElapsedEditing(false);
        setElapsedDraft(emptyElapsedDraft);
        event.currentTarget.blur();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setElapsedEditing(false);
      setElapsedDraft(emptyElapsedDraft);
      setElapsedError(null);
      setStartTimeEditorOpen(false);
      event.currentTarget.blur();
    }
  }

  function onStartTimeEditorOpenChange(open: boolean) {
    if (!open) {
      setStartTimeEditorOpen(false);
      setStartTimeError(null);
      return;
    }
    if (!activeTimer) return;
    syncStartDraftFromTimer();
    setStartTimeEditorOpen(true);
  }

  function onStartTimeDraftChange(value: string) {
    setStartTimeDraft(value);
    if (startTimeError) setStartTimeError(null);
  }

  function onStartTimeBlur() {
    void persistStartTimeDraft(startTimeDraft);
  }

  function onStartTimeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const ok = persistStartTimeDraft(startTimeDraft);
      if (ok) event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      syncStartDraftFromTimer();
      setStartTimeEditorOpen(false);
    }
  }

  const startTimeDayLabel = startDateDraft ? formatAgencyDayLabel(startDateDraft) : "";

  function onModeChange(nextMode: AgencyTrackerMode) {
    if (activeTimer) return;
    if (nextMode === "manual") {
      const window = createDefaultManualTimeWindow();
      setManualDraft({ date: window.date, startTime: window.startTime, endTime: window.endTime });
    }
    setMode(nextMode);
  }

  function onManualStartTimeChange(startTime: string) {
    setManualDraft((current) => {
      const next = applyStartTimeToDraft(
        {
          projectId: selectedProjectId,
          taskId: selectedTaskId,
          tagIds: selectedTagIds,
          isBillable,
          date: current.date,
          startTime: current.startTime,
          endTime: current.endTime,
          durationInput: "",
          description: timerDescription,
        },
        startTime,
      );
      return { date: next.date, startTime: next.startTime, endTime: next.endTime };
    });
  }

  function onManualEndTimeChange(endTime: string) {
    setManualDraft((current) => {
      const next = applyEndTimeToDraft(
        {
          projectId: selectedProjectId,
          taskId: selectedTaskId,
          tagIds: selectedTagIds,
          isBillable,
          date: current.date,
          startTime: current.startTime,
          endTime: current.endTime,
          durationInput: "",
          description: timerDescription,
        },
        endTime,
      );
      return { date: next.date, startTime: next.startTime, endTime: next.endTime };
    });
  }

  function onManualDateChange(date: string) {
    setManualDraft((current) => ({ ...current, date }));
  }

  return {
    teamId,
    timerDescription,
    selectedProjectId,
    selectedTaskId,
    selectedTagIds,
    tags,
    tagCreatePending,
    isBillable,
    taskChooserOpen,
    taskChooserLabel,
    taskChooserWarning: !activeTimerHasTask && !resolvedTimerTask && taskChooserOpen,
    startProject: manualProject,
    projects,
    tasks,
    projectsLoading: projectsQuery.isPending,
    tasksLoading: tasksQuery.isPending,
    activeTimer,
    elapsedLabel,
    canStartTimer,
    canStopTimer,
    stopButtonLabel,
    stopButtonHint,
    stopButtonDisabled,
    startButtonDisabled,
    stopButtonWarningRing: Boolean(stopBlockedMessage),
    isTimerMutationPending,
    isStartTimeSaving: timerAdjustCount > 0,
    elapsedEditing,
    elapsedDraft,
    elapsedError,
    startTimeEditorOpen,
    startTimeDraft,
    startTimeDayLabel,
    startTimeError,
    mode,
    showModeToggle,
    manualDraft,
    canAddManual,
    isManualCreatePending,
    manualError,
    descriptionDatalistOptions,
    trackerStatusLine,
    onDescriptionChange: handleDescriptionChange,
    onDescriptionSuggestionSelect: handleDescriptionSuggestionSelect,
    onDescriptionFocus: () => setDescriptionFocused(true),
    onDescriptionBlur: handleDescriptionBlur,
    onDescriptionKeyDown: handleDescriptionKeyDown,
    onProjectChange: (projectId) => {
      setTrackerProjectId(teamId, projectId);
      if (!projectId) {
        setTrackerTaskId(teamId, "");
        return;
      }
      if (selectedTask && selectedTask.projectId !== projectId) {
        setTrackerTaskId(teamId, "");
      }
    },
    onTaskChange: (value) => {
      const task = tasks.find((entry) => entry.id === value);
      if (task) {
        setTrackerProjectId(teamId, task.projectId);
      }
      setTrackerTaskId(teamId, value || "");
    },
    onTagIdsChange: (tagIds) => setTrackerTagIds(teamId, tagIds),
    onCreateTag: (name) => {
      if (!teamId || tagCreatePending) return;
      setTagCreatePending(true);
      void createAgencyTag(teamId, name)
        .then((created) => {
          setTrackerTagIds(teamId, [...new Set([...selectedTagIds, created.id])]);
        })
        .finally(() => setTagCreatePending(false));
    },
    onIsBillableChange: (next) => setTrackerIsBillable(teamId, next),
    onTaskChooserOpenChange: setTaskChooserOpen,
    onElapsedFocus,
    onElapsedChange,
    onElapsedBlur,
    onElapsedKeyDown,
    onStartTimeEditorOpenChange,
    onStartTimeDraftChange,
    onStartTimeBlur,
    onStartTimeKeyDown,
    onModeChange,
    onManualStartTimeChange,
    onManualEndTimeChange,
    onManualDateChange,
    onStartTimer: () => void startTimer(),
    onStopTimer: () => void stopTimer(),
    onDiscardTimer: () => void stopTimer(true),
    onAddManual: () => void addManual(),
  };
}
