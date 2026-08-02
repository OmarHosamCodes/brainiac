import { describe, expect, test } from "bun:test";

import {
  buildCalendarMonth,
  buildLeaveBalances,
  buildWeekHours,
  DEFAULT_OTHER_ALLOWANCE_DAYS,
  DEFAULT_PTO_ALLOWANCE_DAYS,
  DEFAULT_SICK_ALLOWANCE_DAYS,
} from "./member-profile-hr";

describe("buildLeaveBalances", () => {
  test("counts overlapping days by type within the year", () => {
    const balances = buildLeaveBalances({
      year: 2026,
      leave: [
        { startDate: "2026-01-02", endDate: "2026-01-03", type: "pto" },
        { startDate: "2026-02-01", endDate: "2026-02-01", type: "sick" },
        { startDate: "2025-12-30", endDate: "2026-01-01", type: "other" },
        { startDate: "2026-06-01", endDate: "2026-06-01", type: "team_holiday" },
      ],
      ptoAllowanceDays: DEFAULT_PTO_ALLOWANCE_DAYS,
      sickAllowanceDays: DEFAULT_SICK_ALLOWANCE_DAYS,
      otherAllowanceDays: DEFAULT_OTHER_ALLOWANCE_DAYS,
    });

    expect(balances.pto.usedDays).toBe(2);
    expect(balances.sick.usedDays).toBe(1);
    expect(balances.other.usedDays).toBe(2); // Jan 1 other + Jun 1 holiday
    expect(balances.all.usedDays).toBe(5);
    expect(balances.all.allowanceDays).toBe(30);
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
    const present = month.days.find((d) => d.date === "2026-06-02");
    const leave = month.days.find((d) => d.date === "2026-06-03");
    expect(present?.status).toBe("present");
    expect(leave?.status).toBe("leave");
    expect(month.days[0]!.date <= "2026-06-01").toBe(true);
  });
});
