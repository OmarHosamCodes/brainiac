import { describe, expect, test } from "bun:test";
import { toFiscalCalendar } from "@orch/api/routers/agency-ops/resourcing/tenure-engine";

import {
  canShiftProfilePeriodMonth,
  clampDateKeyToRange,
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

function paceInput(
  patch: Partial<Parameters<typeof resolveProfilePaceParams>[0]> = {},
): Parameters<typeof resolveProfilePaceParams>[0] {
  return {
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
    ...patch,
  };
}

describe("clampDateKeyToRange", () => {
  test("clamps below start and above end", () => {
    expect(clampDateKeyToRange("2026-06-01", "2026-07-01", "2026-07-31")).toBe("2026-07-01");
    expect(clampDateKeyToRange("2026-08-15", "2026-07-01", "2026-07-31")).toBe("2026-07-31");
    expect(clampDateKeyToRange("2026-07-15", "2026-07-01", "2026-07-31")).toBe("2026-07-15");
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
    expect(shiftProfilePeriodMonthWithinBounds("2026-06-26", 1, bounds, true, fiscalCalendar)).toBe(
      "2026-07-26",
    );
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
  test("uses full fiscal quarter bounds and quarterly minimum for Q3 selection", () => {
    const pace = resolveProfilePaceParams(paceInput());
    expect(pace.paceStartKey).toBe("2026-06-26");
    expect(pace.paceEndKey).toBe("2026-09-25");
    expect(pace.baseMinHours).toBe(525);
    expect(pace.isSingleMonth).toBe(false);
  });

  test("uses selected tenure months for partial quarter selection", () => {
    const pace = resolveProfilePaceParams(
      paceInput({
        rangeStartKey: "2026-06-26",
        rangeEndKey: "2026-07-20",
        effectiveTenureMonthIndexes: [0],
      }),
    );
    expect(pace.paceStartKey).toBe("2026-06-26");
    expect(pace.paceEndKey).toBe("2026-07-25");
    expect(pace.baseMinHours).toBe(200);
    expect(pace.isSingleMonth).toBe(true);
  });

  test("last30 that crosses months keeps one monthly minimum and the selected range", () => {
    const pace = resolveProfilePaceParams(
      paceInput({
        rangeStartKey: "2026-07-28",
        rangeEndKey: "2026-08-27",
        effectiveRangePreset: "last30",
      }),
    );
    expect(pace.paceStartKey).toBe("2026-07-28");
    expect(pace.paceEndKey).toBe("2026-08-27");
    expect(pace.baseMinHours).toBe(200);
    expect(pace.isSingleMonth).toBe(false);
  });

  test("week inside one month does not expand to the full month", () => {
    const pace = resolveProfilePaceParams(
      paceInput({
        rangeStartKey: "2026-08-24",
        rangeEndKey: "2026-08-30",
        effectiveRangePreset: "week",
      }),
    );
    expect(pace.paceStartKey).toBe("2026-08-24");
    expect(pace.paceEndKey).toBe("2026-08-30");
    expect(pace.baseMinHours).toBe(200);
    expect(pace.isSingleMonth).toBe(false);
  });

  test("month preset uses the tenure month window and monthly minimum", () => {
    const pace = resolveProfilePaceParams(
      paceInput({
        rangeStartKey: "2026-07-26",
        rangeEndKey: "2026-08-20",
        effectiveRangePreset: "month",
      }),
    );
    expect(pace.paceStartKey).toBe("2026-07-26");
    expect(pace.paceEndKey).toBe("2026-08-25");
    expect(pace.baseMinHours).toBe(200);
    expect(pace.isSingleMonth).toBe(true);
  });
});
