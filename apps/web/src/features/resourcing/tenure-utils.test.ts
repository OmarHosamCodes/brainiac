import { describe, expect, test } from "bun:test";

import {
  getCurrentTenurePeriodRange,
  resolveDefaultDashboardRangePreset,
  simpleTenurePeriodLabel,
} from "./tenure-utils";

describe("resolveDefaultDashboardRangePreset", () => {
  test("uses tenure when policy is enabled", () => {
    expect(
      resolveDefaultDashboardRangePreset({
        fiscalYearStartMonth: 1,
        fiscalYearStartDay: 1,
        enabled: true,
      }),
    ).toBe("tenure");
  });

  test("falls back to last30 when policy is missing or disabled", () => {
    expect(resolveDefaultDashboardRangePreset(null)).toBe("last30");
    expect(
      resolveDefaultDashboardRangePreset({
        fiscalYearStartMonth: 1,
        fiscalYearStartDay: 1,
        enabled: false,
      }),
    ).toBe("last30");
  });
});

describe("simpleTenurePeriodLabel", () => {
  test("formats quarter and year", () => {
    expect(simpleTenurePeriodLabel(2026, 1)).toBe("Q1 2026");
  });
});

describe("getCurrentTenurePeriodRange", () => {
  test("returns current fiscal quarter bounds through today", () => {
    const range = getCurrentTenurePeriodRange(
      { fiscalYearStartMonth: 1, fiscalYearStartDay: 1, enabled: true },
      new Date("2026-02-15T12:00:00.000Z"),
    );

    expect(range).not.toBeNull();
    expect(range?.from).toBe("2026-01-01T00:00:00.000Z");
    expect(range?.to).toBe("2026-02-15T23:59:59.999Z");
    expect(range?.label).toBe("FY26 Q1");
    expect(range?.simpleLabel).toBe("Q1 2026");
  });

  test("labels Dec-26 fiscal Q3 by the calendar year the range spans", () => {
    const range = getCurrentTenurePeriodRange(
      { fiscalYearStartMonth: 12, fiscalYearStartDay: 26, enabled: true },
      new Date("2026-07-26T12:00:00.000Z"),
    );

    expect(range).not.toBeNull();
    expect(range?.from).toBe("2026-06-26T00:00:00.000Z");
    expect(range?.to).toBe("2026-07-26T23:59:59.999Z");
    expect(range?.label).toBe("FY25 Q3");
    expect(range?.simpleLabel).toBe("Q3 2026");
  });

  test("returns null when tenure tracking is unavailable", () => {
    expect(getCurrentTenurePeriodRange(null)).toBeNull();
  });
});
