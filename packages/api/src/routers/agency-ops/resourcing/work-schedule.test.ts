import { describe, expect, test } from "bun:test";

import {
  getWeekStartKey,
  isWeekendDateKey,
  rotateWeekdayLabels,
  standardWeekCapacitySeconds,
  standardWeekHours,
  startOfWeekUtc,
} from "./work-schedule";

describe("work-schedule", () => {
  test("Monday start week key matches prior Monday math", () => {
    expect(getWeekStartKey("2026-07-25", 1)).toBe("2026-07-20");
    expect(getWeekStartKey("2026-07-20", 1)).toBe("2026-07-20");
  });

  test("Sunday start week key", () => {
    expect(getWeekStartKey("2026-07-25", 0)).toBe("2026-07-19");
    expect(getWeekStartKey("2026-07-19", 0)).toBe("2026-07-19");
  });

  test("Mon + 2 weekend is Sat/Sun", () => {
    expect(isWeekendDateKey("2026-07-24", 1, 2)).toBe(false); // Fri
    expect(isWeekendDateKey("2026-07-25", 1, 2)).toBe(true); // Sat
    expect(isWeekendDateKey("2026-07-26", 1, 2)).toBe(true); // Sun
    expect(isWeekendDateKey("2026-07-20", 1, 2)).toBe(false); // Mon
  });

  test("Sun + 2 weekend is Fri/Sat", () => {
    expect(isWeekendDateKey("2026-07-24", 0, 2)).toBe(true); // Fri
    expect(isWeekendDateKey("2026-07-25", 0, 2)).toBe(true); // Sat
    expect(isWeekendDateKey("2026-07-26", 0, 2)).toBe(false); // Sun (week start)
    expect(isWeekendDateKey("2026-07-19", 0, 2)).toBe(false); // Sun
  });

  test("standard week hours and capacity", () => {
    expect(standardWeekHours(8, 2)).toBe(40);
    expect(standardWeekCapacitySeconds(8, 2)).toBe(144_000);
  });

  test("rotate weekday labels for Sunday start", () => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
    expect(rotateWeekdayLabels(labels, 1)).toEqual([...labels]);
    expect(rotateWeekdayLabels(labels, 0)).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ]);
  });

  test("startOfWeekUtc Monday vs Sunday", () => {
    const sat = new Date("2026-07-25T12:00:00.000Z");
    expect(startOfWeekUtc(sat, 1).toISOString()).toBe("2026-07-20T00:00:00.000Z");
    expect(startOfWeekUtc(sat, 0).toISOString()).toBe("2026-07-19T00:00:00.000Z");
  });
});
