import { beforeEach, describe, expect, mock, test } from "bun:test";

type MutationHandler = (input: unknown) => Promise<unknown>;
type QueryCache = Map<string, unknown>;
type ToastEvent = {
  title?: string;
  description?: string;
  color?: string;
};

type TestRuntime = {
  authSession: {
    value: {
      data: {
        user: {
          id: string;
        };
      } | null;
    };
  };
  mutationHandlers: MutationHandler[];
  mutationIndex: number;
  queryCache: QueryCache;
  toastEvents: ToastEvent[];
  orpc: {
    agencyOps: {
      timer: {
        start: { mutationOptions: () => object };
        stop: { mutationOptions: () => object };
      };
      timeEntries: {
        deleteMine: { mutationOptions: () => object };
      };
    };
  };
};

type AgencyTag = {
  id: string;
  teamId: string;
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
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
};

type AgencyTimeEntriesListQueryData = {
  items: AgencyTimeEntry[];
  page: number;
  pageSize: number;
  total: number;
  weekSummary: {
    startDate: string;
    endDate: string;
    totalSeconds: number;
    daily: Array<{
      date: string;
      totalSeconds: number;
    }>;
  };
};

type TrackerDraft = {
  description: string;
  projectId: string;
  selectedTagIds: string[];
  syncedTimerId: string | null;
};

type AgencyTimeTrackingStore = {
  $dispose: () => void;
  draftByTeam: { value: Record<string, TrackerDraft> };
  deletingEntryIds: { value: string[] };
  ensureTrackerDraft: (teamId: string) => TrackerDraft | null;
  setTrackerProjectId: (teamId: string, projectId: string) => void;
  setTrackerDescription: (teamId: string, description: string) => void;
  setTrackerSelectedTagIds: (teamId: string, tagIds: string[]) => void;
  registerActiveTimerQuery: (payload: { teamId: string; queryKey: readonly unknown[] }) => void;
  registerLogQuery: (payload: { teamId: string; page: number; queryKey: readonly unknown[] }) => void;
  startTimer: (payload: {
    teamId: string;
    project: { id: string; name: string };
    description: string;
    tagIds: string[];
    selectedTags: AgencyTag[];
  }) => Promise<void>;
  stopTimer: (payload: {
    teamId: string;
    activeTimer: AgencyActiveTimer;
    description: string;
    tagIds: string[];
    selectedTags: AgencyTag[];
  }) => Promise<void>;
  restartEntry: (payload: {
    teamId: string;
    project: { id: string; name: string };
    description: string;
    tags: AgencyTag[];
  }) => Promise<void>;
  deleteEntries: (payload: {
    teamId: string;
    entries: AgencyTimeEntry[];
  }) => Promise<void>;
};

mock.module("pinia", () => ({
  defineStore: (_name: string, setup: () => Record<string, unknown>) => {
    return () => ({
      ...setup(),
      $dispose: () => undefined,
    });
  },
}));

function getGlobalRuntime() {
  return (globalThis as any).__teamManagementTestRuntime as TestRuntime;
}

function createAgencyOrpcMock() {
  return {
    agencyOps: {
      timer: {
        start: {
          mutationOptions: () => ({}),
        },
        stop: {
          mutationOptions: () => ({}),
        },
      },
      timeEntries: {
        deleteMine: {
          mutationOptions: () => ({}),
        },
      },
    },
  };
}

function getQueryCacheKey(queryKey: unknown) {
  return JSON.stringify(queryKey);
}

function setCachedQuery(queryCache: QueryCache, queryKey: unknown, data: unknown) {
  queryCache.set(getQueryCacheKey(queryKey), data);
}

function getCachedQuery<T>(queryCache: QueryCache, queryKey: unknown) {
  return queryCache.get(getQueryCacheKey(queryKey)) as T | undefined;
}

function createWeekSummary(totalSeconds = 0): AgencyTimeEntriesListQueryData["weekSummary"] {
  return {
    startDate: "2026-04-20T00:00:00.000Z",
    endDate: "2026-04-27T00:00:00.000Z",
    totalSeconds,
    daily: totalSeconds > 0 ? [{ date: "2026-04-22", totalSeconds }] : [],
  };
}

function createTag(id: string, name: string): AgencyTag {
  return {
    id,
    teamId: "team-1",
    name,
    createdAt: "2026-04-22T09:00:00.000Z",
    updatedAt: "2026-04-22T09:00:00.000Z",
  };
}

function createActiveTimer(overrides: Partial<AgencyActiveTimer> = {}): AgencyActiveTimer {
  return {
    id: "timer-1",
    teamId: "team-1",
    userId: "user-1",
    projectId: "project-1",
    projectName: "Current project",
    tags: [createTag("tag-1", "Billable")],
    description: "Current work",
    startedAt: "2026-04-22T10:00:00.000Z",
    createdAt: "2026-04-22T10:00:00.000Z",
    updatedAt: "2026-04-22T10:00:00.000Z",
    ...overrides,
  };
}

