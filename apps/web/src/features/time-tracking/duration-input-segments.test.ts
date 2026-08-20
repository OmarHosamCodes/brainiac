import { describe, expect, test } from "bun:test";

import {
  applyDurationBackspace,
  applyDurationDigit,
  durationSegmentSelection,
  moveDurationSegment,
  normalizeDurationShape,
  segmentIndexFromCaret,
} from "./duration-input-segments";

describe("duration-input-segments", () => {
  test("normalizeDurationShape keeps HH:MM:SS width", () => {
    expect(normalizeDurationShape("1:03:30")).toBe("01:03:30");
    expect(normalizeDurationShape("00:03:30")).toBe("00:03:30");
  });

  test("segmentIndexFromCaret maps positions", () => {
    expect(segmentIndexFromCaret(0)).toBe(0);
    expect(segmentIndexFromCaret(2)).toBe(0);
    expect(segmentIndexFromCaret(3)).toBe(1);
    expect(segmentIndexFromCaret(7)).toBe(2);
  });

  test("durationSegmentSelection returns stable bounds", () => {
    expect(durationSegmentSelection(0)).toEqual({ start: 0, end: 2 });
    expect(durationSegmentSelection(1)).toEqual({ start: 3, end: 5 });
    expect(durationSegmentSelection(2)).toEqual({ start: 6, end: 8 });
  });

  test("applyDurationDigit resets segment when requested", () => {
    const first = applyDurationDigit("00:03:30", 1, 0, "5", true);
    expect(first.value).toBe("00:50:30");
    expect(first.segmentIndex).toBe(1);
    expect(first.slotIndex).toBe(1);

    const second = applyDurationDigit(first.value, 1, 1, "0", false);
    expect(second.value).toBe("00:50:30");
    expect(second.segmentIndex).toBe(2);
    expect(second.slotIndex).toBe(0);
  });

  test("applyDurationDigit advances across segments", () => {
    const result = applyDurationDigit("00:03:30", 0, 0, "1", true);
    expect(result.value).toBe("10:03:30");
    expect(result.segmentIndex).toBe(0);
    expect(result.slotIndex).toBe(1);
  });

  test("moveDurationSegment clamps", () => {
    expect(moveDurationSegment(0, -1)).toBe(0);
    expect(moveDurationSegment(2, 1)).toBe(2);
    expect(moveDurationSegment(1, -1)).toBe(0);
  });

  test("applyDurationBackspace walks segments backward", () => {
    expect(applyDurationBackspace("00:03:30", 2, 0).value).toBe("00:03:00");
    expect(applyDurationBackspace("00:03:35", 2, 1).value).toBe("00:03:30");
  });
});
