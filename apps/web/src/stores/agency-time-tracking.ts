import type { AgencyLiveEvent } from "@brainiac/api/routers/agency-ops/live";
import { create } from "zustand";
import { toast } from "sonner";

import { getQueryClient } from "@/lib/query-client";
import { orpcClient } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { normalizeAgencyLinkUrl } from "@/lib/utils/normalize-agency-link-url";

type AgencyTag = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

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
  tags: AgencyTag[];
  description: string;
  linkUrl: string | null;
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
  tags: AgencyTag[];
  source: "timer" | "manual";
  description: string;
  linkUrl: string | null;
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
  selectedTagIds: string[];
  linkUrl: string;
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
  task: Pick<AgencyProjectTask, "id" | "title">;
  description: string;
  linkUrl: string;
  tagIds: string[];
  selectedTags: AgencyTag[];
  successDescription?: string;
};

type StopTimerPayload = {
  teamId: string;
  description: string;
  linkUrl: string;
  tagIds: string[];
  selectedTags: AgencyTag[];
  discard?: boolean;
  activeTimer?: AgencyActiveTimer | null;
};

type RestartEntryPayload = {
  teamId: string;
  project: Pick<AgencyProjectSummary, "id" | "name">;
  task: Pick<AgencyProjectTask, "id" | "title">;
  description: string;
  linkUrl: string | null;
  tags: AgencyTag[];
};

type DeleteEntriesPayload = {
  teamId: string;
  entries: Array<Pick<AgencyTimeEntry, "id" | "startedAt" | "durationSeconds">>;
};

const OPTIMISTIC_CLIENT_ID = "optimistic-client";
const OPTIMISTIC_CLIENT_NAME = "Unknown client";
const OPTIMISTIC_USER_NAME = "You";


let cachedUserId = "unknown-user";

export function setAgencyTimeTrackingUserId(userId: string | null) {
  cachedUserId = userId ?? "unknown-user";
}

function getCurrentUserId() {
  return cachedUserId;
}


type AgencyTimeTrackingActions = ReturnType<typeof createAgencyTimeTrackingActions>;

type AgencyTimeTrackingState = {
  timerStartCount: number;
  timerStopCount: number;
  deletingEntryIds: string[];
  getDraft: (teamId: string) => TrackerDraft | null;
} & AgencyTimeTrackingActions;

