import { create } from "zustand";
import { toast } from "sonner";

import { getQueryClient } from "@/lib/query-client";
import {
  patchActiveTimerInCache,
  refetchAgencyActiveTimerQueries,
  refetchAgencyTimeEntriesListQueries,
} from "@/lib/utils/agency-query-cache";
import { orpcClient } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { normalizeAgencyLinkUrl } from "@/lib/utils/normalize-agency-link-url";
import { type AgencyListOverlay } from "@/lib/utils/agency-optimistic-merge";
import { useAgencyOptimisticStore } from "@/stores/agency-optimistic";

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
  deletingEntryIds: string[];
  getDraft: (teamId: string) => TrackerDraft | null;
} & AgencyTimeTrackingActions;

function createAgencyTimeTrackingActions(
  set: (fn: (state: AgencyTimeTrackingState) => AgencyTimeTrackingState) => void,
  get: () => AgencyTimeTrackingState,
) {
  const draftByTeam: Record<string, TrackerDraft> = {};

  const activeTimerQueryRegistry = new Map<string, { payload: RegisteredActiveTimerQuery; count: number }>();
  const logQueryRegistry = new Map<string, { payload: RegisteredLogQuery; count: number }>();

  function optimistic() {
    return useAgencyOptimisticStore.getState();
  }

  function registerInto<T>(registry: Map<string, { payload: T; count: number }>, key: string, payload: T) {
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

  function restoreTimerOverlaySnapshots(snapshots: Map<string, AgencyActiveTimer | null | undefined>) {
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

  function restoreEntryOverlaySnapshots(snapshots: Map<string, AgencyListOverlay<AgencyTimeEntry>>) {
    for (const [teamId, snapshot] of snapshots) {
      optimistic().restoreTimeEntries(teamId, snapshot);
    }
  }

  async function startTimer(payload: StartTimerPayload) {
    const previousDraft = getTrackerDraftSnapshot(payload.teamId);
    const previousActiveTimer = getCachedActiveTimer();
    const affectedLogTeams = new Set<string>([payload.teamId]);
    const timerSnapshots = snapshotQueries(
      [...activeTimerQueryRegistry.values()].map((entry) => entry.payload),
    );

    if (previousActiveTimer) {
      affectedLogTeams.add(previousActiveTimer.teamId);
    }

    const logSnapshots = snapshotQueries(getRegisteredLogQueries(affectedLogTeams));
    const timerOverlaySnapshots = captureTimerOverlaySnapshots(
      previousActiveTimer ? [payload.teamId, previousActiveTimer.teamId] : [payload.teamId],
    );
    const entryOverlaySnapshots = captureEntryOverlaySnapshots(affectedLogTeams);
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
      await cancelQueries([...activeTimerQueryRegistry.values()].map((entry) => entry.payload));
      await cancelQueries(getRegisteredLogQueries(affectedLogTeams));

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

      void refetchAgencyActiveTimerQueries(payload.teamId);
      void refetchAgencyTimeEntriesListQueries(payload.teamId);

      toast.success("Timer started", { description: payload.successDescription });
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);
      restoreQuerySnapshots(logSnapshots);
      restoreTimerOverlaySnapshots(timerOverlaySnapshots);
      restoreEntryOverlaySnapshots(entryOverlaySnapshots);
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
    const timerSnapshots = snapshotQueries(
      [...activeTimerQueryRegistry.values()].map((entry) => entry.payload),
    );
    const affectedLogTeams = new Set<string>([activeTimer.teamId]);
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(affectedLogTeams));
    const timerOverlaySnapshots = captureTimerOverlaySnapshots([activeTimer.teamId]);
    const entryOverlaySnapshots = captureEntryOverlaySnapshots(affectedLogTeams);
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
      await cancelQueries([...activeTimerQueryRegistry.values()].map((entry) => entry.payload));
      await cancelQueries(getRegisteredLogQueries(affectedLogTeams));

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

      void refetchAgencyActiveTimerQueries(activeTimer.teamId);
      if (!payload.discard) {
        void refetchAgencyTimeEntriesListQueries(activeTimer.teamId);
      }

      toast.success(payload.discard ? "Timer discarded" : "Timer stopped");
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);
      restoreQuerySnapshots(logSnapshots);
      restoreTimerOverlaySnapshots(timerOverlaySnapshots);
      restoreEntryOverlaySnapshots(entryOverlaySnapshots);
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

      toast.error(ids.length > 1 ? "Unable to delete entries" : "Unable to delete entry", { description: getErrorMessage(error, "Please try again.") });
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
      if (!Array.isArray(path) || path[0] !== "agencyOps" || path[1] !== "timer" || path[2] !== "getActive") {
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
          const base =
            current ?? emptyTimeEntriesList(registeredQuery.page);

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
          const base =
            current ?? emptyTimeEntriesList(registeredQuery.page);
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
