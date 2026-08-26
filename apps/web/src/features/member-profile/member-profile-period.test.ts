import { describe, expect, test } from "bun:test";
import { toFiscalCalendar } from "@orch/api/routers/agency-ops/resourcing/tenure-engine";

import {
  canShiftProfilePeriodMonth,
  clampDateKeyToRange,
  isSingleMonthProfilePeriod,
  resolveDefaultProfilePeriodMonthStart,
  resolveProfilePaceParams,
  resolveProfilePeriodMonthBounds,
  shiftProfilePeriodMonthWithinBounds,
} from "./member-profile-period";

const calendarPolicy = {
  fiscalYearStartMonth: 12,
  fiscalYearStartDay: 26,
  enabled: true,
} as const;

const fiscalCalendar = toFiscalCalendar(calendarPolicy);

describe("clampDateKeyToRange", () => {
  test("clamps below start and above end", () => {
    expect(clampDateKeyToRange("2026-06-01", "2026-07-01", "2026-07-31")).toBe("2026-07-01");
    expect(clampDateKeyToRange("2026-08-15", "2026-07-01", "2026-07-31")).toBe("2026-07-31");
    expect(clampDateKeyToRange("2026-07-15", "2026-07-01", "2026-07-31")).toBe("2026-07-15");
  });
});

describe("isSingleMonthProfilePeriod", () => {
  test("returns true for a single tenure month", () => {
    expect(
      isSingleMonthProfilePeriod("2026-07-26", "2026-08-25", true, fiscalCalendar),
    ).toBe(true);
  });

  test("returns false when range spans two tenure months", () => {
    expect(
      isSingleMonthProfilePeriod("2026-06-26", "2026-08-25", true, fiscalCalendar),
    ).toBe(false);
  });

  test("uses calendar months when tenure is disabled", () => {
    const calendar = toFiscalCalendar({ fiscalYearStartMonth: 1, fiscalYearStartDay: 1 });
    expect(isSingleMonthProfilePeriod("2026-07-01", "2026-07-31", false, calendar)).toBe(true);
    expect(isSingleMonthProfilePeriod("2026-07-01", "2026-08-15", false, calendar)).toBe(false);
  });
});

describe("resolveProfilePeriodMonthBounds", () => {
  test("returns first and last tenure month starts for a quarter span", () => {
    const bounds = resolveProfilePeriodMonthBounds(
      "2026-06-26",
      "2026-09-25",
      true,
      fiscalCalendar,
    );
    expect(bounds.firstStartKey).toBe("2026-06-26");
    expect(bounds.lastStartKey).toBe("2026-08-26");
  });
});

describe("canShiftProfilePeriodMonth", () => {
  const bounds = { firstStartKey: "2026-06-26", lastStartKey: "2026-08-26" };

  test("blocks prev at first month and next at last month", () => {
    expect(canShiftProfilePeriodMonth("2026-06-26", -1, bounds)).toBe(false);
    expect(canShiftProfilePeriodMonth("2026-06-26", 1, bounds)).toBe(true);
    expect(canShiftProfilePeriodMonth("2026-08-26", 1, bounds)).toBe(false);
    expect(canShiftProfilePeriodMonth("2026-08-26", -1, bounds)).toBe(true);
  });
});

describe("shiftProfilePeriodMonthWithinBounds", () => {
  const bounds = { firstStartKey: "2026-06-26", lastStartKey: "2026-08-26" };

  test("shifts one tenure month forward inside bounds", () => {
    expect(
      shiftProfilePeriodMonthWithinBounds("2026-06-26", 1, bounds, true, fiscalCalendar),
    ).toBe("2026-07-26");
  });

  test("returns null when shift would leave bounds", () => {
    expect(
      shiftProfilePeriodMonthWithinBounds("2026-08-26", 1, bounds, true, fiscalCalendar),
    ).toBeNull();
  });
});

describe("resolveDefaultProfilePeriodMonthStart", () => {
  test("anchors to today when inside range", () => {
    expect(
      resolveDefaultProfilePeriodMonthStart(
        "2026-06-26",
        "2026-09-25",
        "2026-08-20",
        true,
        fiscalCalendar,
      ),
    ).toBe("2026-07-26");
  });

  test("clamps anchor to range edges", () => {
    expect(
      resolveDefaultProfilePeriodMonthStart(
        "2026-06-26",
        "2026-07-25",
        "2026-09-01",
        true,
        fiscalCalendar,
      ),
    ).toBe("2026-06-26");
  });
});

describe("resolveProfilePaceParams", () => {
  const quarterMonths = [
    {
      index: 0 as const,
      label: "June",
      from: "2026-06-26T00:00:00.000Z",
      toExclusive: "2026-07-26T00:00:00.000Z",
    },
    {
      index: 1 as const,
      label: "July",
      from: "2026-07-26T00:00:00.000Z",
      toExclusive: "2026-08-26T00:00:00.000Z",
    },
    {
      index: 2 as const,
      label: "August",
      from: "2026-08-26T00:00:00.000Z",
      toExclusive: "2026-09-26T00:00:00.000Z",
    },
  ];

  test("uses full fiscal quarter bounds and quarterly minimum for Q3 selection", () => {
    const pace = resolveProfilePaceParams({
      rangeStartKey: "2026-06-26",
      rangeEndKey: "2026-08-27",
      tenureEnabled: true,
      fiscalCalendar,
      monthlyMinHours: 200,
      quarterlyMinHours: 525,
      effectiveRangePreset: "tenure",
      effectiveTenureMonthIndexes: [],
      tenureQuarterMonths: quarterMonths,
      anchorDateKey: "2026-08-27",
    });

    expect(pace.paceStartKey).toBe("2026-06-26");
    expect(pace.paceEndKey).toBe("2026-09-25");
    expect(pace.baseMinHours).toBe(525);
    expect(pace.isSingleMonth).toBe(false);
  });

  test("uses selected tenure months for partial quarter selection", () => {
    const pace = resolveProfilePaceParams({
      rangeStartKey: "2026-06-26",
      rangeEndKey: "2026-07-20",
      tenureEnabled: true,
      fiscalCalendar,
      monthlyMinHours: 200,
      quarterlyMinHours: 525,
      effectiveRangePreset: "tenure",
      effectiveTenureMonthIndexes: [0],
      tenureQuarterMonths: quarterMonths,
      anchorDateKey: "2026-08-27",
    });

    expect(pace.paceStartKey).toBe("2026-06-26");
    expect(pace.paceEndKey).toBe("2026-07-25");
    expect(pace.baseMinHours).toBe(200);
    expect(pace.isSingleMonth).toBe(true);
  });
});
