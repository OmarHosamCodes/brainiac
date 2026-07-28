import { describe, expect, test } from "bun:test";

import {
  formatTenureMonthSelectionLabel,
  getCurrentTenurePeriodRange,
  getCurrentTenureQuarterMonths,
  resolveDefaultDashboardRangePreset,
  resolveDefaultTenureMonthIndexes,
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

describe("resolveDefaultTenureMonthIndexes", () => {
  const calendarPolicy = {
    fiscalYearStartMonth: 1,
    fiscalYearStartDay: 1,
    enabled: true,
  } as const;

  test("defaults to the current month inside the tenure quarter", () => {
    expect(
      resolveDefaultTenureMonthIndexes(calendarPolicy, new Date("2026-07-28T12:00:00.000Z")),
    ).toEqual([0]);
    expect(
      resolveDefaultTenureMonthIndexes(calendarPolicy, new Date("2026-08-20T12:00:00.000Z")),
    ).toEqual([1]);
    expect(
      resolveDefaultTenureMonthIndexes(calendarPolicy, new Date("2026-09-05T12:00:00.000Z")),
    ).toEqual([2]);
  });

  test("returns empty when tenure is unavailable", () => {
    expect(resolveDefaultTenureMonthIndexes(null)).toEqual([]);
    expect(
      resolveDefaultTenureMonthIndexes({
        fiscalYearStartMonth: 1,
        fiscalYearStartDay: 1,
        enabled: false,
      }),
    ).toEqual([]);
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

  test("narrows the range to selected fiscal months", () => {
    const range = getCurrentTenurePeriodRange(
      { fiscalYearStartMonth: 1, fiscalYearStartDay: 1, enabled: true },
      new Date("2026-08-20T12:00:00.000Z"),
      [0],
    );

    expect(range).not.toBeNull();
    expect(range?.from).toBe("2026-07-01T00:00:00.000Z");
    expect(range?.to).toBe("2026-07-31T23:59:59.999Z");
    expect(range?.simpleLabel).toBe("Jul 2026");
  });

  test("treats all three months as the full quarter", () => {
    const range = getCurrentTenurePeriodRange(
      { fiscalYearStartMonth: 1, fiscalYearStartDay: 1, enabled: true },
      new Date("2026-08-20T12:00:00.000Z"),
      [0, 1, 2],
    );

    expect(range?.simpleLabel).toBe("Q3 2026");
    expect(range?.from).toBe("2026-07-01T00:00:00.000Z");
    expect(range?.to).toBe("2026-08-20T23:59:59.999Z");
  });
});

describe("getCurrentTenureQuarterMonths", () => {
  test("returns the three fiscal months for the current quarter", () => {
    const months = getCurrentTenureQuarterMonths(
      { fiscalYearStartMonth: 1, fiscalYearStartDay: 1, enabled: true },
      new Date("2026-08-20T12:00:00.000Z"),
    );

    expect(months).toEqual([
      {
        index: 0,
        label: "July",
        from: "2026-07-01T00:00:00.000Z",
        toExclusive: "2026-08-01T00:00:00.000Z",
      },
      {
        index: 1,
        label: "August",
        from: "2026-08-01T00:00:00.000Z",
        toExclusive: "2026-09-01T00:00:00.000Z",
      },
      {
        index: 2,
        label: "September",
        from: "2026-09-01T00:00:00.000Z",
        toExclusive: "2026-10-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("formatTenureMonthSelectionLabel", () => {
  test("formats contiguous and gapped month selections", () => {
    const months = getCurrentTenureQuarterMonths(
      { fiscalYearStartMonth: 1, fiscalYearStartDay: 1, enabled: true },
      new Date("2026-08-20T12:00:00.000Z"),
    );
    expect(months).not.toBeNull();
    expect(formatTenureMonthSelectionLabel([months![0]!], 2026)).toBe("Jul 2026");
    expect(formatTenureMonthSelectionLabel([months![0]!, months![1]!], 2026)).toBe("Jul–Aug 2026");
    expect(formatTenureMonthSelectionLabel([months![0]!, months![2]!], 2026)).toBe("Jul, Sep 2026");
  });
});
