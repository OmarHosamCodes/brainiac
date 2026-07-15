import { afterEach, describe, expect, mock, test } from "bun:test";

const getSession = mock(async () => ({ data: { user: { id: "viewer-1" } } }));
const patchActiveTimerInCache = mock(() => {});
const patchActiveMembersFromLiveTimer = mock(() => {});
const applyNotificationCreatedToCache = mock(() => {});
const getQueryClient = mock(() => ({}));

// Other live tests may mock this module; restore so we exercise the real handlers.
mock.restore();

mock.module("@/lib/auth-client", () => ({
  authClient: {
    getSession,
  },
}));

mock.module("@/features/shared/agency-query-cache", () => ({
  patchActiveMembersFromLiveTimer,
  patchActiveTimerInCache,
  patchUpdatedProjectTaskInCache: mock(() => {}),
  refetchAgencyProjectJourneyQueries: mock(async () => {}),
  refetchAgencyProjectScopedTaskListQueries: mock(async () => {}),
}));

mock.module("@/features/notifications/notifications-queries", () => ({
  applyNotificationCreatedToCache,
}));

mock.module("@/lib/query-client", () => ({
  getQueryClient,
}));

const { handleAgencyLiveEvent } = await import(
  /* @vite-ignore */ `./agency-live-handlers.ts?handlers-test=${Date.now()}`
);

afterEach(() => {
  getSession.mockReset();
  getSession.mockImplementation(async () => ({ data: { user: { id: "viewer-1" } } }));
  patchActiveTimerInCache.mockClear();
  patchActiveMembersFromLiveTimer.mockClear();
  applyNotificationCreatedToCache.mockClear();
});

describe("handleAgencyLiveEvent", () => {
  test("timer.updated degrades when session fetch fails", async () => {
    getSession.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });

    const timer = { id: "timer-1" };
    handleAgencyLiveEvent("team-1", {
      type: "timer.updated",
      teamId: "team-1",
      userId: "viewer-1",
      timer,
    } as never);

    await Promise.resolve();
    await Promise.resolve();

    expect(patchActiveTimerInCache).not.toHaveBeenCalled();
    expect(patchActiveMembersFromLiveTimer).toHaveBeenCalledWith("team-1", timer, "viewer-1");
  });

  test("timer.updated patches active timer for matching viewer", async () => {
    const timer = { id: "timer-1" };
    handleAgencyLiveEvent("team-1", {
      type: "timer.updated",
      teamId: "team-1",
      userId: "viewer-1",
      timer,
    } as never);

    await Promise.resolve();
    await Promise.resolve();

    expect(patchActiveTimerInCache).toHaveBeenCalledWith("team-1", timer);
    expect(patchActiveMembersFromLiveTimer).not.toHaveBeenCalled();
  });

  test("notification.created ignores session fetch failures", async () => {
    getSession.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });

    handleAgencyLiveEvent("team-1", {
      type: "notification.created",
      teamId: "team-1",
      notification: {
        id: "n-1",
        recipientUserId: "viewer-1",
      },
    } as never);

    await Promise.resolve();
    await Promise.resolve();

    expect(applyNotificationCreatedToCache).not.toHaveBeenCalled();
  });
});
