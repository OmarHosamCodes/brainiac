import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import {
  QueryClient,
  QueryObserver,
  environmentManager,
  focusManager,
} from "@tanstack/react-query";

import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import {
  resetAgencyLiveConnectedForTest,
  setAgencyTeamLiveConnected,
} from "@/features/shared/live/agency-live-connected";
import type { AgencyLiveConnectionState } from "@/features/shared/agency-live-rpc";

const LIST_KEY = ["notifications", "list", "team-observer"] as const;
const COUNT_KEY = ["notifications", "count", "team-observer"] as const;
const OTHER_KEY = ["agencyOps", "clients", "list", "team-observer"] as const;

type FetchCounters = {
  list: number;
  count: number;
  other: number;
};

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });
}

function notificationSyncOptions(teamId: string, liveState: AgencyLiveConnectionState) {
  return {
    liveGated: true,
    teamId,
    connectedReconcile: true,
    liveState,
  };
}

function listOptions(
  teamId: string,
  liveState: AgencyLiveConnectionState,
  counters: FetchCounters,
) {
  return withAgencySyncQueryOptions(
    {
      queryKey: [...LIST_KEY, teamId],
      queryFn: async () => {
        counters.list += 1;
        return { items: [], nextCursor: null };
      },
    },
    "warm",
    notificationSyncOptions(teamId, liveState),
  );
}

function countOptions(
  teamId: string,
  liveState: AgencyLiveConnectionState,
  counters: FetchCounters,
) {
  return withAgencySyncQueryOptions(
    {
      queryKey: [...COUNT_KEY, teamId],
      queryFn: async () => {
        counters.count += 1;
        return { count: 0, actionCount: 0 };
      },
    },
    "cold",
    notificationSyncOptions(teamId, liveState),
  );
}

function otherLiveGatedOptions(teamId: string, counters: FetchCounters) {
  return withAgencySyncQueryOptions(
    {
      queryKey: [...OTHER_KEY, teamId],
      queryFn: async () => {
        counters.other += 1;
        return { items: [] };
      },
    },
    "warm",
    { liveGated: true, teamId },
  );
}

function mountObserver(client: QueryClient, options: Record<string, unknown>) {
  const observer = new QueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  return { observer, unsubscribe };
}

async function settleInitialFetch() {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
}

