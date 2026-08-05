import { describe, expect, test } from "bun:test";

import {
  getLocalYesterdayDateString,
  isWithinQuietHours,
  resolveBaseDeliveryClass,
  resolveDeliveryDecision,
} from "./delivery-policy";

describe("notification delivery policy", () => {
  test("maps types to base delivery classes", () => {
    expect(resolveBaseDeliveryClass("task.assigned")).toBe("interrupt");
    expect(resolveBaseDeliveryClass("task.assigned", { assignedToTeam: true })).toBe("center");
    expect(resolveBaseDeliveryClass("task.message")).toBe("interrupt");
    expect(resolveBaseDeliveryClass("journey.milestone")).toBe("center");
    expect(resolveBaseDeliveryClass("timer.activity")).toBe("center");
    expect(resolveBaseDeliveryClass("team.digest")).toBe("digest");
    expect(resolveBaseDeliveryClass("member.alert")).toBe("interrupt");
  });

  test("defers interrupt push while a timer is active", () => {
    expect(
      resolveDeliveryDecision({
        type: "task.assigned",
        hasActiveTimer: true,
        quietOrFocusActive: false,
      }),
    ).toEqual({
      deliveryClass: "breakpoint",
      pushNow: false,
      deferPush: true,
      forceSuppressPush: false,
    });
  });

  test("suppresses push during quiet hours or focus", () => {
    expect(
      resolveDeliveryDecision({
        type: "task.message",
        quietOrFocusActive: true,
      }),
    ).toMatchObject({
      deliveryClass: "interrupt",
      pushNow: false,
      deferPush: false,
    });
  });

  test("hard-suppresses push for whole-team assignment broadcasts", () => {
    expect(
      resolveDeliveryDecision({
        type: "task.assigned",
        assignedToTeam: true,
      }),
    ).toEqual({
      deliveryClass: "center",
      pushNow: false,
      deferPush: false,
      forceSuppressPush: true,
    });
  });

  test("quiet hours support overnight windows", () => {
    // 23:30 in America/New_York during winter is UTC+5 → 04:30 UTC next day? Use fixed offset zone.
    const evening = new Date("2026-08-04T23:30:00.000Z");
    // Use Etc/UTC so clock matches the Date's UTC fields.
    expect(isWithinQuietHours(evening, "UTC", "22:00", "07:00")).toBe(true);
    expect(isWithinQuietHours(new Date("2026-08-04T12:00:00.000Z"), "UTC", "22:00", "07:00")).toBe(
      false,
    );
    expect(isWithinQuietHours(new Date("2026-08-04T06:00:00.000Z"), "UTC", "22:00", "07:00")).toBe(
      true,
    );
  });

  test("local yesterday date is the prior civil day", () => {
    expect(getLocalYesterdayDateString(new Date("2026-08-04T10:00:00.000Z"), "UTC")).toBe(
      "2026-08-03",
    );
  });
});
