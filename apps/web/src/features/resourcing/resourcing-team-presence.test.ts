import { describe, expect, test } from "bun:test";

import type { MemberProfileHeatMapData } from "@/features/member-profile/member-profile-heat-map";
import {
  buildPresenceCalendarDays,
  buildPresenceOverview,
  formatPresenceSegmentLabel,
  monthsInRange,
  presenceModeForGrain,
  shortDisplayName,
} from "@/features/resourcing/resourcing-team-presence";

function heat(days: Array<{ date: string; off?: boolean }>): MemberProfileHeatMapData {
  return {
    startDate: days[0]?.date ?? "2026-08-01",
    endDate: days[days.length - 1]?.date ?? "2026-08-01",
    days: days.map((day) => ({
      date: day.date,
      totalSeconds: day.off ? 0 : 3600,
      intensity: day.off ? 0 : 2,
      off: day.off ? { type: "pto", reason: null } : null,
      offBand: day.off ? "single" : null,
      hoursLabel: day.off ? "0m" : "1h 0m",
      dayOfMonthLabel: String(Number(day.date.slice(8, 10))),
    })),
  };
}

describe("resourcing-team-presence", () => {
  test("shortDisplayName uses first token", () => {
    expect(shortDisplayName("Omar Hosam")).toBe("Omar");
  });

  test("presenceModeForGrain maps week/month to calendar", () => {
    expect(presenceModeForGrain("month")).toBe("calendar");
    expect(presenceModeForGrain("quarter")).toBe("overview");
  });

  test("monthsInRange lists inclusive months", () => {
    expect(monthsInRange("2026-08-15", "2026-10-02")).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  test("buildPresenceCalendarDays splits working vs out", () => {
    const cells = buildPresenceCalendarDays(
      [
        {
          userId: "a",
          userName: "Ada Lovelace",
          heatMap: heat([{ date: "2026-08-03" }, { date: "2026-08-04", off: true }]),
        },
        {
          userId: "b",
          userName: "Saif",
          heatMap: heat([{ date: "2026-08-03" }, { date: "2026-08-04" }]),
        },
      ],
      "2026-08",
    );
    const day3 = cells.find((cell) => cell.date === "2026-08-03");
    const day4 = cells.find((cell) => cell.date === "2026-08-04");
    expect(day3?.working.map((person) => person.userId).sort()).toEqual(["a", "b"]);
    expect(day4?.working.map((person) => person.userId)).toEqual(["b"]);
    expect(day4?.out.map((person) => person.userId)).toEqual(["a"]);
  });

  test("buildPresenceOverview marks full-month working", () => {
    const days = Array.from({ length: 31 }, (_, index) => ({
      date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    }));
    const { rows } = buildPresenceOverview(
      [{ userId: "s", userName: "Saif", heatMap: heat(days) }],
      "2026-08-01",
      "2026-08-31",
    );
    const august = rows[0]?.months[0];
    expect(august?.segments).toHaveLength(1);
    expect(august?.segments[0]?.fullMonth).toBe(true);
    expect(formatPresenceSegmentLabel(august!.segments[0]!)).toBe("Full month");
  });
});