describe("notification connected-reconcile observers", () => {
  beforeEach(() => {
    environmentManager.setIsServer(() => false);
    focusManager.setFocused(true);
    jest.useFakeTimers();
    resetAgencyLiveConnectedForTest();
  });

  afterEach(() => {
    jest.useRealTimers();
    focusManager.setFocused(undefined);
    environmentManager.setIsServer(() => typeof window === "undefined");
    resetAgencyLiveConnectedForTest();
  });

  test("query.setOptions does not retarget mounted observer timers in TanStack Query 5.101.2", async () => {
    const client = createClient();
    let fetches = 0;
    const observer = new QueryObserver(client, {
      queryKey: ["set-options-proof"],
      queryFn: async () => {
        fetches += 1;
        return "ok";
      },
      refetchInterval: 8_000,
      refetchIntervalInBackground: false,
      retry: false,
      gcTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => {});
    await settleInitialFetch();
    expect(fetches).toBe(1);

    const query = client.getQueryCache().find({ queryKey: ["set-options-proof"] });
    expect(query).toBeDefined();
    query?.setOptions({
      ...query.options,
      refetchInterval: 30_000,
    });

    jest.advanceTimersByTime(8_000);
    await settleInitialFetch();

    expect(fetches).toBe(2);
    unsubscribe();
  });

  test("observer.setOptions retargets the refetch timer (reactive hook path)", async () => {
    const client = createClient();
    let fetches = 0;
    const observer = new QueryObserver(client, {
      queryKey: ["observer-set-options-proof"],
      queryFn: async () => {
        fetches += 1;
        return "ok";
      },
      refetchInterval: 8_000,
      refetchIntervalInBackground: false,
      retry: false,
      gcTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => {});
    await settleInitialFetch();
    expect(fetches).toBe(1);

    observer.setOptions({
      queryKey: ["observer-set-options-proof"],
      queryFn: async () => {
        fetches += 1;
        return "ok";
      },
      refetchInterval: 30_000,
      refetchIntervalInBackground: false,
      retry: false,
      gcTime: Infinity,
    });

    jest.advanceTimersByTime(8_000);
    await settleInitialFetch();
    expect(fetches).toBe(1);

    jest.advanceTimersByTime(22_000);
    await settleInitialFetch();
    expect(fetches).toBe(2);
    unsubscribe();
  });

  test("live idle for 120s schedules at most 4 list and 4 count reconciliations after settlement", async () => {
    const client = createClient();
    const teamId = "team-idle";
    const counters: FetchCounters = { list: 0, count: 0, other: 0 };
    const list = mountObserver(client, listOptions(teamId, "live", counters));
    const count = mountObserver(client, countOptions(teamId, "live", counters));
    await settleInitialFetch();
    const listAfterSettle = counters.list;
    const countAfterSettle = counters.count;
    expect(listAfterSettle).toBe(1);
    expect(countAfterSettle).toBe(1);

    jest.advanceTimersByTime(8_000);
    await settleInitialFetch();
    expect(counters.list).toBe(listAfterSettle);
    expect(counters.count).toBe(countAfterSettle);

    jest.advanceTimersByTime(120_000 - 8_000);
    await settleInitialFetch();

    expect(counters.list - listAfterSettle).toBeLessThanOrEqual(4);
    expect(counters.count - countAfterSettle).toBeLessThanOrEqual(4);
    expect(counters.list - listAfterSettle).toBe(4);
    expect(counters.count - countAfterSettle).toBe(4);

    list.unsubscribe();
    count.unsubscribe();
  });

  test("connecting/reconnecting/error restore 8s list and 30s count without remounting", async () => {
    const client = createClient();
    const teamId = "team-fallback";
    const counters: FetchCounters = { list: 0, count: 0, other: 0 };
    const list = mountObserver(client, listOptions(teamId, "live", counters));
    const count = mountObserver(client, countOptions(teamId, "live", counters));
    await settleInitialFetch();
    expect(counters.list).toBe(1);
    expect(counters.count).toBe(1);

    for (const state of ["connecting", "reconnecting", "error"] as const) {
      counters.list = 1;
      counters.count = 1;
      list.observer.setOptions(listOptions(teamId, state, counters));
      count.observer.setOptions(countOptions(teamId, state, counters));

      jest.advanceTimersByTime(8_000);
      await settleInitialFetch();
      expect(counters.list).toBe(2);

      jest.advanceTimersByTime(22_000);
      await settleInitialFetch();
      expect(counters.count).toBe(2);
    }

    list.unsubscribe();
    count.unsubscribe();
  });

  test("hidden tab does not fire background interval polling", async () => {
    const client = createClient();
    const teamId = "team-hidden";
    const counters: FetchCounters = { list: 0, count: 0, other: 0 };
    const list = mountObserver(client, listOptions(teamId, "connecting", counters));
    const count = mountObserver(client, countOptions(teamId, "connecting", counters));
    await settleInitialFetch();
    expect(counters.list).toBe(1);
    expect(counters.count).toBe(1);

    focusManager.setFocused(false);
    jest.advanceTimersByTime(120_000);
    await settleInitialFetch();

    expect(counters.list).toBe(1);
    expect(counters.count).toBe(1);

    list.unsubscribe();
    count.unsubscribe();
  });

  test("other liveGated queries still stop polling when connected", async () => {
    const client = createClient();
    const teamId = "team-other";
    setAgencyTeamLiveConnected(teamId, true);
    const counters: FetchCounters = { list: 0, count: 0, other: 0 };
    const other = mountObserver(client, otherLiveGatedOptions(teamId, counters));
    await settleInitialFetch();
    expect(counters.other).toBe(1);

    jest.advanceTimersByTime(120_000);
    await settleInitialFetch();
    expect(counters.other).toBe(1);

    other.unsubscribe();
  });

  test("multiple consumers sharing a notification key use the same 30s live interval", async () => {
    const client = createClient();
    const teamId = "team-shared";
    const counters: FetchCounters = { list: 0, count: 0, other: 0 };
    const rail = mountObserver(client, listOptions(teamId, "live", counters));
    const inbox = mountObserver(client, listOptions(teamId, "live", counters));
    await settleInitialFetch();
    expect(counters.list).toBe(1);

    jest.advanceTimersByTime(8_000);
    await settleInitialFetch();
    expect(counters.list).toBe(1);

    jest.advanceTimersByTime(22_000);
    await settleInitialFetch();
    expect(counters.list).toBe(2);

    rail.unsubscribe();
    inbox.unsubscribe();
  });

  test("team switch keeps each team's interval isolated", async () => {
    const client = createClient();
    const liveCounters: FetchCounters = { list: 0, count: 0, other: 0 };
    const fallbackCounters: FetchCounters = { list: 0, count: 0, other: 0 };
    const live = mountObserver(client, listOptions("team-live", "live", liveCounters));
    const fallback = mountObserver(
      client,
      listOptions("team-fallback-switch", "connecting", fallbackCounters),
    );
    await settleInitialFetch();
    expect(liveCounters.list).toBe(1);
    expect(fallbackCounters.list).toBe(1);

    jest.advanceTimersByTime(8_000);
    await settleInitialFetch();
    expect(liveCounters.list).toBe(1);
    expect(fallbackCounters.list).toBe(2);

    live.unsubscribe();
    fallback.unsubscribe();
  });

  test("Canvas teardown (live → connecting) resumes 8s list fallback on the same observer", async () => {
    const client = createClient();
    const teamId = "team-canvas";
    const counters: FetchCounters = { list: 0, count: 0, other: 0 };
    const list = mountObserver(client, listOptions(teamId, "live", counters));
    await settleInitialFetch();
    expect(counters.list).toBe(1);

    jest.advanceTimersByTime(8_000);
    await settleInitialFetch();
    expect(counters.list).toBe(1);

    list.observer.setOptions(listOptions(teamId, "connecting", counters));
    jest.advanceTimersByTime(8_000);
    await settleInitialFetch();
    expect(counters.list).toBe(2);

    list.unsubscribe();
  });
});
