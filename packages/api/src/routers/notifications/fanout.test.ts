import { describe, expect, test } from "bun:test";

import { defaultNotificationChannels, excludeActor, messageCoalesceTaskId } from "./fanout-helpers";

describe("notification fanout helpers", () => {
  test("excludeActor removes the actor and dedupes recipients", () => {
    expect(excludeActor(["u1", "u2", "u2", "u3"], "u2")).toEqual(["u1", "u3"]);
    expect(excludeActor(["u1", "u2"], null)).toEqual(["u1", "u2"]);
  });

  test("messageCoalesceTaskId only coalesces task.message rows", () => {
    expect(messageCoalesceTaskId("task.message", "task-1")).toBe("task-1");
    expect(messageCoalesceTaskId("task.assigned", "task-1")).toBeNull();
    expect(messageCoalesceTaskId("task.message", undefined)).toBeNull();
  });

  test("retunes defaults for balanced productivity policy", () => {
    expect(defaultNotificationChannels("timer.activity")).toEqual({ inApp: false, push: false });
    expect(defaultNotificationChannels("task.assigned")).toEqual({ inApp: true, push: true });
    expect(defaultNotificationChannels("task.message")).toEqual({ inApp: true, push: true });
    expect(defaultNotificationChannels("journey.milestone")).toEqual({ inApp: true, push: false });
    expect(defaultNotificationChannels("team.digest")).toEqual({ inApp: true, push: false });
  });
});
