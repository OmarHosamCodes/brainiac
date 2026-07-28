import { describe, expect, test } from "bun:test";
import {
  clockNudgeMinutes,
  durationNudgeSeconds,
  nudgeClockTimeLabel,
  nudgeDraftClockTime,
  nudgeDurationInput,
  shouldSyncTimeDraftFromEntry,
} from "./time-field-keyboard";

describe("time-field-keyboard", () => {
  test("clockNudgeMinutes maps arrows and shift", () => {
    expect(clockNudgeMinutes({ key: "ArrowUp", shiftKey: false })).toBe(1);
    expect(clockNudgeMinutes({ key: "ArrowUp", shiftKey: true })).toBe(5);
    expect(clockNudgeMinutes({ key: "ArrowDown", shiftKey: false })).toBe(-1);
    expect(clockNudgeMinutes({ key: "ArrowDown", shiftKey: true })).toBe(-5);
    expect(clockNudgeMinutes({ key: "Enter", shiftKey: false })).toBeNull();
  });

  test("durationNudgeSeconds maps arrows and shift", () => {
    expect(durationNudgeSeconds({ key: "ArrowUp", shiftKey: false })).toBe(1);
    expect(durationNudgeSeconds({ key: "ArrowUp", shiftKey: true })).toBe(60);
    expect(durationNudgeSeconds({ key: "ArrowDown", shiftKey: false })).toBe(-1);
    expect(durationNudgeSeconds({ key: "Enter", shiftKey: false })).toBeNull();
  });

  test("nudgeDraftClockTime wraps within the day", () => {
    expect(nudgeDraftClockTime("05:17:00", 1)).toBe("05:18:00");
    expect(nudgeDraftClockTime("00:00:00", -1)).toBe("23:59:00");
    expect(nudgeDraftClockTime("23:59:00", 1)).toBe("00:00:00");
  });

  test("nudgeClockTimeLabel preserves Clockify label shape", () => {
    expect(nudgeClockTimeLabel("5:17AM", 1)).toBe("5:18AM");
    expect(nudgeClockTimeLabel("11:59PM", 1)).toBe("12:00AM");
  });

  test("nudgeDurationInput stays second-precise and clamps at zero", () => {
    expect(nudgeDurationInput("00:14:08", 1)).toBe("00:14:09");
    expect(nudgeDurationInput("00:00:00", -1)).toBe("00:00:00");
    expect(nudgeDurationInput("00:01:00", -60)).toBe("00:00:00");
    expect(nudgeDurationInput("bogus", 1)).toBeNull();
  });

  test("shouldSyncTimeDraftFromEntry locks while clock or duration editing", () => {
    expect(shouldSyncTimeDraftFromEntry({ editingDuration: false, timeEditorOpen: false })).toBe(
      true,
    );
    expect(shouldSyncTimeDraftFromEntry({ editingDuration: false, timeEditorOpen: true })).toBe(
      false,
    );
    expect(shouldSyncTimeDraftFromEntry({ editingDuration: true, timeEditorOpen: false })).toBe(
      false,
    );
  });
});
