import { describe, expect, test } from "bun:test";
import {
  applyDurationToDraft,
  applyEndTimeToDraft,
  applyStartTimeToDraft,
  commitClockLabelToDraft,
  commitDurationToDraft,
  draftSpansNextDay,
  draftToIsoRange,
  entryToDraft,
  formatClockTimeLabel,
  formatDurationInput,
  parseClockTimeLabel,
  type TimeEntryDraft,
} from "./time-entry-draft";

const baseDraft: TimeEntryDraft = {
  projectId: "project-1",
  taskId: "task-1",
  tagIds: [],
  isBillable: true,
  date: "2026-07-04",
  startTime: "23:00",
  endTime: "22:00",
  durationInput: "1:00",
  description: "",
};

describe("time-entry-draft", () => {
  test("formatDurationInput uses hh:mm:ss", () => {
    expect(formatDurationInput(848)).toBe("00:14:08");
    expect(formatDurationInput(840)).toBe("00:14:00");
    expect(formatDurationInput(3_600)).toBe("01:00:00");
  });

  test("overnightRange", () => {
    const overnightRange = draftToIsoRange({
      ...baseDraft,
      endTime: "01:00",
      durationInput: "2:00",
    });
    expect("error" in overnightRange).toBe(false);
    if (!("error" in overnightRange)) {
      expect(overnightRange.durationSeconds).toBe(7_200);
      expect(new Date(overnightRange.startAt).getDate()).toBe(4);
      expect(new Date(overnightRange.endAt).getDate()).toBe(5);
    }
  });

  test("pm to am overnight range stays valid", () => {
    const range = draftToIsoRange({
      ...baseDraft,
      startTime: "22:27:00",
      endTime: "11:29:00",
      durationInput: "13:02:00",
    });
    expect("error" in range).toBe(false);
    if (!("error" in range)) {
      expect(range.durationSeconds).toBe(46_920);
    }
    expect(
      draftSpansNextDay({
        ...baseDraft,
        startTime: "22:27:00",
        endTime: "11:29:00",
        durationInput: "13:02:00",
      }),
    ).toBe(true);
  });

  test("applyEndTimeToDraft", () => {
    const endDraft = applyEndTimeToDraft(
      { ...baseDraft, startTime: "23:00", endTime: "22:00", durationInput: "1:00" },
      "01:00",
    );
    expect(endDraft.date).toBe("2026-07-04");
    expect(endDraft.endTime).toBe("01:00");
    expect(endDraft.durationInput).toBe("02:00:00");
  });

  test("applyDurationToDraft", () => {
    const durationDraft = applyDurationToDraft(
      { ...baseDraft, startTime: "23:00", endTime: "22:00", durationInput: "1:00" },
      "2:00",
    );
    expect(durationDraft.date).toBe("2026-07-04");
    expect(durationDraft.endTime).toBe("01:00:00");
    expect(durationDraft.durationInput).toBe("02:00:00");
  });

  test("draftSpansNextDay", () => {
    expect(
      draftSpansNextDay({
        ...baseDraft,
        startTime: "23:00",
        endTime: "01:00",
        durationInput: "2:00",
      }),
    ).toBe(true);
  });

  test("sameDayRange", () => {
    const sameDayRange = draftToIsoRange({
      ...baseDraft,
      startTime: "09:00",
      endTime: "17:00",
      durationInput: "8:00",
    });
    expect("error" in sameDayRange).toBe(false);
    if (!("error" in sameDayRange)) {
      expect(sameDayRange.durationSeconds).toBe(28_800);
      expect(new Date(sameDayRange.startAt).getDate()).toBe(4);
      expect(new Date(sameDayRange.endAt).getDate()).toBe(4);
    }
  });

  test("sameDayDraft", () => {
    const sameDayDraft = applyEndTimeToDraft(
      { ...baseDraft, startTime: "09:00", endTime: "08:00", durationInput: "1:00" },
      "17:00",
    );
    expect(sameDayDraft.date).toBe("2026-07-04");
    expect(sameDayDraft.endTime).toBe("17:00");
    expect(sameDayDraft.durationInput).toBe("08:00:00");
    expect(draftSpansNextDay(sameDayDraft)).toBe(false);
  });

  test("staleDurationRange", () => {
    const staleDurationRange = draftToIsoRange({
      ...baseDraft,
      startTime: "10:43",
      endTime: "13:32",
      durationInput: "13:32:00",
    });
    expect("error" in staleDurationRange).toBe(false);
    if (!("error" in staleDurationRange)) {
      expect(staleDurationRange.durationSeconds).toBe(10_140);
    }
  });

  test("applyStartTimeToDraft", () => {
    const startDraft = applyStartTimeToDraft(
      { ...baseDraft, startTime: "10:43", endTime: "13:32", durationInput: "13:32:00" },
      "11:00",
    );
    expect(startDraft.endTime).toBe("13:32");
    expect(startDraft.durationInput).toBe("02:32:00");
  });

  test("entryToDraft preserves seconds", () => {
    const draft = entryToDraft({
      projectId: "project-1",
      taskId: "task-1",
      tags: [],
      isBillable: true,
      startedAt: new Date(2026, 6, 4, 10, 43, 27).toISOString(),
      endedAt: new Date(2026, 6, 4, 11, 0, 35).toISOString(),
      durationSeconds: 1_028,
      description: "precise",
    });
    expect(draft.startTime).toBe("10:43:27");
    expect(draft.endTime).toBe("11:00:35");
    expect(draft.durationInput).toBe("00:17:08");

    const range = draftToIsoRange(draft);
    expect("error" in range).toBe(false);
    if (!("error" in range)) {
      expect(range.durationSeconds).toBe(1_028);
    }
  });

  test("applyDurationToDraft keeps second precision on save", () => {
    const durationDraft = applyDurationToDraft(
      {
        ...baseDraft,
        startTime: "10:43:27",
        endTime: "11:00:35",
        durationInput: "00:17:08",
      },
      "00:14:08",
    );
    expect(durationDraft.endTime).toBe("10:57:35");
    expect(durationDraft.durationInput).toBe("00:14:08");

    const range = draftToIsoRange(durationDraft);
    expect("error" in range).toBe(false);
    if (!("error" in range)) {
      expect(range.durationSeconds).toBe(848);
    }
  });

  test("formatClockTimeLabel and parseClockTimeLabel", () => {
    expect(formatClockTimeLabel("05:17")).toBe("5:17AM");
    expect(formatClockTimeLabel("05:17:27")).toBe("5:17AM");
    expect(formatClockTimeLabel("22:38")).toBe("10:38PM");
    expect(formatClockTimeLabel("22:38:09")).toBe("10:38PM");
    expect(parseClockTimeLabel("5:17AM")).toBe("05:17:00");
    expect(parseClockTimeLabel("10:38 pm")).toBe("22:38:00");
    expect(parseClockTimeLabel("17:17")).toBe("17:17:00");
    expect(parseClockTimeLabel("517am")).toBe("05:17:00");
    expect(parseClockTimeLabel("bogus")).toBeNull();
  });

  test("parseClockTimeLabel accepts numpad decimal separators", () => {
    expect(parseClockTimeLabel("12.48")).toBe("12:48:00");
    expect(parseClockTimeLabel("12,48PM")).toBe("12:48:00");
    expect(parseClockTimeLabel("1.30", { preferMeridiem: "PM" })).toBe("13:30:00");
    expect(parseClockTimeLabel("130", { preferMeridiem: "PM" })).toBe("13:30:00");
    expect(parseClockTimeLabel("130", { preferMeridiem: "AM" })).toBe("01:30:00");
  });

  test("commitDurationToDraft normalizes shorthand and updates end time", () => {
    const draft: TimeEntryDraft = {
      ...baseDraft,
      date: "2026-08-20",
      startTime: "09:00:00",
      endTime: "09:03:30",
      durationInput: "00:03:30",
    };
    const result = commitDurationToDraft(draft, "1:30");
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.draft.durationInput).toBe("01:30:00");
    expect(result.draft.endTime).toBe("10:30:00");
  });

  test("commitDurationToDraft rejects invalid input with revert token", () => {
    const draft: TimeEntryDraft = {
      ...baseDraft,
      durationInput: "00:03:30",
    };
    expect(commitDurationToDraft(draft, "abc")).toEqual({
      error: "Invalid duration.",
      revertInput: "00:03:30",
    });
  });

  test("commitClockLabelToDraft parses Clockify labels into draft times", () => {
    const draft: TimeEntryDraft = {
      ...baseDraft,
      startTime: "09:00:00",
      endTime: "10:00:00",
      durationInput: "01:00:00",
    };
    const start = commitClockLabelToDraft(draft, "start", "9:15AM");
    expect("error" in start).toBe(false);
    if ("error" in start) return;
    expect(start.draft.startTime).toBe("09:15:00");
    expect(start.draft.endTime).toBe("10:00:00");

    const invalid = commitClockLabelToDraft(draft, "end", "bogus");
    expect(invalid).toEqual({
      error: "Invalid end time.",
      revertLabel: "10:00AM",
    });
  });
});
