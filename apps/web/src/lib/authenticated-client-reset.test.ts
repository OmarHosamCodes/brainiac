import { afterEach, describe, expect, mock, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
  getRpcBaseUrl: () => "http://localhost:7000",
  getAuthBaseUrl: () => "http://localhost:7000",
}));

const { bindQueryClient } = await import("@/lib/query-client");
const { useTeamStore } = await import("@/features/team/team-store");
const { resetAuthenticatedClientState, shouldResetAuthenticatedClientState } =
  await import("./authenticated-client-reset");

function createClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  bindQueryClient(queryClient);
  return queryClient;
}

afterEach(() => {
  useTeamStore.setState({ selectedTeamId: "" });
});

describe("shouldResetAuthenticatedClientState", () => {
  test("does not reset during pending hydration or the first settled user", () => {
    expect(shouldResetAuthenticatedClientState(null, "u1", true)).toBe(false);
    expect(shouldResetAuthenticatedClientState(null, "u1", false)).toBe(false);
  });

  test("resets on sign-out and account replacement", () => {
    expect(shouldResetAuthenticatedClientState("u1", null, false)).toBe(true);
    expect(shouldResetAuthenticatedClientState("u1", "u2", false)).toBe(true);
  });

  test("does not reset while a transient pending state still has the current user", () => {
    expect(shouldResetAuthenticatedClientState("u1", "u1", true)).toBe(false);
    expect(shouldResetAuthenticatedClientState("u1", "u1", false)).toBe(false);
  });
});

describe("resetAuthenticatedClientState", () => {
  test("clears user-scoped query and team state without tearing down live sockets", () => {
    const queryClient = createClient();
    queryClient.setQueryData(["shell"], { user: "previous" });
    useTeamStore.getState().setSelectedTeamId("team-previous");

    const router = {
      invalidate: mock(() => Promise.resolve()),
      clearCache: mock(() => {}),
    };
    resetAuthenticatedClientState({ queryClient, router });

    expect(queryClient.getQueryData(["shell"])).toBeUndefined();
    expect(useTeamStore.getState().selectedTeamId).toBe("");
    expect(router.invalidate).toHaveBeenCalledTimes(1);
    expect(router.clearCache).toHaveBeenCalledTimes(1);
  });

  test("Back after reset cannot restore the previous authenticated match or query shell", async () => {
    let sessionUser = "prev";
    const queryClient = createClient();
    queryClient.setQueryData(["shell"], { user: "prev" });
    useTeamStore.getState().setSelectedTeamId("team-previous");

    const shellLoader = () => ({ session: { user: { id: sessionUser } } });
    const rootRoute = createRootRoute();
    const publicRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
    });
    const authenticatedRoute = createRoute({
      getParentRoute: () => rootRoute,
      id: "_authenticated",
      loader: shellLoader,
    });
    const agencyRoute = createRoute({
      getParentRoute: () => authenticatedRoute,
      path: "/agency",
      loader: shellLoader,
    });
    const canvasRoute = createRoute({
      getParentRoute: () => authenticatedRoute,
      path: "/canvas",
      loader: shellLoader,
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([
        publicRoute,
        authenticatedRoute.addChildren([agencyRoute, canvasRoute]),
      ]),
      history: createMemoryHistory({ initialEntries: ["/agency"] }),
      defaultPreload: "intent",
    });

    await router.load();
    await flushRouter();
    await router.navigate({ to: "/canvas" });
    await flushRouter();
    await router.preloadRoute({ to: "/agency" });
    await flushRouter();

    expect(authenticatedUserIds(router)).toContain("prev");
    expect(cachedAuthenticatedUserIds(router)).toContain("prev");
    expect(queryClient.getQueryData(["shell"])).toEqual({ user: "prev" });

    sessionUser = "next";
    resetAuthenticatedClientState({ queryClient, router });

    expect(queryClient.getQueryData(["shell"])).toBeUndefined();
    expect(useTeamStore.getState().selectedTeamId).toBe("");
    expect(cachedAuthenticatedUserIds(router)).not.toContain("prev");

    await router.navigate({ to: "/" });
    await flushRouter();
    router.history.back();
    await router.load();
    await flushRouter();
    router.history.back();
    await router.load();
    await flushRouter();

    expect(authenticatedUserIds(router)).not.toContain("prev");
    expect(cachedAuthenticatedUserIds(router)).not.toContain("prev");
    expect(queryClient.getQueryData(["shell"])).toBeUndefined();
  });
});

async function flushRouter() {
  await Promise.resolve();
  await Promise.resolve();
}

type MatchLike = {
  routeId: string;
  loaderData?: { session?: { user?: { id?: string } } };
};

function isAuthenticatedRouteId(routeId: string) {
  return routeId === "/_authenticated" || routeId.startsWith("/_authenticated");
}

function userIdFromMatch(match: MatchLike) {
  return match.loaderData?.session?.user?.id;
}

function cachedAuthenticatedUserIds(router: object) {
  const cache = (router as { _cache?: Map<string, MatchLike> })._cache;
  if (!cache) return [];
  return [...cache.values()]
    .filter((match) => isAuthenticatedRouteId(match.routeId))
    .map(userIdFromMatch)
    .filter((id): id is string => Boolean(id));
}

function authenticatedUserIds(router: { state: { matches: MatchLike[] } }) {
  const fromState = router.state.matches
    .filter((match) => isAuthenticatedRouteId(match.routeId))
    .map(userIdFromMatch)
    .filter((id): id is string => Boolean(id));
  return [...fromState, ...cachedAuthenticatedUserIds(router)];
}
