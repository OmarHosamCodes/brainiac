import { describe, expect, test } from "bun:test";
import { buildMyTasksTimeConsumer, resolveMyTasksAssigner } from "./agency-my-tasks-row-meta";

describe("resolveMyTasksAssigner", () => {
  test("returns me when creator is the actor", () => {
    expect(
      resolveMyTasksAssigner({
        createdByUserId: "u1",
        actorUserId: "u1",
        member: { userId: "u1", userName: "Omar", userAvatar: null },
      }),
    ).toEqual({ kind: "me" });
  });

  test("returns member when creator is someone else", () => {
    expect(
      resolveMyTasksAssigner({
        createdByUserId: "u2",
        actorUserId: "u1",
        member: { userId: "u2", userName: "Sam", userAvatar: "https://x/a.png" },
      }),
    ).toEqual({
      kind: "member",
      userId: "u2",
      userName: "Sam",
      userAvatar: "https://x/a.png",
    });
  });

  test("falls back to Unknown member when lookup missing", () => {
    expect(
      resolveMyTasksAssigner({
        createdByUserId: "u9",
        actorUserId: "u1",
        member: null,
      }),
    ).toEqual({
      kind: "member",
      userId: "u9",
      userName: "Unknown",
      userAvatar: null,
    });
  });
});

describe("buildMyTasksTimeConsumer", () => {
  test("returns null without estimate", () => {
    expect(buildMyTasksTimeConsumer({ totalTrackedSeconds: 3600, estimateMinutes: null })).toBe(
      null,
    );
    expect(buildMyTasksTimeConsumer({ totalTrackedSeconds: 3600, estimateMinutes: 0 })).toBe(null);
  });

  test("formats tracked/estimate and clamps ratio to 0..1 for the bar", () => {
    expect(buildMyTasksTimeConsumer({ totalTrackedSeconds: 3600, estimateMinutes: 240 })).toEqual({
      trackedLabel: "1h",
      estimateLabel: "4h",
      ratio: 0.25,
      overdue: false,
      ariaLabel: "1h of 4h estimated",
    });
  });

  test("marks overdue when tracked exceeds estimate and caps bar ratio at 1", () => {
    expect(
      buildMyTasksTimeConsumer({ totalTrackedSeconds: 5 * 3600, estimateMinutes: 240 }),
    ).toEqual({
      trackedLabel: "5h",
      estimateLabel: "4h",
      ratio: 1,
      overdue: true,
      ariaLabel: "5h of 4h estimated, over estimate",
    });
  });

  test("treats missing tracked as zero", () => {
    expect(buildMyTasksTimeConsumer({ estimateMinutes: 60 })).toEqual({
      trackedLabel: "0m",
      estimateLabel: "1h",
      ratio: 0,
      overdue: false,
      ariaLabel: "0m of 1h estimated",
    });
  });
});
