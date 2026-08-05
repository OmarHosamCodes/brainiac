import { describe, expect, test } from "bun:test";

import {
  lastDateKeyOfMonth,
  resolveAlertPeriodTarget,
} from "@/features/member-profile/member-profile-alert-period";

describe("resolveAlertPeriodTarget", () => {
  test("maps abnormal-day dateKey to a single-day period", () => {
    expect(resolveAlertPeriodTarget({ dateKey: "2026-07-07" })).toEqual({
      kind: "day",
      dateKey: "2026-07-07",
      from: "2026-07-07",
      to: "2026-07-07",
    });
  });

  test("maps month periodKey to the full month", () => {
    expect(resolveAlertPeriodTarget({ periodKey: "2026-07" })).toEqual({
      kind: "month",
      monthKey: "2026-07",
      from: "2026-07-01",
      to: "2026-07-31",
      focusDate: "2026-07-01",
    });
  });

  test("ignores quarter keys without a dateKey", () => {
    expect(resolveAlertPeriodTarget({ periodKey: "2026-Q3" })).toBeNull();
  });
});

describe("lastDateKeyOfMonth", () => {
  test("handles February in a non-leap year", () => {
    expect(lastDateKeyOfMonth("2026-02")).toBe("2026-02-28");
  });
});
