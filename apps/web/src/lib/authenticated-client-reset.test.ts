import { afterEach, describe, expect, mock, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

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
});
