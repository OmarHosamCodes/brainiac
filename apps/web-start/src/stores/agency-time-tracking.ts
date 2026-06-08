import { create } from "zustand";
import { QueryClient } from "@tanstack/react-query";

import { normalizeAgencyLinkUrl } from "@/utils/normalize-agency-link-url";

// Types (mirrored from Nuxt store and API responses)
export type AgencyTag = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AgencyProjectSummary = {
  id: string;
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AgencyActiveTimer = {
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

export type AgencyTimeEntry = {
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

export type AgencyWeekSummary = {
  startDate: string;
  endDate: string;
  totalSeconds: number;
  daily: Array<{
    date: string;
    totalSeconds: number;
  }>;
};

type TrackerDraft = {
  description: string;
  projectId: string;
  selectedTagIds: string[];
  linkUrl: string;
  syncedTimerId: string | null;
};

type QueryKey = readonly unknown[];

export type AgencyTimeEntriesListQueryData = {
  items: AgencyTimeEntry[];
  page: number;
  pageSize: number;
  total: number;
  weekSummary: AgencyWeekSummary;
};

export type AgencyActiveTimerQueryData = {
  timer: AgencyActiveTimer | null;
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

export type AgencyTimeTrackingStore = {
  // State
  draftByTeam: Record<string, TrackerDraft>;
  timerStartCount: number;
  timerStopCount: number;
  deletingEntryIds: string[];

  // Computed
  isTimerMutationPending: () => boolean;

  // Query registry management
  activeTimerQueryRegistry: Map<string, RegisteredActiveTimerQuery>;
  logQueryRegistry: Map<string, RegisteredLogQuery>;
  registerActiveTimerQuery: (payload: RegisteredActiveTimerQuery) => void;
  unregisterActiveTimerQuery: (queryKey: QueryKey) => void;
  registerLogQuery: (payload: RegisteredLogQuery) => void;
  unregisterLogQuery: (queryKey: QueryKey) => void;

  // Draft management
  ensureTrackerDraft: (teamId: string) => TrackerDraft | null;
  setTrackerDescription: (teamId: string, description: string) => void;
  setTrackerProjectId: (teamId: string, projectId: string) => void;
  setTrackerSelectedTagIds: (teamId: string, tagIds: string[]) => void;
  setTrackerLinkUrl: (teamId: string, linkUrl: string) => void;
  toggleTrackerTag: (teamId: string, tagId: string) => void;
  syncDraftFromActiveTimer: (teamId: string, timer: AgencyActiveTimer | null) => void;

  // Mutation tracking
  _incrementTimerStartCount: () => void;
  _decrementTimerStartCount: () => void;
  _incrementTimerStopCount: () => void;
  _decrementTimerStopCount: () => void;
  _setDeletingEntryIds: (ids: string[]) => void;

  // Helpers
  getCachedActiveTimer: (queryClient: QueryClient) => AgencyActiveTimer | null;
  getTrackerDraftSnapshot: (teamId: string) => TrackerDraft | null;
  restoreTrackerDraft: (teamId: string, snapshot: TrackerDraft | null) => void;
  snapshotQueries: (queries: Iterable<{ queryKey: QueryKey }>, queryClient: QueryClient) => QuerySnapshot[];
  restoreQuerySnapshots: (snapshots: QuerySnapshot[], queryClient: QueryClient) => void;
  getRegisteredLogQueries: (teamIds: Set<string>) => RegisteredLogQuery[];
  patchActiveTimerCaches: (timer: AgencyActiveTimer | null, queryClient: QueryClient) => void;
  patchInsertedEntry: (teamId: string, entry: AgencyTimeEntry, queryClient: QueryClient) => void;
  patchDeletedEntries: (teamId: string, entries: Array<Pick<AgencyTimeEntry, "id" | "startedAt" | "durationSeconds">>, queryClient: QueryClient) => void;
  updateWeekSummary: (weekSummary: AgencyWeekSummary, entry: Pick<AgencyTimeEntry, "startedAt" | "durationSeconds">, direction: 1 | -1) => AgencyWeekSummary;
  invalidateActiveTimerQueries: (queryClient: QueryClient) => Promise<void>;
  invalidateLogQueries: (teamIds: Set<string>, queryClient: QueryClient) => Promise<void>;
  createOptimisticTimer: (payload: {
    teamId: string;
    project: Pick<AgencyProjectSummary, "id" | "name">;
    description: string;
    linkUrl: string;
    tags: AgencyTag[];
    startedAt: string;
    userId: string;
  }) => AgencyActiveTimer;
  createOptimisticEntryFromTimer: (timer: AgencyActiveTimer, overrides: {
    endedAt: string;
    description?: string;
    linkUrl?: string | null;
    tags?: AgencyTag[];
    clientId?: string;
    clientName?: string;
  }) => AgencyTimeEntry;
};

const OPTIMISTIC_CLIENT_ID = "optimistic-client";
const OPTIMISTIC_CLIENT_NAME = "Unknown client";
const OPTIMISTIC_USER_NAME = "You";

export const useAgencyTimeTrackingStore = create<AgencyTimeTrackingStore>((set, get) => ({
  // Initial state
  draftByTeam: {},
  timerStartCount: 0,
  timerStopCount: 0,
  deletingEntryIds: [],
  activeTimerQueryRegistry: new Map(),
  logQueryRegistry: new Map(),

  // Computed
  isTimerMutationPending: () => get().timerStartCount > 0 || get().timerStopCount > 0,

  // Query registry management
  registerActiveTimerQuery: (payload) => {
    const registry = get().activeTimerQueryRegistry;
    registry.set(getRegistryKey(payload.queryKey), payload);
  },

  unregisterActiveTimerQuery: (queryKey) => {
    get().activeTimerQueryRegistry.delete(getRegistryKey(queryKey));
  },

  registerLogQuery: (payload) => {
    const registry = get().logQueryRegistry;
    registry.set(getRegistryKey(payload.queryKey), payload);
  },

  unregisterLogQuery: (queryKey) => {
    get().logQueryRegistry.delete(getRegistryKey(queryKey));
  },

  // Draft management
  ensureTrackerDraft: (teamId) => {
    if (!teamId) {
      return null;
    }

    const state = get();
    const existingDraft = state.draftByTeam[teamId];

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

    set({
      draftByTeam: {
        ...state.draftByTeam,
        [teamId]: nextDraft,
      },
    });

    return nextDraft;
  },

  setTrackerDescription: (teamId, description) => {
    const draft = get().ensureTrackerDraft(teamId);
    if (!draft) return;

    draft.description = description;
    set({ draftByTeam: { ...get().draftByTeam } });
  },

  setTrackerProjectId: (teamId, projectId) => {
    const draft = get().ensureTrackerDraft(teamId);
    if (!draft) return;

    draft.projectId = projectId;
    set({ draftByTeam: { ...get().draftByTeam } });
  },

  setTrackerSelectedTagIds: (teamId, tagIds) => {
    const draft = get().ensureTrackerDraft(teamId);
    if (!draft) return;

    draft.selectedTagIds = [...tagIds];
    set({ draftByTeam: { ...get().draftByTeam } });
  },

  setTrackerLinkUrl: (teamId, linkUrl) => {
    const draft = get().ensureTrackerDraft(teamId);
    if (!draft) return;

    draft.linkUrl = linkUrl;
    set({ draftByTeam: { ...get().draftByTeam } });
  },

  toggleTrackerTag: (teamId, tagId) => {
    const draft = get().ensureTrackerDraft(teamId);
    if (!draft) return;

    if (draft.selectedTagIds.includes(tagId)) {
      draft.selectedTagIds = draft.selectedTagIds.filter((id) => id !== tagId);
    } else {
      draft.selectedTagIds = [...draft.selectedTagIds, tagId];
    }
    set({ draftByTeam: { ...get().draftByTeam } });
  },

  syncDraftFromActiveTimer: (teamId, timer) => {
    const draft = get().ensureTrackerDraft(teamId);
    if (!draft) return;

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
    set({ draftByTeam: { ...get().draftByTeam } });
  },

  // Mutation tracking
  _incrementTimerStartCount: () => set((s) => ({ timerStartCount: s.timerStartCount + 1 })),
  _decrementTimerStartCount: () =>
    set((s) => ({ timerStartCount: Math.max(0, s.timerStartCount - 1) })),
  _incrementTimerStopCount: () => set((s) => ({ timerStopCount: s.timerStopCount + 1 })),
  _decrementTimerStopCount: () =>
    set((s) => ({ timerStopCount: Math.max(0, s.timerStopCount - 1) })),
  _setDeletingEntryIds: (ids) => set({ deletingEntryIds: ids }),

  // Helpers
  getCachedActiveTimer: (queryClient) => {
    for (const registeredQuery of get().activeTimerQueryRegistry.values()) {
      const cached = queryClient.getQueryData<AgencyActiveTimerQueryData>(
        registeredQuery.queryKey,
      );

      if (cached?.timer) {
        return cached.timer;
      }
    }

    return null;
  },

  getTrackerDraftSnapshot: (teamId) => {
    const existingDraft = get().draftByTeam[teamId];

    if (!existingDraft) {
      return null;
    }

    return {
      ...existingDraft,
      selectedTagIds: [...existingDraft.selectedTagIds],
    };
  },

  restoreTrackerDraft: (teamId, snapshot) => {
    const state = get();
    const nextDraftByTeam = {
      ...state.draftByTeam,
    };

    if (!snapshot) {
      delete nextDraftByTeam[teamId];
      set({ draftByTeam: nextDraftByTeam });
      return;
    }

    nextDraftByTeam[teamId] = {
      ...snapshot,
      selectedTagIds: [...snapshot.selectedTagIds],
    };
    set({ draftByTeam: nextDraftByTeam });
  },

  snapshotQueries: (queries, queryClient) => {
    return [...queries].map((query) => ({
      queryKey: query.queryKey,
      data: queryClient.getQueryData(query.queryKey),
    }));
  },

  restoreQuerySnapshots: (snapshots, queryClient) => {
    snapshots.forEach((snapshot) => {
      queryClient.setQueryData(snapshot.queryKey, snapshot.data);
    });
  },

  getRegisteredLogQueries: (teamIds) => {
    return [...get().logQueryRegistry.values()].filter((registeredQuery) =>
      teamIds.has(registeredQuery.teamId),
    );
  },

  patchActiveTimerCaches: (timer, queryClient) => {
    get().activeTimerQueryRegistry.forEach((registeredQuery) => {
      queryClient.setQueryData<AgencyActiveTimerQueryData | undefined>(
        registeredQuery.queryKey,
        (current: AgencyActiveTimerQueryData | undefined) => ({
          ...(current ?? { timer: null }),
          timer: timer && registeredQuery.teamId === timer.teamId ? timer : null,
        }),
      );
    });
  },

  patchInsertedEntry: (teamId, entry, queryClient) => {
    get().logQueryRegistry.forEach((registeredQuery) => {
      if (registeredQuery.teamId !== teamId) {
        return;
      }

      queryClient.setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current: AgencyTimeEntriesListQueryData | undefined) => {
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
            weekSummary: get().updateWeekSummary(current.weekSummary, entry, 1),
          };
        },
      );
    });
  },

  patchDeletedEntries: (teamId, entries, queryClient) => {
    const deletedIds = new Set(entries.map((entry) => entry.id));

    get().logQueryRegistry.forEach((registeredQuery) => {
      if (registeredQuery.teamId !== teamId) {
        return;
      }

      queryClient.setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current: AgencyTimeEntriesListQueryData | undefined) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            items: current.items.filter((entry) => !deletedIds.has(entry.id)),
            total: Math.max(0, current.total - entries.length),
            weekSummary: entries.reduce(
              (summary, entry) => get().updateWeekSummary(summary, entry, -1),
              current.weekSummary,
            ),
          };
        },
      );
    });
  },

  updateWeekSummary: (weekSummary, entry, direction) => {
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
  },

  invalidateActiveTimerQueries: async (queryClient) => {
    await Promise.all(
      [...get().activeTimerQueryRegistry.values()].map((registeredQuery) =>
        queryClient.invalidateQueries({ queryKey: [...registeredQuery.queryKey] }),
      ),
    );
  },

  invalidateLogQueries: async (teamIds, queryClient) => {
    await Promise.all(
      get()
        .getRegisteredLogQueries(teamIds)
        .map((registeredQuery) =>
          queryClient.invalidateQueries({ queryKey: [...registeredQuery.queryKey] }),
        ),
    );
  },

  createOptimisticTimer: (payload) => {
    const { normalizedUrl } = normalizeAgencyLinkUrl(payload.linkUrl);

    return {
      id: createOptimisticId("agency-active-timer"),
      teamId: payload.teamId,
      userId: payload.userId,
      projectId: payload.project.id,
      projectName: payload.project.name,
      tags: [...payload.tags],
      description: payload.description.trim(),
      linkUrl: normalizedUrl,
      startedAt: payload.startedAt,
      createdAt: payload.startedAt,
      updatedAt: payload.startedAt,
    };
  },

  createOptimisticEntryFromTimer: (timer, overrides) => {
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
    };
  },
}));

function getRegistryKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey);
}

function createOptimisticId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDurationSeconds(startedAt: string, endedAt: string): number {
  const startedAtMs = new Date(startedAt).getTime();
  const endedAtMs = new Date(endedAt).getTime();

  if (Number.isNaN(startedAtMs) || Number.isNaN(endedAtMs)) {
    return 1;
  }

  return Math.max(1, Math.floor((endedAtMs - startedAtMs) / 1_000));
}