function createTimeEntry(overrides: Partial<AgencyTimeEntry> = {}): AgencyTimeEntry {
  return {
    id: "entry-1",
    teamId: "team-1",
    userId: "user-1",
    userName: "You",
    projectId: "project-1",
    projectName: "Current project",
    clientId: "client-1",
    clientName: "Acme",
    tags: [createTag("tag-1", "Billable")],
    source: "timer",
    description: "Current work",
    startedAt: "2026-04-22T10:00:00.000Z",
    endedAt: "2026-04-22T11:00:00.000Z",
    durationSeconds: 3600,
    createdAt: "2026-04-22T11:00:00.000Z",
    updatedAt: "2026-04-22T11:00:00.000Z",
    ...overrides,
  };
}

function createEntriesListData(
  overrides: Partial<AgencyTimeEntriesListQueryData> = {},
): AgencyTimeEntriesListQueryData {
  return {
    items: [],
    page: 1,
    pageSize: 25,
    total: 0,
    weekSummary: createWeekSummary(),
    ...overrides,
  };
}

async function createStore(handlers?: Partial<{
  start: MutationHandler;
  stop: MutationHandler;
  deleteEntry: MutationHandler;
}>): Promise<AgencyTimeTrackingStore> {
  const runtime = getGlobalRuntime();

  runtime.mutationIndex = 0;
  runtime.mutationHandlers = [
    handlers?.start ?? (async () => ({ timer: null })),
    handlers?.stop ?? (async () => ({ timer: null, createdEntry: null })),
    handlers?.deleteEntry ?? (async (input) => input),
  ];
  runtime.orpc = createAgencyOrpcMock();

  const { useAgencyTimeTrackingStore } = await import("./agency-time-tracking");

  return useAgencyTimeTrackingStore() as AgencyTimeTrackingStore;
}

beforeEach(() => {
  const runtime = getGlobalRuntime();

  runtime.authSession.value = {
    data: {
      user: {
        id: "user-1",
      },
    },
  };
  runtime.mutationIndex = 0;
  runtime.mutationHandlers = [];
  runtime.queryCache.clear();
  runtime.toastEvents = [];
  runtime.orpc = createAgencyOrpcMock();
});

