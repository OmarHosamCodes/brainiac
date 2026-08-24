import { describe, expect, test } from "bun:test";

import {
  addInternDuration,
  computeInternWindow,
  computeMemberTenure,
  enumerateFiscalQuarters,
  fiscalQuarterLabel,
  formatTenureMonths,
  getFiscalQuarterForDate,
  getFiscalQuarterRange,
  getFiscalYearEndDate,
  getFiscalYearStartDate,
  getTenureMonthForDate,
  isInternQuarter,
  quarterCountsForRawTenure,
  resolveProfilePeriodMonth,
  shiftProfilePeriodMonth,
  shiftTenureMonthStart,
  type FiscalCalendar,
  type MemberTenureProfileInput,
  type TenureExemptionInput,
  type TenurePolicyInput,
} from "./tenure-engine";

const defaultProfile: MemberTenureProfileInput = {
  internStartOverride: null,
  internEndOverride: null,
  internCountsTowardTenure: false,
  internExemptFromQuarterMin: true,
};

const calendarMonthStart: FiscalCalendar = {
  fiscalYearStartMonth: 1,
  fiscalYearStartDay: 1,
};

const calendarDec26: FiscalCalendar = {
  fiscalYearStartMonth: 12,
  fiscalYearStartDay: 26,
};

function basePolicy(overrides: Partial<TenurePolicyInput> = {}): TenurePolicyInput {
  return {
    fiscalYearStartMonth: 1,
    fiscalYearStartDay: 1,
    quarterlyMinHours: 525,
    monthlyMinHours: 200,
    penaltyMonths: 6,
    internDurationMonths: 4,
    internDurationWeeks: 0,
    requiredDailyHours: 8,
    weekStartsOn: 1,
    weekendDurationDays: 2,
    offDayReduceHours: 8,
    policyEffectiveFrom: new Date("2024-01-01T00:00:00.000Z"),
    enabled: true,
    ...overrides,
  };
}

