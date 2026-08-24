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

  test("maps tenure month periodKey to fiscal month bounds", () => {
    expect(
      resolveAlertPeriodTarget(
        { periodKey: "tm:2026-07-26" },
        { fiscalYearStartMonth: 12, fiscalYearStartDay: 26 },
      ),
    ).toEqual({
      kind: "month",
      monthKey: "2026-07",
      from: "2026-07-26",
      to: "2026-08-25",
      focusDate: "2026-07-26",
    });
  });

  test("maps calendar tenure fingerprint when fiscal calendar is absent", () => {
    expect(resolveAlertPeriodTarget({ periodKey: "tm:2026-08-01" })).toEqual({
      kind: "month",
      monthKey: "2026-08",
      from: "2026-08-01",
      to: "2026-08-31",
      focusDate: "2026-08-01",
    });
  });

  test("maps fiscal quarter keys to the quarter date range", () => {
    expect(
      resolveAlertPeriodTarget(
        { periodKey: "2026-Q3" },
        { fiscalYearStartMonth: 1, fiscalYearStartDay: 1 },
      ),
    ).toEqual({
      kind: "quarter",
      periodKey: "2026-Q3",
      from: "2026-07-01",
      to: "2026-09-30",
      focusDate: "2026-07-01",
    });
  });

  test("ignores quarter keys without fiscal calendar", () => {
    expect(resolveAlertPeriodTarget({ periodKey: "2026-Q3" })).toBeNull();
  });
});

describe("lastDateKeyOfMonth", () => {
  test("handles February in a non-leap year", () => {
    expect(lastDateKeyOfMonth("2026-02")).toBe("2026-02-28");
  });
});
