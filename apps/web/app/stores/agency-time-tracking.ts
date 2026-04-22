import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { getErrorMessage } from "~/utils/get-error-message";
import { normalizeAgencyLinkUrl } from "~/utils/normalize-agency-link-url";

type AgencyTag = {
  id: string;
  teamId: string;
  name: string;
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

export const useAgencyTimeTrackingStore = defineStore("agency-time-tracking", () => {
  const authSession = useAuthSession();
  const orpc = useOrpc();
  const toast = useToast();
  const queryClient = useQueryClient();

  const draftByTeam = ref<Record<string, TrackerDraft>>({});
  const timerStartCount = ref(0);
  const timerStopCount = ref(0);
  const deletingEntryIds = ref<string[]>([]);
  const isTimerMutationPending = computed(
    () => timerStartCount.value > 0 || timerStopCount.value > 0,
  );

  const startTimerMutation = useMutation(orpc.agencyOps.timer.start.mutationOptions());
  const stopTimerMutation = useMutation(orpc.agencyOps.timer.stop.mutationOptions());
  const deleteEntryMutation = useMutation(orpc.agencyOps.timeEntries.deleteMine.mutationOptions());

  const activeTimerQueryRegistry = new Map<string, RegisteredActiveTimerQuery>();
  const logQueryRegistry = new Map<string, RegisteredLogQuery>();

  function ensureTrackerDraft(teamId: string) {
    if (!teamId) {
      return null;
    }

    const existingDraft = draftByTeam.value[teamId];

    if (existingDraft) {
      return existingDraft;
    }

    const nextDraft: TrackerDraft = {
      description: "",
      projectId: "",
      selectedTagIds: [],
      linkUrl: "",
      syncedTimerId: null,
    };

    draftByTeam.value = {
      ...draftByTeam.value,
      [teamId]: nextDraft,
    };

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
      toast.add({
        title: "Unable to start timer",
        description: error,
        color: "error",
      });
      return;
    }

    timerStartCount.value += 1;

    try {
      if (optimisticPreviousEntry) {
        patchInsertedEntry(optimisticPreviousEntry.teamId, optimisticPreviousEntry);
      }

      patchActiveTimerCaches(optimisticTimer);

      draft.description = optimisticTimer.description;
      draft.projectId = optimisticTimer.projectId;
      draft.selectedTagIds = payload.tagIds;
      draft.linkUrl = normalizedUrl ?? "";
      draft.syncedTimerId = optimisticTimer.id;

      const result = (await startTimerMutation.mutateAsync({
        teamId: payload.teamId,
        projectId: payload.project.id,
        description: payload.description.trim(),
        linkUrl: normalizedUrl,
        tagIds: payload.tagIds,
      })) as AgencyActiveTimerQueryData;

      patchActiveTimerCaches(result.timer);
      syncDraftFromActiveTimer(payload.teamId, result.timer);

      await Promise.all([invalidateActiveTimerQueries(), invalidateLogQueries(affectedLogTeams)]);

      toast.add({
        title: "Timer started",
        description: payload.successDescription,
        color: "success",
      });
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);
      restoreQuerySnapshots(logSnapshots);
      restoreTrackerDraft(payload.teamId, previousDraft);

      toast.add({
        title: "Unable to start timer",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    } finally {
      timerStartCount.value = Math.max(0, timerStartCount.value - 1);
    }
  }

  async function restartEntry(payload: RestartEntryPayload) {
    await startTimer({
      teamId: payload.teamId,
      project: payload.project,
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
      toast.add({
        title: payload.discard ? "Unable to discard timer" : "Unable to stop timer",
        description: error,
        color: "error",
      });
      return;
    }

    timerStopCount.value += 1;

    try {
      if (optimisticEntry) {
        patchInsertedEntry(activeTimer.teamId, optimisticEntry);
      }

      patchActiveTimerCaches(null);

      draft.description = "";
      draft.selectedTagIds = [];
      draft.linkUrl = "";
      draft.syncedTimerId = null;

      const result = (await stopTimerMutation.mutateAsync({
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

      await Promise.all([invalidateActiveTimerQueries(), invalidateLogQueries(affectedLogTeams)]);

      toast.add({
        title: payload.discard ? "Timer discarded" : "Timer stopped",
        description: payload.discard
          ? "Time was not saved."
          : result.createdEntry
            ? `Saved ${formatDuration(result.createdEntry.durationSeconds)}.`
            : "The timer has been stopped.",
        color: payload.discard ? "neutral" : "success",
      });
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);
      restoreQuerySnapshots(logSnapshots);
      restoreTrackerDraft(payload.teamId, previousDraft);

      toast.add({
        title: payload.discard ? "Unable to discard timer" : "Unable to stop timer",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    } finally {
      timerStopCount.value = Math.max(0, timerStopCount.value - 1);
    }
  }

  async function deleteEntries(payload: DeleteEntriesPayload) {
    if (payload.entries.length === 0) {
      return;
    }

    const uniqueEntries = dedupeEntries(payload.entries);
    const ids = uniqueEntries.map((entry) => entry.id);
    const previousDeletingIds = [...deletingEntryIds.value];
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(new Set([payload.teamId])));

    deletingEntryIds.value = [...new Set([...deletingEntryIds.value, ...ids])];

    try {
      patchDeletedEntries(payload.teamId, uniqueEntries);

      await Promise.all(
        ids.map((entryId) =>
          deleteEntryMutation.mutateAsync({
            teamId: payload.teamId,
            entryId,
          }),
        ),
      );

      await invalidateLogQueries(new Set([payload.teamId]));
    } catch (error) {
      restoreQuerySnapshots(logSnapshots);

      toast.add({
        title: ids.length > 1 ? "Unable to delete entries" : "Unable to delete entry",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    } finally {
      deletingEntryIds.value = previousDeletingIds;
    }
  }

  function getRegistryKey(queryKey: QueryKey) {
    return JSON.stringify(queryKey);
  }

  function getCurrentUserId() {
    return authSession.value?.data?.user?.id ?? "unknown-user";
  }

  function getCachedActiveTimer() {
    for (const registeredQuery of activeTimerQueryRegistry.values()) {
      const cached = queryClient.getQueryData<AgencyActiveTimerQueryData>(registeredQuery.queryKey);

      if (cached?.timer) {
        return cached.timer;
      }
    }

    return null;
  }

  function getTrackerDraftSnapshot(teamId: string) {
    const existingDraft = draftByTeam.value[teamId];

    if (!existingDraft) {
      return null;
    }

    return {
      ...existingDraft,
      selectedTagIds: [...existingDraft.selectedTagIds],
    } satisfies TrackerDraft;
  }

  function restoreTrackerDraft(teamId: string, snapshot: TrackerDraft | null) {
    const nextDraftByTeam = {
      ...draftByTeam.value,
    };

    if (!snapshot) {
      delete nextDraftByTeam[teamId];
      draftByTeam.value = nextDraftByTeam;
      return;
    }

    nextDraftByTeam[teamId] = {
      ...snapshot,
      selectedTagIds: [...snapshot.selectedTagIds],
    };
    draftByTeam.value = nextDraftByTeam;
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
      data: queryClient.getQueryData(query.queryKey),
    })) satisfies QuerySnapshot[];
  }

  function restoreQuerySnapshots(snapshots: QuerySnapshot[]) {
    snapshots.forEach((snapshot) => {
      queryClient.setQueryData(snapshot.queryKey, snapshot.data);
    });
  }

  function getRegisteredLogQueries(teamIds: Set<string>) {
    return [...logQueryRegistry.values()].filter((registeredQuery) =>
      teamIds.has(registeredQuery.teamId),
    );
  }

  function patchActiveTimerCaches(timer: AgencyActiveTimer | null) {
    activeTimerQueryRegistry.forEach((registeredQuery) => {
      queryClient.setQueryData<AgencyActiveTimerQueryData | undefined>(
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

      queryClient.setQueryData<AgencyTimeEntriesListQueryData | undefined>(
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

      queryClient.setQueryData<AgencyTimeEntriesListQueryData | undefined>(
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

  async function invalidateActiveTimerQueries() {
    await Promise.all(
      [...activeTimerQueryRegistry.values()].map((registeredQuery) =>
        queryClient.invalidateQueries({ queryKey: [...registeredQuery.queryKey] }),
      ),
    );
  }

  async function invalidateLogQueries(teamIds: Set<string>) {
    await Promise.all(
      getRegisteredLogQueries(teamIds).map((registeredQuery) =>
        queryClient.invalidateQueries({ queryKey: [...registeredQuery.queryKey] }),
      ),
    );
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

  function formatDuration(seconds: number) {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const hours = Math.floor(safeSeconds / 3_600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((safeSeconds % 3_600) / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(safeSeconds % 60)
      .toString()
      .padStart(2, "0");

    return `${hours}:${minutes}:${secs}`;
  }

  return {
    draftByTeam,
    timerStartCount,
    timerStopCount,
    deletingEntryIds,
    isTimerMutationPending,
    ensureTrackerDraft,
    setTrackerDescription,
    setTrackerProjectId,
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
});