describe("getFiscalQuarterRange", () => {
  test("calendar year Q1 is Jan–Mar", () => {
    const range = getFiscalQuarterRange(calendarMonthStart, 2025, 1);
    expect(range.start.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2025-04-01T00:00:00.000Z");
  });

  test("April fiscal year Q1 starts in April", () => {
    const range = getFiscalQuarterRange(
      { fiscalYearStartMonth: 4, fiscalYearStartDay: 1 },
      2025,
      1,
    );
    expect(range.start.toISOString()).toBe("2025-04-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2025-07-01T00:00:00.000Z");
  });

  test("Dec 26 fiscal year runs Dec 26 2025 through Dec 25 2026", () => {
    const fyStart = getFiscalYearStartDate(2025, calendarDec26);
    const fyEnd = getFiscalYearEndDate(2025, calendarDec26);

    expect(fyStart.toISOString()).toBe("2025-12-26T00:00:00.000Z");
    expect(fyEnd.toISOString()).toBe("2026-12-26T00:00:00.000Z");

    const q1 = getFiscalQuarterRange(calendarDec26, 2025, 1);
    expect(q1.start.toISOString()).toBe("2025-12-26T00:00:00.000Z");
    expect(q1.end.toISOString()).toBe("2026-03-26T00:00:00.000Z");
  });
});

describe("getFiscalQuarterForDate", () => {
  test("maps January to prior fiscal year when FY starts in April", () => {
    const ref = getFiscalQuarterForDate(new Date("2026-02-15T00:00:00.000Z"), {
      fiscalYearStartMonth: 4,
      fiscalYearStartDay: 1,
    });
    expect(ref).toEqual({ fiscalYear: 2025, fiscalQuarter: 4 });
  });

  test("maps Dec 30 2025 to FY2025 Q1 when fiscal months start on the 26th", () => {
    const ref = getFiscalQuarterForDate(new Date("2025-12-30T00:00:00.000Z"), calendarDec26);
    expect(ref).toEqual({ fiscalYear: 2025, fiscalQuarter: 1 });
  });

  test("maps Dec 20 2025 to prior fiscal year Q4 when fiscal months start on the 26th", () => {
    const ref = getFiscalQuarterForDate(new Date("2025-12-20T00:00:00.000Z"), calendarDec26);
    expect(ref).toEqual({ fiscalYear: 2024, fiscalQuarter: 4 });
  });
});

describe("computeInternWindow", () => {
  test("derives intern end from first tracked time and policy duration", () => {
    const firstTrackedAt = new Date("2025-01-15T10:00:00.000Z");
    const result = computeInternWindow({
      firstTrackedAt,
      profile: defaultProfile,
      policy: { internDurationMonths: 4, internDurationWeeks: 3 },
    });

    expect(result.internStart?.toISOString()).toBe(firstTrackedAt.toISOString());
    expect(result.derived).toBe(true);
    expect(result.internEnd?.toISOString()).toBe(
      addInternDuration(firstTrackedAt, 4, 3).toISOString(),
    );
  });
});

describe("intern completion quarter", () => {
  test("excludes completion quarter from raw tenure when intern ends mid-quarter", () => {
    const internEnd = new Date("2025-05-15T00:00:00.000Z");
    const q2 = getFiscalQuarterRange(calendarMonthStart, 2025, 2);
    const q3 = getFiscalQuarterRange(calendarMonthStart, 2025, 3);

    expect(isInternQuarter(q2, new Date("2025-01-15T00:00:00.000Z"), internEnd)).toBe(true);

    expect(
      quarterCountsForRawTenure({
        range: q2,
        now: new Date("2026-01-01T00:00:00.000Z"),
        policyEffectiveFrom: new Date("2024-01-01T00:00:00.000Z"),
        internStart: new Date("2025-01-15T00:00:00.000Z"),
        internEnd,
        internCountsTowardTenure: false,
        calendar: calendarMonthStart,
      }),
    ).toBe(false);

    expect(
      quarterCountsForRawTenure({
        range: q3,
        now: new Date("2026-01-01T00:00:00.000Z"),
        policyEffectiveFrom: new Date("2024-01-01T00:00:00.000Z"),
        internStart: new Date("2025-01-15T00:00:00.000Z"),
        internEnd,
        internCountsTowardTenure: false,
        calendar: calendarMonthStart,
      }),
    ).toBe(true);
  });
});

describe("computeMemberTenure", () => {
  test("waives quarter minimum for team holiday", () => {
    const exemptions: TenureExemptionInput[] = [
      {
        type: "team_holiday",
        fiscalYear: 2024,
        fiscalQuarter: 2,
        userId: null,
        reducedMinHours: null,
        frozenMonth: null,
      },
    ];

    const result = computeMemberTenure({
      policy: basePolicy(),
      profile: defaultProfile,
      userId: "user-1",
      teamJoinDate: new Date("2023-01-01T00:00:00.000Z"),
      firstTrackedAt: new Date("2023-06-01T00:00:00.000Z"),
      loggedHoursByQuarterKey: new Map([["2024-2", 0]]),
      exemptions,
      now: new Date("2024-08-01T00:00:00.000Z"),
    });

    const q2 = result.quarters.find(
      (quarter) => quarter.fiscalYear === 2024 && quarter.fiscalQuarter === 2,
    );
    expect(q2?.status).toBe("waived");
  });

  test("reports awaiting first entry when no tracked time", () => {
    const result = computeMemberTenure({
      policy: basePolicy(),
      profile: defaultProfile,
      userId: "user-1",
      teamJoinDate: new Date("2025-01-01T00:00:00.000Z"),
      firstTrackedAt: null,
      loggedHoursByQuarterKey: new Map(),
      exemptions: [],
      now: new Date("2025-06-01T00:00:00.000Z"),
    });

    expect(result.awaitingFirstEntry).toBe(true);
    expect(result.internStart).toBeNull();
  });
});

describe("enumerateFiscalQuarters", () => {
  test("lists quarters spanning multiple fiscal years", () => {
    const quarters = enumerateFiscalQuarters({
      calendar: calendarMonthStart,
      from: new Date("2024-10-01T00:00:00.000Z"),
      to: new Date("2025-04-15T00:00:00.000Z"),
    });

    const labels = quarters.map((quarter) =>
      fiscalQuarterLabel(quarter.fiscalYear, quarter.fiscalQuarter),
    );
    expect(labels).toContain("FY24 Q4");
    expect(labels).toContain("FY25 Q1");
    expect(labels).toContain("FY25 Q2");
  });
});

describe("formatTenureMonths", () => {
  test("formats years and months", () => {
    expect(formatTenureMonths(14)).toBe("1y 2m");
    expect(formatTenureMonths(24)).toBe("2y");
    expect(formatTenureMonths(5)).toBe("5m");
  });
});

describe("tenure month periods", () => {
  test("getTenureMonthForDate uses calendar month when fiscal year starts Jan 1", () => {
    const month = getTenureMonthForDate(new Date("2026-08-15T12:00:00.000Z"), calendarMonthStart);
    expect(month.startKey).toBe("2026-08-01");
    expect(month.endKey).toBe("2026-08-31");
    expect(month.fingerprint).toBe("tm:2026-08-01");
    expect(month.label).toBe("August 2026");
  });

  test("getTenureMonthForDate spans two calendar months when fiscal year starts Dec 26", () => {
    const month = getTenureMonthForDate(new Date("2026-08-15T12:00:00.000Z"), calendarDec26);
    expect(month.startKey).toBe("2026-07-26");
    expect(month.endKey).toBe("2026-08-25");
    expect(month.fingerprint).toBe("tm:2026-07-26");
  });

  test("shiftTenureMonthStart crosses quarter boundary", () => {
    const shifted = shiftTenureMonthStart("2026-08-26", 1, calendarDec26);
    expect(shifted.startKey).toBe("2026-09-26");
    expect(shifted.endKey).toBe("2026-10-25");
  });

  test("resolveProfilePeriodMonth falls back to calendar month when tenure disabled", () => {
    const period = resolveProfilePeriodMonth({
      tenureEnabled: false,
      calendar: calendarMonthStart,
      anchorDateKey: "2026-08-20",
    });
    expect(period.startKey).toBe("2026-08-01");
    expect(period.endKey).toBe("2026-08-31");
    expect(period.isTenureMonth).toBe(false);
    expect(period.fingerprint).toBe("tm:2026-08-01");
  });

  test("resolveProfilePeriodMonth honors requested start key when tenure enabled", () => {
    const period = resolveProfilePeriodMonth({
      tenureEnabled: true,
      calendar: calendarDec26,
      anchorDateKey: "2026-08-20",
      requestedStartKey: "2026-07-26",
    });
    expect(period.startKey).toBe("2026-07-26");
    expect(period.endKey).toBe("2026-08-25");
    expect(period.isTenureMonth).toBe(true);
  });

  test("resolveProfilePeriodMonth uses month containing requestedStartKey when not a tenure start", () => {
    const period = resolveProfilePeriodMonth({
      tenureEnabled: true,
      calendar: calendarDec26,
      anchorDateKey: "2026-08-20",
      requestedStartKey: "2026-08-01",
    });
    expect(period.startKey).toBe("2026-07-26");
    expect(period.endKey).toBe("2026-08-25");
  });

  test("shiftProfilePeriodMonth shifts calendar months when tenure is disabled", () => {
    const next = shiftProfilePeriodMonth("2026-08-01", 1, {
      tenureEnabled: false,
      calendar: calendarMonthStart,
    });
    expect(next.startKey).toBe("2026-09-01");
    expect(next.endKey).toBe("2026-09-30");
  });

  test("shiftProfilePeriodMonth shifts tenure months when tenure is enabled", () => {
    const next = shiftProfilePeriodMonth("2026-07-26", 1, {
      tenureEnabled: true,
      calendar: calendarDec26,
    });
    expect(next.startKey).toBe("2026-08-26");
    expect(next.endKey).toBe("2026-09-25");
  });
});