describe("useAgencyTimeTrackingStore", () => {
  test("optimistically saves the current timer into the log and starts a new one", async () => {
    const runtime = getGlobalRuntime();
    const nextTag = createTag("tag-2", "Support");
    const existingTimer = createActiveTimer();
    const activeTimerQueryKey = ["agencyOps", "timer", "getActive", { teamId: "team-1" }];
    const logQueryKey = [
      "agencyOps",
      "timeEntries",
      "listMine",
      { teamId: "team-1", page: 1, pageSize: 25 },
    ];
    const serverTimer = createActiveTimer({
      id: "timer-2",
      projectId: "project-2",
      projectName: "Next project",
      description: "Next task",
      tags: [nextTag],
      startedAt: "2026-04-22T11:05:00.000Z",
      createdAt: "2026-04-22T11:05:00.000Z",
      updatedAt: "2026-04-22T11:05:00.000Z",
    });
    const store = await createStore({
      start: async () => ({ timer: serverTimer }),
    });

    setCachedQuery(runtime.queryCache, activeTimerQueryKey, { timer: existingTimer });
    setCachedQuery(runtime.queryCache, logQueryKey, createEntriesListData());

    store.registerActiveTimerQuery({ teamId: "team-1", queryKey: activeTimerQueryKey });
    store.registerLogQuery({ teamId: "team-1", page: 1, queryKey: logQueryKey });

    await store.startTimer({
      teamId: "team-1",
      project: {
        id: "project-2",
        name: "Next project",
      },
      description: "Next task",
      tagIds: [nextTag.id],
      selectedTags: [nextTag],
    });

    const cachedLog = getCachedQuery<AgencyTimeEntriesListQueryData>(runtime.queryCache, logQueryKey);
    const cachedTimer = getCachedQuery<{ timer: AgencyActiveTimer | null }>(
      runtime.queryCache,
      activeTimerQueryKey,
    );

    expect(cachedLog?.total).toBe(1);
    expect(cachedLog?.items[0]?.projectId).toBe(existingTimer.projectId);
    expect(cachedLog?.items[0]?.description).toBe(existingTimer.description);
    expect(cachedTimer?.timer?.id).toBe(serverTimer.id);
    expect(cachedTimer?.timer?.projectId).toBe("project-2");
    expect(runtime.toastEvents.at(-1)?.title).toBe("Timer started");
  });

  test("stopTimer clears the active timer and inserts an optimistic log entry", async () => {
    const runtime = getGlobalRuntime();
    const activeTimer = createActiveTimer();
    const createdEntry = createTimeEntry();
    const activeTimerQueryKey = ["agencyOps", "timer", "getActive", { teamId: "team-1" }];
    const logQueryKey = [
      "agencyOps",
      "timeEntries",
      "listMine",
      { teamId: "team-1", page: 1, pageSize: 25 },
    ];
    const store = await createStore({
      stop: async () => ({ timer: null, createdEntry }),
    });

    setCachedQuery(runtime.queryCache, activeTimerQueryKey, { timer: activeTimer });
    setCachedQuery(runtime.queryCache, logQueryKey, createEntriesListData());

    store.registerActiveTimerQuery({ teamId: "team-1", queryKey: activeTimerQueryKey });
    store.registerLogQuery({ teamId: "team-1", page: 1, queryKey: logQueryKey });
    store.ensureTrackerDraft("team-1");
    store.setTrackerProjectId("team-1", activeTimer.projectId);
    store.setTrackerDescription("team-1", activeTimer.description);
    store.setTrackerSelectedTagIds("team-1", activeTimer.tags.map((tag) => tag.id));

    await store.stopTimer({
      teamId: "team-1",
      activeTimer,
      description: activeTimer.description,
      tagIds: activeTimer.tags.map((tag) => tag.id),
      selectedTags: activeTimer.tags,
    });

    const cachedLog = getCachedQuery<AgencyTimeEntriesListQueryData>(runtime.queryCache, logQueryKey);
    const cachedTimer = getCachedQuery<{ timer: AgencyActiveTimer | null }>(
      runtime.queryCache,
      activeTimerQueryKey,
    );

    expect(cachedLog?.total).toBe(1);
    expect(cachedLog?.items[0]?.description).toBe(activeTimer.description);
    expect(cachedTimer?.timer).toBeNull();
    expect(store.draftByTeam.value["team-1"]?.description).toBe("");
    expect(store.draftByTeam.value["team-1"]?.selectedTagIds).toEqual([]);
    expect(runtime.toastEvents.at(-1)?.title).toBe("Timer stopped");
  });

  test("restartEntry rotates the current timer into the log and starts the selected one", async () => {
    const runtime = getGlobalRuntime();
    const currentTimer = createActiveTimer({
      id: "timer-current",
      projectId: "project-current",
      projectName: "Current project",
      description: "Current work",
    });
    const nextTag = createTag("tag-2", "Support");
    const activeTimerQueryKey = ["agencyOps", "timer", "getActive", { teamId: "team-1" }];
    const logQueryKey = [
      "agencyOps",
      "timeEntries",
      "listMine",
      { teamId: "team-1", page: 1, pageSize: 25 },
    ];
    const nextTimer = createActiveTimer({
      id: "timer-next",
      projectId: "project-2",
      projectName: "Recovery",
      description: "Handle inbox",
      tags: [nextTag],
    });
    const store = await createStore({
      start: async () => ({ timer: nextTimer }),
    });

    setCachedQuery(runtime.queryCache, activeTimerQueryKey, { timer: currentTimer });
    setCachedQuery(runtime.queryCache, logQueryKey, createEntriesListData());

    store.registerActiveTimerQuery({ teamId: "team-1", queryKey: activeTimerQueryKey });
    store.registerLogQuery({ teamId: "team-1", page: 1, queryKey: logQueryKey });

    await store.restartEntry({
      teamId: "team-1",
      project: {
        id: "project-2",
        name: "Recovery",
      },
      description: "Handle inbox",
      tags: [nextTag],
    });

    const cachedLog = getCachedQuery<AgencyTimeEntriesListQueryData>(runtime.queryCache, logQueryKey);
    const cachedTimer = getCachedQuery<{ timer: AgencyActiveTimer | null }>(
      runtime.queryCache,
      activeTimerQueryKey,
    );

    expect(cachedLog?.items[0]?.projectId).toBe(currentTimer.projectId);
    expect(cachedTimer?.timer?.projectId).toBe("project-2");
    expect(cachedTimer?.timer?.tags.map((tag) => tag.id)).toEqual([nextTag.id]);
    expect(runtime.toastEvents.at(-1)?.description).toBe("Tracking Handle inbox.");
  });

  test("deleteEntries restores the previous log cache when the mutation fails", async () => {
    const runtime = getGlobalRuntime();
    const entry = createTimeEntry();
    const logQueryKey = [
      "agencyOps",
      "timeEntries",
      "listMine",
      { teamId: "team-1", page: 1, pageSize: 25 },
    ];
    const store = await createStore({
      deleteEntry: async () => {
        throw new Error("Delete failed");
      },
    });

    setCachedQuery(
      runtime.queryCache,
      logQueryKey,
      createEntriesListData({
        items: [entry],
        total: 1,
        weekSummary: createWeekSummary(entry.durationSeconds),
      }),
    );

    store.registerLogQuery({ teamId: "team-1", page: 1, queryKey: logQueryKey });

    await store.deleteEntries({
      teamId: "team-1",
      entries: [entry],
    });

    const cachedLog = getCachedQuery<AgencyTimeEntriesListQueryData>(runtime.queryCache, logQueryKey);

    expect(cachedLog?.total).toBe(1);
    expect(cachedLog?.items.map((item) => item.id)).toEqual([entry.id]);
    expect(store.deletingEntryIds.value).toEqual([]);
    expect(runtime.toastEvents.at(-1)?.title).toBe("Unable to delete entry");
  });
});
