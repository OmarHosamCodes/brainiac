import { describe, expect, test } from "bun:test";

import {
  addDaysToDateKey,
  getLocalWeekBounds,
  getLocalWeekStartKeyFromDateKey,
  localDateKeyFromInstant,
} from "./local-week-bounds";

describe("local-week-bounds", () => {
  test("localDateKeyFromInstant respects utc offset", () => {
    // 2026-07-25T02:00Z with +180 → still 2026-07-25 local morning
    expect(localDateKeyFromInstant(new Date("2026-07-25T02:00:00.000Z"), -180)).toBe("2026-07-25");
    // same instant with -300 → previous local calendar day
    expect(localDateKeyFromInstant(new Date("2026-07-25T02:00:00.000Z"), 300)).toBe("2026-07-24");
  });

  test("week starts Monday", () => {
    expect(getLocalWeekStartKeyFromDateKey("2026-07-25")).toBe("2026-07-20");
    expect(addDaysToDateKey("2026-07-20", 6)).toBe("2026-07-26");
  });

  test("getLocalWeekBounds returns Mon–Sun window", () => {
    const bounds = getLocalWeekBounds(new Date("2026-07-25T12:00:00.000Z"), 0);
    expect(bounds.weekStartKey).toBe("2026-07-20");
    expect(bounds.weekStart.toISOString()).toBe("2026-07-20T00:00:00.000Z");
    expect(bounds.weekEnd.toISOString()).toBe("2026-07-26T23:59:59.999Z");
  });
});
