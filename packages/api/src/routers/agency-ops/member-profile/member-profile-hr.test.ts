import { describe, expect, test } from "bun:test";

import {
  buildCalendarMonth,
  buildLeaveBalances,
  buildWeekHours,
  DEFAULT_OFF_ALLOWANCE_DAYS,
  leaveAllowancePeriodWindow,
} from "./member-profile-hr";

describe("leaveAllowancePeriodWindow", () => {
  test("year spans the calendar year", () => {
    expect(leaveAllowancePeriodWindow("year", "2026-07-15")).toEqual({
      kind: "year",
      start: "2026-01-01",
      end: "2026-12-31",
      label: "2026",
    });
  });

  test("quarter spans the containing quarter", () => {
    expect(leaveAllowancePeriodWindow("quarter", "2026-05-10")).toEqual({
      kind: "quarter",
      start: "2026-04-01",
      end: "2026-06-30",
      label: "Q2 2026",
    });
  });

  test("month spans the containing month", () => {
    const window = leaveAllowancePeriodWindow("month", "2026-02-10");
    expect(window.kind).toBe("month");
    expect(window.start).toBe("2026-02-01");
    expect(window.end).toBe("2026-02-28");
  });
});

describe("buildLeaveBalances", () => {
  test("counts all leave types against the Off days pool within the year", () => {
    const balances = buildLeaveBalances({
      period: "year",
      anchorDate: "2026-07-01",
      leave: [
        { startDate: "2026-01-02", endDate: "2026-01-03", type: "pto" },
        { startDate: "2026-02-01", endDate: "2026-02-01", type: "sick" },
        { startDate: "2025-12-30", endDate: "2026-01-01", type: "other" },
        { startDate: "2026-06-01", endDate: "2026-06-01", type: "team_holiday" },
      ],
      offAllowanceDays: DEFAULT_OFF_ALLOWANCE_DAYS,
    });

    expect(balances.all.usedDays).toBe(5); // 2 pto + 1 sick + 1 other (Jan 1) + 1 holiday
    expect(balances.all.allowanceDays).toBe(DEFAULT_OFF_ALLOWANCE_DAYS);
    expect(balances.period.kind).toBe("year");
  });

  test("clips used days to the active quarter", () => {
    const balances = buildLeaveBalances({
      period: "quarter",
      anchorDate: "2026-05-15",
      leave: [
        { startDate: "2026-03-31", endDate: "2026-04-02", type: "pto" },
        { startDate: "2026-05-01", endDate: "2026-05-01", type: "sick" },
        { startDate: "2026-07-01", endDate: "2026-07-01", type: "other" },
      ],
      offAllowanceDays: 10,
    });

    expect(balances.period.label).toBe("Q2 2026");
    expect(balances.all.usedDays).toBe(3); // Apr 1–2 + May 1
    expect(balances.all.allowanceDays).toBe(10);
  });

  test("clips used days to the active month", () => {
    const balances = buildLeaveBalances({
      period: "month",
      anchorDate: "2026-06-15",
      leave: [
        { startDate: "2026-05-31", endDate: "2026-06-02", type: "pto" },
        { startDate: "2026-06-10", endDate: "2026-06-10", type: "sick" },
        { startDate: "2026-07-01", endDate: "2026-07-01", type: "other" },
      ],
      offAllowanceDays: 3,
    });

    expect(balances.period.start).toBe("2026-06-01");
    expect(balances.all.usedDays).toBe(3); // Jun 1–2 + Jun 10
    expect(balances.all.allowanceDays).toBe(3);
  });
});

describe("buildWeekHours", () => {
  test("returns Mon–Sun for the week containing the anchor", () => {
    const seconds = new Map([
      ["2026-07-20", 3600],
      ["2026-07-22", 7200],
    ]);
    const week = buildWeekHours("2026-07-23", seconds);
    expect(week).toHaveLength(7);
    expect(week[0]?.date).toBe("2026-07-20");
    expect(week[0]?.totalSeconds).toBe(3600);
    expect(week[2]?.totalSeconds).toBe(7200);
    expect(week[6]?.date).toBe("2026-07-26");
  });

  test("returns Sun–Sat when weekStartsOn is Sunday", () => {
    const week = buildWeekHours("2026-07-23", new Map(), 0);
    expect(week).toHaveLength(7);
    expect(week[0]?.date).toBe("2026-07-19");
    expect(week[0]?.weekdayLabel).toBe("S");
    expect(week[6]?.date).toBe("2026-07-25");
  });
});

describe("buildCalendarMonth", () => {
  test("marks present and leave days inside the month grid", () => {
    const month = buildCalendarMonth({
      monthDate: "2026-06-15",
      secondsByDate: new Map([["2026-06-02", 1800]]),
      leave: [
        {
          id: "l1",
          startDate: "2026-06-03",
          endDate: "2026-06-03",
          type: "pto",
          reason: null,
        },
      ],
    });

    expect(month.year).toBe(2026);
    expect(month.month).toBe(6);
    expect(month.weekdayLabels).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    const present = month.days.find((d) => d.date === "2026-06-02");
    const leave = month.days.find((d) => d.date === "2026-06-03");
    expect(present?.status).toBe("present");
    expect(leave?.status).toBe("leave");
    expect(month.days[0]!.date <= "2026-06-01").toBe(true);
  });

  test("weekday labels follow weekStartsOn", () => {
    const month = buildCalendarMonth({
      monthDate: "2026-06-15",
      secondsByDate: new Map(),
      leave: [],
      weekStartsOn: 0,
    });
    expect(month.weekdayLabels[0]).toBe("S");
    expect(month.weekdayLabels[1]).toBe("M");
  });
});