function createAgencyTimeTrackingActions(
  set: (fn: (state: AgencyTimeTrackingState) => AgencyTimeTrackingState) => void,
  get: () => AgencyTimeTrackingState,
) {
  const draftByTeam: Record<string, TrackerDraft> = {};

  const activeTimerQueryRegistry = new Map<string, RegisteredActiveTimerQuery>();
  const logQueryRegistry = new Map<string, RegisteredLogQuery>();

  function ensureTrackerDraft(teamId: string) {
    if (!teamId) {
      return null;
    }

    const existingDraft = draftByTeam[teamId];

    if (existingDraft) {
      return existingDraft;
    }

    const nextDraft: TrackerDraft = {
      description: "",
      projectId: "",
      taskId: "",
      selectedTagIds: [],
      linkUrl: "",
      syncedTimerId: null,
    };

    draftByTeam[teamId] = nextDraft;

    return nextDraft;
  }

  function setTrackerDescription(teamId: string, description: string) {
    const draft = ensureTrackerDraft(teamId);

    if (!draft) {
      return;
    }

    draft.description = description;
  }

  function setTrackerProjectId(teamId: string, projectId: string) {
    const draft = ensureTrackerDraft(teamId);

    if (!draft) {
      return;
    }

    draft.projectId = projectId;
  }

  function setTrackerTaskId(teamId: string, taskId: string) {
    const draft = ensureTrackerDraft(teamId);

    if (!draft) {
      return;
    }

    draft.taskId = taskId;
  }

  function setTrackerSelectedTagIds(teamId: string, tagIds: string[]) {
    const draft = ensureTrackerDraft(teamId);

    if (!draft) {
      return;
    }

    draft.selectedTagIds = [...tagIds];
  }

  function setTrackerLinkUrl(teamId: string, linkUrl: string) {
    const draft = ensureTrackerDraft(teamId);

    if (!draft) {
      return;
    }

    draft.linkUrl = linkUrl;
  }

  function toggleTrackerTag(teamId: string, tagId: string) {
    const draft = ensureTrackerDraft(teamId);

    if (!draft) {
      return;
    }

    if (draft.selectedTagIds.includes(tagId)) {
      draft.selectedTagIds = draft.selectedTagIds.filter((id) => id !== tagId);
      return;
    }

    draft.selectedTagIds = [...draft.selectedTagIds, tagId];
  }

  function syncDraftFromActiveTimer(teamId: string, timer: AgencyActiveTimer | null) {
    const draft = ensureTrackerDraft(teamId);

    if (!draft) {
      return;
    }

    if (!timer) {
      draft.syncedTimerId = null;
      return;
    }

    if (draft.syncedTimerId === timer.id) {
      return;
    }

    draft.description = timer.description;
    draft.projectId = timer.projectId;
    draft.taskId = timer.taskId ?? "";
    draft.selectedTagIds = timer.tags.map((tag) => tag.id);
    draft.linkUrl = timer.linkUrl ?? "";
    draft.syncedTimerId = timer.id;
  }

  function registerActiveTimerQuery(payload: RegisteredActiveTimerQuery) {
    activeTimerQueryRegistry.set(getRegistryKey(payload.queryKey), payload);
  }

  function unregisterActiveTimerQuery(queryKey: QueryKey) {
    activeTimerQueryRegistry.delete(getRegistryKey(queryKey));
  }

  function registerLogQuery(payload: RegisteredLogQuery) {
    logQueryRegistry.set(getRegistryKey(payload.queryKey), payload);
  }

  function unregisterLogQuery(queryKey: QueryKey) {
    logQueryRegistry.delete(getRegistryKey(queryKey));
  }

  async function startTimer(payload: StartTimerPayload) {
    const previousDraft = getTrackerDraftSnapshot(payload.teamId);
    const previousActiveTimer = getCachedActiveTimer();
    const affectedLogTeams = new Set<string>([payload.teamId]);
    const timerSnapshots = snapshotQueries(activeTimerQueryRegistry.values());

    if (previousActiveTimer) {
      affectedLogTeams.add(previousActiveTimer.teamId);
    }

    const logSnapshots = snapshotQueries(getRegisteredLogQueries(affectedLogTeams));
    const nowIso = new Date().toISOString();
    const optimisticTimer = createOptimisticTimer({
      teamId: payload.teamId,
      project: payload.project,
      task: payload.task,
      description: payload.description,
      linkUrl: payload.linkUrl,
      tags: payload.selectedTags,
      startedAt: nowIso,
    });
    const optimisticPreviousEntry = previousActiveTimer
      ? createOptimisticEntryFromTimer(previousActiveTimer, {
          endedAt: nowIso,
        })
      : null;
    const draft = ensureTrackerDraft(payload.teamId);

    if (!draft) {
      return;
    }

    const { normalizedUrl, error } = normalizeAgencyLinkUrl(payload.linkUrl);

    if (error) {
      toast.error("Unable to start timer", { description: error });
      return;
    }

    set((s) => ({ ...s, timerStartCount: s.timerStartCount + 1 }));

    try {
      if (optimisticPreviousEntry) {
        patchInsertedEntry(optimisticPreviousEntry.teamId, optimisticPreviousEntry);
      }

      patchActiveTimerCaches(optimisticTimer);

      draft.description = optimisticTimer.description;
      draft.projectId = optimisticTimer.projectId;
      draft.taskId = optimisticTimer.taskId ?? "";
      draft.selectedTagIds = payload.tagIds;
      draft.linkUrl = normalizedUrl ?? "";
      draft.syncedTimerId = optimisticTimer.id;

      const result = (await orpcClient.agencyOps.timer.start({
        teamId: payload.teamId,
        taskId: payload.task.id,
        description: payload.description.trim(),
        linkUrl: normalizedUrl,
        tagIds: payload.tagIds,
      })) as AgencyActiveTimerQueryData;

      patchActiveTimerCaches(result.timer);
      syncDraftFromActiveTimer(payload.teamId, result.timer);

      toast.success("Timer started", { description: payload.successDescription });
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);
      restoreQuerySnapshots(logSnapshots);
      restoreTrackerDraft(payload.teamId, previousDraft);

      toast.error("Unable to start timer", { description: getErrorMessage(error, "Please try again.") });
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
      linkUrl: payload.linkUrl ?? "",
      tagIds: payload.tags.map((tag) => tag.id),
      selectedTags: payload.tags,
      successDescription: `Tracking ${payload.description || "time"}.`,
    });
  }

  async function stopTimer(payload: StopTimerPayload) {
    const activeTimer = payload.activeTimer ?? getCachedActiveTimer();

    if (!activeTimer) {
      return;
    }

    const previousDraft = getTrackerDraftSnapshot(payload.teamId);
    const timerSnapshots = snapshotQueries(activeTimerQueryRegistry.values());
    const affectedLogTeams = new Set<string>([activeTimer.teamId]);
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(affectedLogTeams));
    const description = payload.description.trim();
    const { normalizedUrl, error } = payload.discard
      ? {
          normalizedUrl: null,
          error: null,
        }
      : normalizeAgencyLinkUrl(payload.linkUrl);
    const nextTags = payload.tagIds.length > 0 ? payload.selectedTags : activeTimer.tags;
    const optimisticEntry = payload.discard
      ? null
      : createOptimisticEntryFromTimer(activeTimer, {
          endedAt: new Date().toISOString(),
          description: description || activeTimer.description,
          linkUrl: normalizedUrl,
          tags: nextTags,
        });
    const draft = ensureTrackerDraft(payload.teamId);

    if (!draft) {
      return;
    }

    if (error) {
      toast.error(payload.discard ? "Unable to discard timer" : "Unable to stop timer", { description: error });
      return;
    }

    set((s) => ({ ...s, timerStopCount: s.timerStopCount + 1 }));

    try {
      if (optimisticEntry) {
        patchInsertedEntry(activeTimer.teamId, optimisticEntry);
      }

      patchActiveTimerCaches(null);

      draft.description = "";
      draft.selectedTagIds = [];
      draft.linkUrl = "";
      draft.syncedTimerId = null;

      const result = (await orpcClient.agencyOps.timer.stop({
        teamId: payload.teamId,
        description,
        linkUrl: normalizedUrl,
        tagIds: payload.tagIds,
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

      toast.success(payload.discard ? "Timer discarded" : "Timer stopped");
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);
      restoreQuerySnapshots(logSnapshots);
      restoreTrackerDraft(payload.teamId, previousDraft);

      toast.error(payload.discard ? "Unable to discard timer" : "Unable to stop timer", { description: getErrorMessage(error, "Please try again.") });
    } finally {
      set((s) => ({ ...s, timerStopCount: Math.max(0, s.timerStopCount - 1) }));
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

      toast.error(ids.length > 1 ? "Unable to delete entries" : "Unable to delete entry", { description: getErrorMessage(error, "Please try again.") });
    } finally {
      set((s) => ({ ...s, deletingEntryIds: previousDeletingIds }));
    }
  }

  function getRegistryKey(queryKey: QueryKey) {
    return JSON.stringify(queryKey);
  }

  function getCachedActiveTimer() {
    for (const registeredQuery of activeTimerQueryRegistry.values()) {
      const cached = getQueryClient().getQueryData<AgencyActiveTimerQueryData>(registeredQuery.queryKey);

      if (cached?.timer) {
        return cached.timer;
      }
    }

    return null;
  }

  function getTrackerDraftSnapshot(teamId: string) {
    const existingDraft = draftByTeam[teamId];

    if (!existingDraft) {
      return null;
    }

    return {
      ...existingDraft,
      selectedTagIds: [...existingDraft.selectedTagIds],
    } satisfies TrackerDraft;
  }

  function restoreTrackerDraft(teamId: string, snapshot: TrackerDraft | null) {
    if (!snapshot) {
      delete draftByTeam[teamId];
      return;
    }

    draftByTeam[teamId] = {
      ...snapshot,
      selectedTagIds: [...snapshot.selectedTagIds],
    };
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
    task: Pick<AgencyProjectTask, "id" | "title">;
    description: string;
    linkUrl: string;
    tags: AgencyTag[];
    startedAt: string;
  }) {
    const { normalizedUrl } = normalizeAgencyLinkUrl(payload.linkUrl);

    return {
      id: createOptimisticId("agency-active-timer"),
      teamId: payload.teamId,
      userId: getCurrentUserId(),
      projectId: payload.project.id,
      taskId: payload.task.id,
      taskTitle: payload.task.title,
      projectName: payload.project.name,
      tags: [...payload.tags],
      description: payload.description.trim(),
      linkUrl: normalizedUrl,
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
      linkUrl?: string | null;
      tags?: AgencyTag[];
      clientId?: string;
      clientName?: string;
    },
  ) {
    return {
      id: createOptimisticId("agency-time"),
      teamId: timer.teamId,
      userId: timer.userId,
      userName: OPTIMISTIC_USER_NAME,
      projectId: timer.projectId,
      taskId: timer.taskId,
      taskTitle: timer.taskTitle,
      projectName: timer.projectName,
      clientId: overrides.clientId ?? OPTIMISTIC_CLIENT_ID,
      clientName: overrides.clientName ?? OPTIMISTIC_CLIENT_NAME,
      tags: [...(overrides.tags ?? timer.tags)],
      source: "timer",
      description: overrides.description ?? timer.description,
      linkUrl: overrides.linkUrl !== undefined ? overrides.linkUrl : timer.linkUrl,
      startedAt: timer.startedAt,
      endedAt: overrides.endedAt,
      durationSeconds: getDurationSeconds(timer.startedAt, overrides.endedAt),
      createdAt: overrides.endedAt,
      updatedAt: overrides.endedAt,
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

  function getRegisteredLogQueries(teamIds: Set<string>) {
    return [...logQueryRegistry.values()].filter((registeredQuery) =>
      teamIds.has(registeredQuery.teamId),
    );
  }

  function patchActiveTimerCaches(timer: AgencyActiveTimer | null) {
    activeTimerQueryRegistry.forEach((registeredQuery) => {
      getQueryClient().setQueryData<AgencyActiveTimerQueryData | undefined>(
        registeredQuery.queryKey,
        (current) => ({
          ...(current ?? { timer: null }),
          timer: timer && registeredQuery.teamId === timer.teamId ? timer : null,
        }),
      );
    });
  }

  function patchInsertedEntry(teamId: string, entry: AgencyTimeEntry) {
    logQueryRegistry.forEach((registeredQuery) => {
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
            items:
              registeredQuery.page === 1
                ? [entry, ...current.items].slice(0, current.pageSize)
                : current.items,
            total: current.total + 1,
            weekSummary: updateWeekSummary(current.weekSummary, entry, 1),
          };
        },
      );
    });
  }

  function patchDeletedEntries(
    teamId: string,
    entries: Array<Pick<AgencyTimeEntry, "id" | "startedAt" | "durationSeconds">>,
  ) {
    const deletedIds = new Set(entries.map((entry) => entry.id));

    logQueryRegistry.forEach((registeredQuery) => {
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

  function patchUpdatedEntry(teamId: string, entry: AgencyTimeEntry) {
    logQueryRegistry.forEach((registeredQuery) => {
      if (registeredQuery.teamId !== teamId) return;

      getQueryClient().setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current) => {
          if (!current) return current;
          const exists = current.items.some((item) => item.id === entry.id);
          if (!exists) {
            return {
              ...current,
              items:
                registeredQuery.page === 1
                  ? [entry, ...current.items].slice(0, current.pageSize)
                  : current.items,
              total: current.total + 1,
              weekSummary: updateWeekSummary(current.weekSummary, entry, 1),
            };
          }
          return {
            ...current,
            items: current.items.map((item) => (item.id === entry.id ? entry : item)),
          };
        },
      );
    });
  }

  function reconcileCreatedEntry(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyTimeEntry,
  ) {
    logQueryRegistry.forEach((registeredQuery) => {
      if (registeredQuery.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((item) => (item.id === optimisticIdValue ? created : item)),
          };
        },
      );
    });
  }

  function applyLiveEvent(event: AgencyLiveEvent) {
    const currentUserId = getCurrentUserId();

    switch (event.type) {
      case "timer.started":
        if (event.userId === currentUserId) {
          patchActiveTimerCaches(event.timer);
        }
        break;
      case "timer.stopped":
        if (event.userId === currentUserId) {
          patchActiveTimerCaches(event.timer);
        }
        if (event.createdEntry && event.createdEntry.userId === currentUserId) {
          patchInsertedEntry(event.teamId, event.createdEntry);
        }
        break;
      case "timeEntry.created":
        if (event.entry.userId === currentUserId) {
          patchInsertedEntry(event.teamId, event.entry);
        }
        break;
      case "timeEntry.updated":
        if (event.entry.userId === currentUserId) {
          patchUpdatedEntry(event.teamId, event.entry);
        }
        break;
      case "timeEntry.deleted":
        if (event.userId === currentUserId) {
          patchDeletedEntries(event.teamId, [
            { id: event.entryId, startedAt: event.updatedAt, durationSeconds: 0 },
          ]);
        }
        break;
      default:
        break;
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

  return {
    getDraft: (teamId: string) => draftByTeam[teamId] ?? null,
    ensureTrackerDraft,
    setTrackerDescription,
    setTrackerProjectId,
    setTrackerTaskId,
    setTrackerSelectedTagIds,
    setTrackerLinkUrl,
    toggleTrackerTag,
    syncDraftFromActiveTimer,
    registerActiveTimerQuery,
    unregisterActiveTimerQuery,
    registerLogQuery,
    unregisterLogQuery,
    startTimer,
    restartEntry,
    stopTimer,
    deleteEntries,
    applyLiveEvent,
  };

}

export const useAgencyTimeTrackingStore = create<AgencyTimeTrackingState>((set, get) => ({
  timerStartCount: 0,
  timerStopCount: 0,
  deletingEntryIds: [],
  ...createAgencyTimeTrackingActions(
    (fn) => set((state) => fn(state as AgencyTimeTrackingState)),
    () => get() as AgencyTimeTrackingState,
  ),
}));

export const selectIsTimerMutationPending = (s: AgencyTimeTrackingState) =>
  s.timerStartCount > 0 || s.timerStopCount > 0;
