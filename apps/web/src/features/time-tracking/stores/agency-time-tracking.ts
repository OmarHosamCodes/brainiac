import { create } from "zustand";
import { toast } from "sonner";

import { getQueryClient } from "@/lib/query-client";
import {
  cancelAgencyProjectTaskListQueries,
  findProjectTaskInCache,
  isAgencyTimeEntriesListQueryKey,
  patchActiveTimerInCache,
  patchUpdatedProjectTaskInCache,
  refetchAgencyActiveTimerQueries,
  refetchAgencyTimeEntriesListQueries,
} from "@/features/shared/agency-query-cache";
import { orpcClient } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  getAgencyTimerStartBlockedMessage,
  getAgencyTimerStopBlockedMessage,
} from "@/features/time-tracking/timer-validation";
import { type AgencyListOverlay } from "@/features/shared/agency-optimistic-merge";
import { useAgencyOptimisticStore } from "@/features/shared/stores/agency-optimistic";

type AgencyProjectTask = {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  createdAt: string;
  updatedAt: string;
};

type AgencyProjectSummary = {
  id: string;
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyActiveTimer = {
  id: string;
  teamId: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  projectName: string;
  description: string;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyTimeEntry = {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  projectName: string;
  clientId: string;
  clientName: string;
  source: "timer" | "manual";
  description: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
};

type AgencyWeekSummary = {
  startDate: string;
  endDate: string;
  totalSeconds: number;
  daily: Array<{
    date: string;
    totalSeconds: number;
  }>;
};

type AgencyActiveTimerQueryData = {
  timer: AgencyActiveTimer | null;
};

type QueryKey = readonly unknown[];

type AgencyTimeEntriesListQueryData = {
  items: AgencyTimeEntry[];
  page: number;
  pageSize: number;
  total: number;
  weekSummary: AgencyWeekSummary;
};

type TrackerDraft = {
  description: string;
  projectId: string;
  taskId: string;
  syncedTimerId: string | null;
};

type RegisteredActiveTimerQuery = {
  queryKey: QueryKey;
  teamId: string;
};

type RegisteredLogQuery = {
  queryKey: QueryKey;
  teamId: string;
  page: number;
};

type QuerySnapshot = {
  queryKey: QueryKey;
  data: unknown;
};

type StartTimerPayload = {
  teamId: string;
  project: Pick<AgencyProjectSummary, "id" | "name">;
  task: Pick<AgencyProjectTask, "id" | "title"> | null;
  description: string;
  successDescription?: string;
};

type StopTimerPayload = {
  teamId: string;
  description: string;
  discard?: boolean;
  activeTimer?: AgencyActiveTimer | null;
  task?: Pick<AgencyProjectTask, "id" | "title"> | null;
};

type UpdateActiveTimerStartPayload = {
  teamId: string;
  activeTimer: AgencyActiveTimer;
  startedAt: string;
};

type RestartEntryPayload = {
  teamId: string;
  project: Pick<AgencyProjectSummary, "id" | "name">;
  task: Pick<AgencyProjectTask, "id" | "title">;
  description: string;
};

type DeleteEntriesPayload = {
  teamId: string;
  entries: Array<Pick<AgencyTimeEntry, "id" | "startedAt" | "durationSeconds">>;
};

type UpdateEntryPayload = {
  teamId: string;
  entryId: string;
  /** Baseline from the UI list; preferred over cache lookup. */
  previousEntry?: AgencyTimeEntry;
  projectId: string;
  taskId: string | null;
  task: Pick<AgencyProjectTask, "id" | "title"> | null;
  project: Pick<AgencyProjectSummary, "id" | "name" | "clientId" | "clientName">;
  description: string;
  startAt: string;
  endAt: string;
  durationSeconds: number;
};

type DuplicateEntryPayload = {
  teamId: string;
  entry: AgencyTimeEntry;
};

type CreateManualEntryPayload = {
  teamId: string;
  project: Pick<AgencyProjectSummary, "id" | "name" | "clientId" | "clientName">;
  task: Pick<AgencyProjectTask, "id" | "title"> | null;
  description: string;
  startAt: string;
  endAt: string;
};

const OPTIMISTIC_CLIENT_ID = "optimistic-client";
const OPTIMISTIC_CLIENT_NAME = "Unknown client";
const OPTIMISTIC_USER_NAME = "You";

let cachedUserId = "unknown-user";

export function setAgencyTimeTrackingUserId(userId: string | null) {
  cachedUserId = userId ?? "unknown-user";
}

export function getAgencyTimeTrackingUserId() {
  return cachedUserId;
}

function getCurrentUserId() {
  return cachedUserId;
}

type AgencyTimeTrackingActions = ReturnType<typeof createAgencyTimeTrackingActions>;

type AgencyTimeTrackingState = {
  timerStartCount: number;
  timerStopCount: number;
  timerAdjustCount: number;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  duplicatingEntryIds: string[];
  manualCreateCount: number;
  trackerDraftsByTeam: Record<string, TrackerDraft>;
  lastHighlightedEntryId: string | null;
  taskChooserOpenRequest: number;
} & AgencyTimeTrackingActions;

function createAgencyTimeTrackingActions(
  set: (fn: (state: AgencyTimeTrackingState) => AgencyTimeTrackingState) => void,
  get: () => AgencyTimeTrackingState,
) {
  const activeTimerQueryRegistry = new Map<
    string,
    { payload: RegisteredActiveTimerQuery; count: number }
  >();
  const logQueryRegistry = new Map<string, { payload: RegisteredLogQuery; count: number }>();

  function optimistic() {
    return useAgencyOptimisticStore.getState();
  }

  function registerInto<T>(
    registry: Map<string, { payload: T; count: number }>,
    key: string,
    payload: T,
  ) {
    const existing = registry.get(key);
    if (existing) {
      existing.count += 1;
      existing.payload = payload;
    } else {
      registry.set(key, { payload, count: 1 });
    }
  }

  function unregisterFrom<T>(registry: Map<string, { payload: T; count: number }>, key: string) {
    const existing = registry.get(key);
    if (!existing) return;
    existing.count -= 1;
    if (existing.count <= 0) registry.delete(key);
  }

  function emptyTrackerDraft(): TrackerDraft {
    return {
      description: "",
      projectId: "",
      taskId: "",
      syncedTimerId: null,
    };
  }

  function ensureTrackerDraft(teamId: string) {
    if (!teamId) {
      return null;
    }

    const existingDraft = get().trackerDraftsByTeam[teamId];

    if (existingDraft) {
      return existingDraft;
    }

    const nextDraft = emptyTrackerDraft();

    set((s) => ({
      ...s,
      trackerDraftsByTeam: {
        ...s.trackerDraftsByTeam,
        [teamId]: nextDraft,
      },
    }));

    return nextDraft;
  }

  function setTrackerDescription(teamId: string, description: string) {
    if (!teamId) {
      return;
    }

    set((s) => {
      const existing = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();
      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: { ...existing, description },
        },
      };
    });
    mirrorTrackerDraftToActiveTimer(teamId);
  }

  function setTrackerProjectId(teamId: string, projectId: string) {
    if (!teamId) {
      return;
    }

    set((s) => {
      const existing = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();
      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: { ...existing, projectId },
        },
      };
    });
    mirrorTrackerDraftToActiveTimer(teamId);
  }

  function setTrackerTaskId(teamId: string, taskId: string) {
    if (!teamId) {
      return;
    }

    set((s) => {
      const existing = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();
      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: { ...existing, taskId },
        },
      };
    });
    mirrorTrackerDraftToActiveTimer(teamId);
  }

  function getActiveTimerForTeam(teamId: string): AgencyActiveTimer | null {
    const optimisticTimer = useAgencyOptimisticStore.getState().activeTimers[teamId];
    if (optimisticTimer) {
      return optimisticTimer;
    }

    const queryClient = getQueryClient();

    for (const query of queryClient.getQueryCache().findAll()) {
      const path = query.queryKey[0];
      if (
        !Array.isArray(path) ||
        path[0] !== "agencyOps" ||
        path[1] !== "timer" ||
        path[2] !== "getActive"
      ) {
        continue;
      }

      const cached = queryClient.getQueryData<AgencyActiveTimerQueryData>(query.queryKey);
      if (cached?.timer?.teamId === teamId) {
        return cached.timer;
      }
    }

    return null;
  }

  function mirrorTrackerDraftToActiveTimer(teamId: string) {
    if (!teamId) {
      return;
    }

    const draft = get().trackerDraftsByTeam[teamId];
    if (!draft) {
      return;
    }

    const activeTimer = getActiveTimerForTeam(teamId);
    if (!activeTimer || draft.syncedTimerId !== activeTimer.id) {
      return;
    }

    const taskId = draft.taskId.trim() || null;
    const cachedTask = taskId ? findProjectTaskInCache(teamId, taskId) : null;
    const projectId = cachedTask?.projectId ?? (draft.projectId || activeTimer.projectId);

    patchActiveTimerCaches({
      ...activeTimer,
      description: draft.description,
      taskId,
      taskTitle: cachedTask?.title ?? (taskId ? activeTimer.taskTitle : null),
      projectId,
      projectName: activeTimer.projectName,
      updatedAt: new Date().toISOString(),
    });
  }

  function syncDraftFromActiveTimer(teamId: string, timer: AgencyActiveTimer | null) {
    if (!teamId) {
      return;
    }

    set((s) => {
      const draft = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();

      if (!timer) {
        if (draft.syncedTimerId === null) {
          return s;
        }

        return {
          ...s,
          trackerDraftsByTeam: {
            ...s.trackerDraftsByTeam,
            [teamId]: { ...draft, syncedTimerId: null },
          },
        };
      }

      if (draft.syncedTimerId === timer.id) {
        return s;
      }

      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: {
            description: timer.description,
            projectId: timer.projectId,
            taskId: timer.taskId ?? draft.taskId ?? "",
            syncedTimerId: timer.id,
          },
        },
      };
    });
  }

  function patchTrackerDraft(teamId: string, patch: Partial<TrackerDraft>) {
    if (!teamId) {
      return;
    }

    set((s) => {
      const existing = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();
      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: { ...existing, ...patch },
        },
      };
    });
  }

  function registerActiveTimerQuery(payload: RegisteredActiveTimerQuery) {
    registerInto(activeTimerQueryRegistry, getRegistryKey(payload.queryKey), payload);
  }

  function unregisterActiveTimerQuery(queryKey: QueryKey) {
    unregisterFrom(activeTimerQueryRegistry, getRegistryKey(queryKey));
  }

  function registerLogQuery(payload: RegisteredLogQuery) {
    registerInto(logQueryRegistry, getRegistryKey(payload.queryKey), payload);
  }

  function unregisterLogQuery(queryKey: QueryKey) {
    unregisterFrom(logQueryRegistry, getRegistryKey(queryKey));
  }

  function captureTimerOverlaySnapshots(teamIds: Iterable<string>) {
    const snapshots = new Map<string, AgencyActiveTimer | null | undefined>();
    for (const teamId of teamIds) {
      snapshots.set(teamId, optimistic().snapshotActiveTimer(teamId));
    }
    return snapshots;
  }

  function restoreTimerOverlaySnapshots(
    snapshots: Map<string, AgencyActiveTimer | null | undefined>,
  ) {
    for (const [teamId, snapshot] of snapshots) {
      optimistic().restoreActiveTimer(teamId, snapshot);
    }
  }

  function captureEntryOverlaySnapshots(teamIds: Iterable<string>) {
    const snapshots = new Map<string, AgencyListOverlay<AgencyTimeEntry>>();
    for (const teamId of teamIds) {
      snapshots.set(teamId, optimistic().snapshotTimeEntries(teamId));
    }
    return snapshots;
  }

  function restoreEntryOverlaySnapshots(
    snapshots: Map<string, AgencyListOverlay<AgencyTimeEntry>>,
  ) {
    for (const [teamId, snapshot] of snapshots) {
      optimistic().restoreTimeEntries(teamId, snapshot);
    }
  }

  async function startTimer(payload: StartTimerPayload) {
    const previousActiveTimer = getCachedActiveTimer();
    // Prefer tracker draft for the running timer's team so typed desc/task unlock switch.
    const previousTimerDraft = previousActiveTimer
      ? get().trackerDraftsByTeam[previousActiveTimer.teamId]
      : null;
    const previousDraftTaskId = previousTimerDraft?.taskId?.trim() ?? "";
    const previousDraftTask =
      !previousActiveTimer?.taskId && previousDraftTaskId
        ? { id: previousDraftTaskId, title: "" }
        : null;
    const startBlockedMessage = getAgencyTimerStartBlockedMessage({
      activeTimer: previousActiveTimer,
      project: payload.project,
      description: previousTimerDraft?.description ?? previousActiveTimer?.description,
      selectedTask: previousDraftTask,
    });

    if (startBlockedMessage) {
      toast.error("Can't start timer", { description: startBlockedMessage });
      return;
    }

    // Stop-then-start so draft description/task are saved; API start rollover only uses DB fields.
    if (previousActiveTimer) {
      const stopDescription =
        previousTimerDraft?.description ?? previousActiveTimer.description ?? "";
      let stopTask: { id: string; title: string } | null = null;

      if (previousActiveTimer.taskId) {
        stopTask = {
          id: previousActiveTimer.taskId,
          title: previousActiveTimer.taskTitle ?? "",
        };
      } else if (previousDraftTaskId) {
        const cachedTask =
          optimistic().findTask(previousActiveTimer.teamId, previousDraftTaskId) ??
          findProjectTaskInCache(previousActiveTimer.teamId, previousDraftTaskId);
        stopTask = {
          id: previousDraftTaskId,
          title: cachedTask?.title ?? "",
        };
      }

      await stopTimer({
        teamId: previousActiveTimer.teamId,
        activeTimer: previousActiveTimer,
        description: stopDescription,
        task: stopTask,
      });

      if (getCachedActiveTimer()) {
        return;
      }
    }

    const previousDraft = getTrackerDraftSnapshot(payload.teamId);
    const affectedLogTeams = new Set<string>([payload.teamId]);
    const timerSnapshots = snapshotQueries(
      [...activeTimerQueryRegistry.values()].map((entry) => entry.payload),
    );

    const logSnapshots = snapshotQueries(getRegisteredLogQueries(affectedLogTeams));
    const timerOverlaySnapshots = captureTimerOverlaySnapshots([payload.teamId]);
    const entryOverlaySnapshots = captureEntryOverlaySnapshots(affectedLogTeams);
    const taskOverlaySnapshot = optimistic().snapshotTasks(payload.teamId);
    const nowIso = new Date().toISOString();
    const optimisticTimer = createOptimisticTimer({
      teamId: payload.teamId,
      project: payload.project,
      task: payload.task,
      description: payload.description,
      startedAt: nowIso,
    });
    const draft = ensureTrackerDraft(payload.teamId);

    if (!draft) {
      return;
    }

    set((s) => ({ ...s, timerStartCount: s.timerStartCount + 1 }));

    try {
      await cancelQueries([...activeTimerQueryRegistry.values()].map((entry) => entry.payload));
      await cancelQueries(getRegisteredLogQueries(affectedLogTeams));

      patchActiveTimerCaches(optimisticTimer);

      patchTrackerDraft(payload.teamId, {
        description: optimisticTimer.description,
        projectId: optimisticTimer.projectId,
        taskId: optimisticTimer.taskId ?? "",
        syncedTimerId: optimisticTimer.id,
      });

      // Server promotes open → in_progress on timer start; mirror that in the task rail.
      if (payload.task) {
        const cachedTask =
          optimistic().findTask(payload.teamId, payload.task.id) ??
          findProjectTaskInCache(payload.teamId, payload.task.id);
        if (cachedTask && cachedTask.status === "open") {
          await cancelAgencyProjectTaskListQueries(payload.teamId);
          const inProgressTask = {
            ...cachedTask,
            status: "in_progress" as const,
            viewerStatus: "in_progress" as const,
            updatedAt: nowIso,
          };
          optimistic().upsertTask(payload.teamId, inProgressTask);
          patchUpdatedProjectTaskInCache(payload.teamId, inProgressTask);
        }
      }

      const result = (await orpcClient.agencyOps.timer.start({
        teamId: payload.teamId,
        projectId: payload.project.id,
        ...(payload.task ? { taskId: payload.task.id } : {}),
        description: payload.description.trim(),
      })) as {
        timer: AgencyActiveTimer | null;
        createdEntry: AgencyTimeEntry | null;
      };

      patchActiveTimerCaches(result.timer);
      syncDraftFromActiveTimer(payload.teamId, result.timer);

      void refetchAgencyActiveTimerQueries(payload.teamId);
      // Do not refetch task lists here: it races the in_progress optimistic
      // patch and flashes status back to open.
      void refetchAgencyTimeEntriesListQueries(payload.teamId);

      toast.success("Timer started", { description: payload.successDescription });
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);
      restoreQuerySnapshots(logSnapshots);
      restoreTimerOverlaySnapshots(timerOverlaySnapshots);
      restoreEntryOverlaySnapshots(entryOverlaySnapshots);
      optimistic().restoreTasks(payload.teamId, taskOverlaySnapshot);
      restoreTrackerDraft(payload.teamId, previousDraft);

      toast.error("Unable to start timer", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({ ...s, timerStartCount: Math.max(0, s.timerStartCount - 1) }));
    }
  }

  async function restartEntry(payload: RestartEntryPayload) {
    await startTimer({
      teamId: payload.teamId,
      project: payload.project,
      task: payload.task,
      description: payload.description,
      successDescription: `Tracking ${payload.description || "time"}.`,
    });
  }

  async function stopTimer(payload: StopTimerPayload) {
    const activeTimer = payload.activeTimer ?? getCachedActiveTimer();

    if (!activeTimer) {
      return;
    }

    if (!payload.discard) {
      const stopBlockedMessage = getAgencyTimerStopBlockedMessage({
        activeTimer,
        description: payload.description,
        selectedTask: payload.task ?? null,
      });

      if (stopBlockedMessage) {
        toast.error("Can't stop timer", { description: stopBlockedMessage });
        return;
      }
    }

    const previousDraft = getTrackerDraftSnapshot(payload.teamId);
    const timerSnapshots = snapshotQueries(
      [...activeTimerQueryRegistry.values()].map((entry) => entry.payload),
    );
    const affectedLogTeams = new Set<string>([activeTimer.teamId]);
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(affectedLogTeams));
    const timerOverlaySnapshots = captureTimerOverlaySnapshots([activeTimer.teamId]);
    const entryOverlaySnapshots = captureEntryOverlaySnapshots(affectedLogTeams);
    const description = payload.description.trim();
    const selectedTask = payload.task ?? null;
    const optimisticEntry = payload.discard
      ? null
      : createOptimisticEntryFromTimer(activeTimer, {
          endedAt: new Date().toISOString(),
          description: description || activeTimer.description,
          taskId: selectedTask?.id ?? activeTimer.taskId,
          taskTitle: selectedTask?.title ?? activeTimer.taskTitle,
        });
    const draft = ensureTrackerDraft(payload.teamId);

    if (!draft) {
      return;
    }

    set((s) => ({ ...s, timerStopCount: s.timerStopCount + 1 }));

    try {
      await cancelQueries([...activeTimerQueryRegistry.values()].map((entry) => entry.payload));
      await cancelQueries(getRegisteredLogQueries(affectedLogTeams));

      if (optimisticEntry) {
        patchInsertedEntry(activeTimer.teamId, optimisticEntry);
      }

      patchActiveTimerCaches(null);

      patchTrackerDraft(
        payload.teamId,
        payload.discard
          ? emptyTrackerDraft()
          : { ...emptyTrackerDraft(), projectId: activeTimer.projectId },
      );

      const result = (await orpcClient.agencyOps.timer.stop({
        teamId: payload.teamId,
        taskId: selectedTask?.id,
        description,
        discard: payload.discard,
      })) as {
        timer: AgencyActiveTimer | null;
        createdEntry: AgencyTimeEntry | null;
      };

      patchActiveTimerCaches(result.timer);

      if (optimisticEntry && result.createdEntry) {
        reconcileCreatedEntry(activeTimer.teamId, optimisticEntry.id, result.createdEntry);
      } else if (optimisticEntry && !result.createdEntry) {
        patchDeletedEntries(activeTimer.teamId, [optimisticEntry]);
      }

      void refetchAgencyActiveTimerQueries(activeTimer.teamId);
      if (!payload.discard) {
        void refetchAgencyTimeEntriesListQueries(activeTimer.teamId);
        const highlightedEntryId = result.createdEntry?.id ?? optimisticEntry?.id ?? null;
        if (highlightedEntryId) {
          set((s) => ({ ...s, lastHighlightedEntryId: highlightedEntryId }));
        }
      }

      toast.success(payload.discard ? "Timer discarded" : "Timer stopped");
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);
      restoreQuerySnapshots(logSnapshots);
      restoreTimerOverlaySnapshots(timerOverlaySnapshots);
      restoreEntryOverlaySnapshots(entryOverlaySnapshots);
      restoreTrackerDraft(payload.teamId, previousDraft);

      toast.error(payload.discard ? "Unable to discard timer" : "Unable to stop timer", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({ ...s, timerStopCount: Math.max(0, s.timerStopCount - 1) }));
    }
  }

  async function updateActiveTimerStart(payload: UpdateActiveTimerStartPayload) {
    const nextMs = new Date(payload.startedAt).getTime();
    const currentMs = new Date(payload.activeTimer.startedAt).getTime();
    if (!Number.isNaN(nextMs) && !Number.isNaN(currentMs) && nextMs === currentMs) {
      return;
    }

    const timerSnapshots = snapshotQueries(
      [...activeTimerQueryRegistry.values()].map((entry) => entry.payload),
    );
    const timerOverlaySnapshots = captureTimerOverlaySnapshots([payload.teamId]);
    const optimisticTimer: AgencyActiveTimer = {
      ...payload.activeTimer,
      startedAt: payload.startedAt,
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({ ...s, timerAdjustCount: s.timerAdjustCount + 1 }));

    try {
      patchActiveTimerCaches(optimisticTimer);

      const result = (await orpcClient.agencyOps.timer.updateStart({
        teamId: payload.teamId,
        startedAt: payload.startedAt,
      })) as { timer: AgencyActiveTimer };

      patchActiveTimerCaches(result.timer);
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);
      restoreTimerOverlaySnapshots(timerOverlaySnapshots);

      toast.error("Unable to update start time", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({ ...s, timerAdjustCount: Math.max(0, s.timerAdjustCount - 1) }));
    }
  }

  async function deleteEntries(payload: DeleteEntriesPayload) {
    if (payload.entries.length === 0) {
      return;
    }

    const uniqueEntries = dedupeEntries(payload.entries);
    const ids = uniqueEntries.map((entry) => entry.id);
    const previousDeletingIds = [...get().deletingEntryIds];
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(new Set([payload.teamId])));
    const entryOverlaySnapshot = optimistic().snapshotTimeEntries(payload.teamId);

    set((s) => ({ ...s, deletingEntryIds: [...new Set([...get().deletingEntryIds, ...ids])] }));

    try {
      patchDeletedEntries(payload.teamId, uniqueEntries);

      await Promise.all(
        ids.map((entryId) =>
          orpcClient.agencyOps.timeEntries.deleteMine({
            teamId: payload.teamId,
            entryId,
          }),
        ),
      );
    } catch (error) {
      restoreQuerySnapshots(logSnapshots);
      optimistic().restoreTimeEntries(payload.teamId, entryOverlaySnapshot);

      toast.error(ids.length > 1 ? "Unable to delete entries" : "Unable to delete entry", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({ ...s, deletingEntryIds: previousDeletingIds }));
    }
  }

  function getRegistryKey(queryKey: QueryKey) {
    return JSON.stringify(queryKey);
  }

  function getCachedActiveTimer() {
    const optimisticState = useAgencyOptimisticStore.getState();
    for (const timer of Object.values(optimisticState.activeTimers)) {
      if (timer !== undefined) {
        return timer;
      }
    }

    const queryClient = getQueryClient();

    for (const query of queryClient.getQueryCache().findAll()) {
      const path = query.queryKey[0];
      if (
        !Array.isArray(path) ||
        path[0] !== "agencyOps" ||
        path[1] !== "timer" ||
        path[2] !== "getActive"
      ) {
        continue;
      }
      const cached = queryClient.getQueryData<AgencyActiveTimerQueryData>(query.queryKey);
      if (cached?.timer) {
        return cached.timer;
      }
    }

    return null;
  }

  function getTrackerDraftSnapshot(teamId: string) {
    const existingDraft = get().trackerDraftsByTeam[teamId];

    if (!existingDraft) {
      return null;
    }

    return { ...existingDraft } satisfies TrackerDraft;
  }

  function restoreTrackerDraft(teamId: string, snapshot: TrackerDraft | null) {
    set((s) => {
      if (!snapshot) {
        const { [teamId]: _removed, ...rest } = s.trackerDraftsByTeam;
        return { ...s, trackerDraftsByTeam: rest };
      }

      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: { ...snapshot },
        },
      };
    });
  }

  function createOptimisticId(prefix: string) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function createOptimisticTimer(payload: {
    teamId: string;
    project: Pick<AgencyProjectSummary, "id" | "name">;
    task: Pick<AgencyProjectTask, "id" | "title"> | null;
    description: string;
    startedAt: string;
  }) {
    return {
      id: createOptimisticId("agency-active-timer"),
      teamId: payload.teamId,
      userId: getCurrentUserId(),
      projectId: payload.project.id,
      taskId: payload.task?.id ?? null,
      taskTitle: payload.task?.title ?? null,
      projectName: payload.project.name,
      description: payload.description.trim(),
      startedAt: payload.startedAt,
      createdAt: payload.startedAt,
      updatedAt: payload.startedAt,
    } satisfies AgencyActiveTimer;
  }

  function createOptimisticEntryFromTimer(
    timer: AgencyActiveTimer,
    overrides: {
      endedAt: string;
      description?: string;
      clientId?: string;
      clientName?: string;
      taskId?: string | null;
      taskTitle?: string | null;
    },
  ) {
    return {
      id: createOptimisticId("agency-time"),
      teamId: timer.teamId,
      userId: timer.userId,
      userName: OPTIMISTIC_USER_NAME,
      projectId: timer.projectId,
      taskId: overrides.taskId ?? timer.taskId,
      taskTitle: overrides.taskTitle ?? timer.taskTitle,
      projectName: timer.projectName,
      clientId: overrides.clientId ?? OPTIMISTIC_CLIENT_ID,
      clientName: overrides.clientName ?? OPTIMISTIC_CLIENT_NAME,
      source: "timer",
      description: overrides.description ?? timer.description,
      startedAt: timer.startedAt,
      endedAt: overrides.endedAt,
      durationSeconds: getDurationSeconds(timer.startedAt, overrides.endedAt),
      createdAt: overrides.endedAt,
      updatedAt: overrides.endedAt,
    } satisfies AgencyTimeEntry;
  }

  function createOptimisticDuplicateEntry(source: AgencyTimeEntry) {
    const now = new Date().toISOString();

    return {
      ...source,
      id: createOptimisticId("agency-time"),
      source: "manual",
      createdAt: now,
      updatedAt: now,
    } satisfies AgencyTimeEntry;
  }

  function createOptimisticManualEntry(payload: CreateManualEntryPayload) {
    const now = new Date().toISOString();
    const description = payload.description.trim();

    return {
      id: createOptimisticId("agency-time"),
      teamId: payload.teamId,
      userId: getCurrentUserId(),
      userName: OPTIMISTIC_USER_NAME,
      projectId: payload.project.id,
      taskId: payload.task?.id ?? null,
      taskTitle: payload.task?.title ?? null,
      projectName: payload.project.name,
      clientId: payload.project.clientId,
      clientName: payload.project.clientName,
      source: "manual",
      description,
      startedAt: payload.startAt,
      endedAt: payload.endAt,
      durationSeconds: getDurationSeconds(payload.startAt, payload.endAt),
      createdAt: now,
      updatedAt: now,
    } satisfies AgencyTimeEntry;
  }

  function getDurationSeconds(startedAt: string, endedAt: string) {
    const startedAtMs = new Date(startedAt).getTime();
    const endedAtMs = new Date(endedAt).getTime();

    if (Number.isNaN(startedAtMs) || Number.isNaN(endedAtMs)) {
      return 1;
    }

    return Math.max(1, Math.floor((endedAtMs - startedAtMs) / 1_000));
  }

  function snapshotQueries(queries: Iterable<{ queryKey: QueryKey }>) {
    return [...queries].map((query) => ({
      queryKey: query.queryKey,
      data: getQueryClient().getQueryData(query.queryKey),
    })) satisfies QuerySnapshot[];
  }

  function restoreQuerySnapshots(snapshots: QuerySnapshot[]) {
    snapshots.forEach((snapshot) => {
      getQueryClient().setQueryData(snapshot.queryKey, snapshot.data);
    });
  }

  async function cancelQueries(queries: Iterable<{ queryKey: QueryKey }>) {
    await Promise.all(
      [...queries].map((query) => getQueryClient().cancelQueries({ queryKey: query.queryKey })),
    );
  }

  function emptyTimeEntriesList(page: number, pageSize = 20): AgencyTimeEntriesListQueryData {
    return {
      items: [],
      page,
      pageSize,
      total: 0,
      weekSummary: {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        totalSeconds: 0,
        daily: [],
      },
    };
  }

  function getRegisteredLogQueries(teamIds: Set<string>) {
    return [...logQueryRegistry.values()]
      .map((entry) => entry.payload)
      .filter((registeredQuery) => teamIds.has(registeredQuery.teamId));
  }

  function patchActiveTimerCaches(timer: AgencyActiveTimer | null) {
    if (timer?.teamId) {
      optimistic().setActiveTimer(timer.teamId, timer);
      patchActiveTimerInCache(timer.teamId, timer);
      return;
    }

    for (const { payload: registeredQuery } of activeTimerQueryRegistry.values()) {
      optimistic().setActiveTimer(registeredQuery.teamId, null);
      patchActiveTimerInCache(registeredQuery.teamId, null);
    }
  }

  function patchInsertedEntry(teamId: string, entry: AgencyTimeEntry) {
    optimistic().upsertTimeEntry(teamId, entry);
    logQueryRegistry.forEach(({ payload: registeredQuery }) => {
      if (registeredQuery.teamId !== teamId) {
        return;
      }

      getQueryClient().setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current) => {
          const base = current ?? emptyTimeEntriesList(registeredQuery.page);

          return {
            ...base,
            items:
              registeredQuery.page === 1
                ? [entry, ...base.items].slice(0, base.pageSize)
                : base.items,
            total: base.total + 1,
            weekSummary: updateWeekSummary(base.weekSummary, entry, 1),
          };
        },
      );
    });
  }

  function patchDeletedEntries(
    teamId: string,
    entries: Array<Pick<AgencyTimeEntry, "id" | "startedAt" | "durationSeconds">>,
  ) {
    optimistic().deleteTimeEntries(
      teamId,
      entries.map((entry) => entry.id),
    );
    const deletedIds = new Set(entries.map((entry) => entry.id));

    logQueryRegistry.forEach(({ payload: registeredQuery }) => {
      if (registeredQuery.teamId !== teamId) {
        return;
      }

      getQueryClient().setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            items: current.items.filter((entry) => !deletedIds.has(entry.id)),
            total: Math.max(0, current.total - entries.length),
            weekSummary: entries.reduce(
              (summary, entry) => updateWeekSummary(summary, entry, -1),
              current.weekSummary,
            ),
          };
        },
      );
    });
  }

  function updateWeekSummary(
    weekSummary: AgencyWeekSummary,
    entry: Pick<AgencyTimeEntry, "startedAt" | "durationSeconds">,
    direction: 1 | -1,
  ) {
    const startedAtMs = new Date(entry.startedAt).getTime();
    const weekStartMs = new Date(weekSummary.startDate).getTime();
    const weekEndMs = new Date(weekSummary.endDate).getTime();

    if (
      Number.isNaN(startedAtMs) ||
      Number.isNaN(weekStartMs) ||
      Number.isNaN(weekEndMs) ||
      startedAtMs < weekStartMs ||
      startedAtMs > weekEndMs
    ) {
      return weekSummary;
    }

    const dateKey = entry.startedAt.slice(0, 10);
    const nextTotals = new Map(
      weekSummary.daily.map((dailyEntry) => [dailyEntry.date, dailyEntry.totalSeconds]),
    );
    const nextTotalSeconds = Math.max(
      0,
      weekSummary.totalSeconds + direction * entry.durationSeconds,
    );
    const nextDailyTotal = Math.max(
      0,
      (nextTotals.get(dateKey) ?? 0) + direction * entry.durationSeconds,
    );

    if (nextDailyTotal > 0) {
      nextTotals.set(dateKey, nextDailyTotal);
    } else {
      nextTotals.delete(dateKey);
    }

    return {
      ...weekSummary,
      totalSeconds: nextTotalSeconds,
      daily: [...nextTotals.entries()]
        .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
        .map(([date, totalSeconds]) => ({ date, totalSeconds })),
    };
  }

  function reconcileCreatedEntry(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyTimeEntry,
  ) {
    optimistic().reconcileTimeEntry(teamId, optimisticIdValue, created);
    logQueryRegistry.forEach(({ payload: registeredQuery }) => {
      if (registeredQuery.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current) => {
          const base = current ?? emptyTimeEntriesList(registeredQuery.page);
          const hasOptimistic = base.items.some((item) => item.id === optimisticIdValue);
          if (hasOptimistic) {
            return {
              ...base,
              items: base.items.map((item) => (item.id === optimisticIdValue ? created : item)),
            };
          }
          if (base.items.some((item) => item.id === created.id)) {
            return {
              ...base,
              items: base.items.map((item) => (item.id === created.id ? created : item)),
            };
          }
          return {
            ...base,
            items:
              registeredQuery.page === 1
                ? [created, ...base.items].slice(0, base.pageSize)
                : base.items,
            total: base.total + 1,
            weekSummary: updateWeekSummary(base.weekSummary, created, 1),
          };
        },
      );
    });
  }

  function patchUpdatedEntry(teamId: string, previous: AgencyTimeEntry, next: AgencyTimeEntry) {
    optimistic().upsertTimeEntry(teamId, next);

    logQueryRegistry.forEach(({ payload: registeredQuery }) => {
      if (registeredQuery.teamId !== teamId) {
        return;
      }

      getQueryClient().setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current) => {
          if (!current) {
            return current;
          }

          const hasEntry = current.items.some((item) => item.id === next.id);
          if (!hasEntry) {
            return current;
          }

          return {
            ...current,
            items: current.items.map((item) => (item.id === next.id ? next : item)),
            weekSummary: updateWeekSummary(
              updateWeekSummary(current.weekSummary, previous, -1),
              next,
              1,
            ),
          };
        },
      );
    });
  }

  function createOptimisticUpdatedEntry(
    payload: UpdateEntryPayload,
    previous: AgencyTimeEntry,
  ): AgencyTimeEntry {
    return {
      ...previous,
      projectId: payload.project.id,
      projectName: payload.project.name,
      clientId: payload.project.clientId,
      clientName: payload.project.clientName,
      taskId: payload.taskId,
      taskTitle: payload.task?.title ?? null,
      description: payload.description.trim(),
      startedAt: payload.startAt,
      endedAt: payload.endAt,
      durationSeconds: payload.durationSeconds,
      updatedAt: new Date().toISOString(),
    };
  }

  function findTimeEntry(teamId: string, entryId: string): AgencyTimeEntry | null {
    for (const { payload: registeredQuery } of logQueryRegistry.values()) {
      if (registeredQuery.teamId !== teamId) continue;
      const cached = getQueryClient().getQueryData<AgencyTimeEntriesListQueryData>(
        registeredQuery.queryKey,
      );
      const found = cached?.items.find((item) => item.id === entryId);
      if (found) return found;
    }

    // Full cache scan: registry can miss keepPreviousData / unregistered observers.
    for (const query of getQueryClient().getQueryCache().findAll()) {
      if (!isAgencyTimeEntriesListQueryKey(query.queryKey, teamId)) continue;
      const cached = getQueryClient().getQueryData<AgencyTimeEntriesListQueryData>(query.queryKey);
      const found = cached?.items.find((item) => item.id === entryId);
      if (found) return found;
    }

    const overlay = optimistic().timeEntries[teamId];
    if (!overlay) return null;
    if (overlay.upserts[entryId]) return overlay.upserts[entryId] as AgencyTimeEntry;
    for (const [optimisticId, realId] of Object.entries(overlay.idMap)) {
      if (realId !== entryId) continue;
      const upsert = overlay.upserts[optimisticId] ?? overlay.upserts[realId];
      if (upsert) return { ...upsert, id: entryId } as AgencyTimeEntry;
    }
    return null;
  }

  async function duplicateEntry(payload: DuplicateEntryPayload) {
    const { teamId, entry } = payload;
    const previousDuplicatingIds = [...get().duplicatingEntryIds];
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(new Set([teamId])));
    const entryOverlaySnapshot = optimistic().snapshotTimeEntries(teamId);
    const optimisticEntry = createOptimisticDuplicateEntry(entry);

    set((s) => ({
      ...s,
      duplicatingEntryIds: [...new Set([...s.duplicatingEntryIds, entry.id])],
    }));

    try {
      patchInsertedEntry(teamId, optimisticEntry);

      const created = (await orpcClient.agencyOps.timeEntries.createManual({
        teamId,
        projectId: entry.projectId,
        taskId: entry.taskId ?? undefined,
        startAt: entry.startedAt,
        endAt: entry.endedAt,
        description: entry.description,
      })) as AgencyTimeEntry;

      reconcileCreatedEntry(teamId, optimisticEntry.id, created);
      set((s) => ({ ...s, lastHighlightedEntryId: created.id }));
    } catch (error) {
      patchDeletedEntries(teamId, [optimisticEntry]);
      restoreQuerySnapshots(logSnapshots);
      optimistic().restoreTimeEntries(teamId, entryOverlaySnapshot);

      toast.error("Unable to duplicate entry", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({ ...s, duplicatingEntryIds: previousDuplicatingIds }));
    }
  }

  async function createManualEntry(payload: CreateManualEntryPayload) {
    const { teamId } = payload;
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(new Set([teamId])));
    const entryOverlaySnapshot = optimistic().snapshotTimeEntries(teamId);
    const optimisticEntry = createOptimisticManualEntry(payload);

    set((s) => ({ ...s, manualCreateCount: s.manualCreateCount + 1 }));

    try {
      patchInsertedEntry(teamId, optimisticEntry);

      const created = (await orpcClient.agencyOps.timeEntries.createManual({
        teamId,
        projectId: payload.project.id,
        taskId: payload.task?.id,
        startAt: payload.startAt,
        endAt: payload.endAt,
        description: payload.description.trim() || undefined,
      })) as AgencyTimeEntry;

      reconcileCreatedEntry(teamId, optimisticEntry.id, created);
      set((s) => ({ ...s, lastHighlightedEntryId: created.id }));
      return created;
    } catch (error) {
      patchDeletedEntries(teamId, [optimisticEntry]);
      restoreQuerySnapshots(logSnapshots);
      optimistic().restoreTimeEntries(teamId, entryOverlaySnapshot);

      toast.error("Unable to add entry", {
        description: getErrorMessage(error, "Please try again."),
      });
      return null;
    } finally {
      set((s) => ({ ...s, manualCreateCount: Math.max(0, s.manualCreateCount - 1) }));
    }
  }

  async function updateEntry(payload: UpdateEntryPayload) {
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(new Set([payload.teamId])));
    const entryOverlaySnapshot = optimistic().snapshotTimeEntries(payload.teamId);
    const previousUpdatingIds = [...get().updatingEntryIds];

    const previousEntry = payload.previousEntry ?? findTimeEntry(payload.teamId, payload.entryId);

    if (!previousEntry) {
      toast.error("Unable to update entry", { description: "Entry not found." });
      return;
    }

    const optimisticEntry = createOptimisticUpdatedEntry(payload, previousEntry);

    set((s) => ({
      ...s,
      updatingEntryIds: [...new Set([...s.updatingEntryIds, payload.entryId])],
    }));

    try {
      patchUpdatedEntry(payload.teamId, previousEntry, optimisticEntry);

      const updated = (await orpcClient.agencyOps.timeEntries.updateMine({
        teamId: payload.teamId,
        entryId: payload.entryId,
        projectId: payload.project.id,
        taskId: payload.taskId,
        description: payload.description.trim(),
        startAt: payload.startAt,
        endAt: payload.endAt,
      })) as AgencyTimeEntry;

      patchUpdatedEntry(payload.teamId, optimisticEntry, updated);
    } catch (error) {
      restoreQuerySnapshots(logSnapshots);
      optimistic().restoreTimeEntries(payload.teamId, entryOverlaySnapshot);
      toast.error("Unable to update entry", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({
        ...s,
        updatingEntryIds: previousUpdatingIds,
      }));
    }
  }

  function dedupeEntries(entries: DeleteEntriesPayload["entries"]) {
    const seenIds = new Set<string>();

    return entries.filter((entry) => {
      if (seenIds.has(entry.id)) {
        return false;
      }

      seenIds.add(entry.id);
      return true;
    });
  }

  function clearHighlightedEntry() {
    set((s) => ({ ...s, lastHighlightedEntryId: null }));
  }

  function requestOpenTaskChooser() {
    set((s) => ({ ...s, taskChooserOpenRequest: s.taskChooserOpenRequest + 1 }));
  }

  return {
    ensureTrackerDraft,
    setTrackerDescription,
    setTrackerProjectId,
    setTrackerTaskId,
    syncDraftFromActiveTimer,
    registerActiveTimerQuery,
    unregisterActiveTimerQuery,
    registerLogQuery,
    unregisterLogQuery,
    startTimer,
    restartEntry,
    stopTimer,
    updateActiveTimerStart,
    deleteEntries,
    duplicateEntry,
    createManualEntry,
    updateEntry,
    clearHighlightedEntry,
    requestOpenTaskChooser,
  };
}

export const useAgencyTimeTrackingStore = create<AgencyTimeTrackingState>((set, get) => ({
  timerStartCount: 0,
  timerStopCount: 0,
  timerAdjustCount: 0,
  deletingEntryIds: [],
  updatingEntryIds: [],
  duplicatingEntryIds: [],
  manualCreateCount: 0,
  trackerDraftsByTeam: {},
  lastHighlightedEntryId: null,
  taskChooserOpenRequest: 0,
  ...createAgencyTimeTrackingActions(
    (fn) => set((state) => fn(state as AgencyTimeTrackingState)),
    () => get() as AgencyTimeTrackingState,
  ),
}));

export function useTrackerDraft(teamId: string) {
  return useAgencyTimeTrackingStore((s) =>
    teamId ? (s.trackerDraftsByTeam[teamId] ?? null) : null,
  );
}

export const selectIsTimerMutationPending = (s: AgencyTimeTrackingState) =>
  s.timerStartCount > 0 || s.timerStopCount > 0 || s.timerAdjustCount > 0;
