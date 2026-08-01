import { describe, expect, test } from "bun:test";

import {
  STRIP_WEEK_COL_PX,
  STRIP_WEEKDAY_GUTTER_PX,
  stripFillWeekCount,
} from "./member-profile-heat-strip-fill";

describe("stripFillWeekCount", () => {
  test("returns 0 when real weeks already fill the width", () => {
    const width = STRIP_WEEKDAY_GUTTER_PX + 10 * STRIP_WEEK_COL_PX;
    expect(stripFillWeekCount(width, 10)).toBe(0);
  });

  test("pads with empty weeks to fill leftover panel width", () => {
    // ~662px panel from the Contribution strip screenshot
    const width = 662;
    const realWeeks = 6;
    const fill = stripFillWeekCount(width, realWeeks);
    expect(fill).toBeGreaterThan(0);
    const capacity = realWeeks + fill;
    expect(capacity * STRIP_WEEK_COL_PX + STRIP_WEEKDAY_GUTTER_PX).toBeGreaterThanOrEqual(width);
  });

  test("returns 0 for empty or invalid container", () => {
    expect(stripFillWeekCount(0, 4)).toBe(0);
    expect(stripFillWeekCount(20, 4)).toBe(0);
  });
});
