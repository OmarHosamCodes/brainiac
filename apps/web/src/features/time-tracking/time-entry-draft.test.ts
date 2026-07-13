import { describe, expect, test } from "bun:test";
import {
  applyDurationToDraft,
  applyEndTimeToDraft,
  applyStartTimeToDraft,
  draftSpansNextDay,
  draftToIsoRange,
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
    expect(durationDraft.endTime).toBe("01:00");
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

  test("formatClockTimeLabel and parseClockTimeLabel", () => {
    expect(formatClockTimeLabel("05:17")).toBe("5:17AM");
    expect(formatClockTimeLabel("22:38")).toBe("10:38PM");
    expect(parseClockTimeLabel("5:17AM")).toBe("05:17");
    expect(parseClockTimeLabel("10:38 pm")).toBe("22:38");
    expect(parseClockTimeLabel("17:17")).toBe("17:17");
    expect(parseClockTimeLabel("517am")).toBe("05:17");
    expect(parseClockTimeLabel("bogus")).toBeNull();
  });
});
