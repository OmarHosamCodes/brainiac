import { describe, expect, test } from "bun:test";

import {
  calendarDayMarker,
  calendarDayStatusLabel,
  resolveCalendarDayActions,
} from "@/features/member-profile/member-profile-calendar-day";

describe("calendarDayMarker", () => {
  test("maps statuses to marker shapes", () => {
    expect(calendarDayMarker("present")).toBe("logged");
    expect(calendarDayMarker("leave")).toBe("off");
    expect(calendarDayMarker("holiday")).toBe("holiday");
    expect(calendarDayMarker("weekend")).toBe("weekend");
    expect(calendarDayMarker("empty")).toBe("none");
  });
});

describe("calendarDayStatusLabel", () => {
  test("uses off-day terminology", () => {
    expect(calendarDayStatusLabel("leave")).toBe("off day");
  });
});

describe("resolveCalendarDayActions", () => {
  test("viewer gets activity only when hours exist", () => {
    expect(
      resolveCalendarDayActions({
        inMonth: true,
        status: "present",
        leaveId: null,
        hasActivity: true,
        isSelf: false,
        isManager: false,
      }),
    ).toEqual([{ kind: "view_activity" }]);
  });

  test("self can manage own off days", () => {
    const actions = resolveCalendarDayActions({
      inMonth: true,
      status: "leave",
      leaveId: "l1",
      hasActivity: false,
      isSelf: true,
      isManager: false,
    });
    expect(actions).toContainEqual({ kind: "select_range" });
    expect(actions).toContainEqual({ kind: "remove_off_day", leaveId: "l1" });
  });

  test("manager viewing another member gets off-day tools", () => {
    expect(
      resolveCalendarDayActions({
        inMonth: true,
        status: "empty",
        leaveId: null,
        hasActivity: false,
        isSelf: false,
        isManager: true,
      }).map((action) => action.kind),
    ).toEqual(["select_range", "add_off_day"]);
  });
});
