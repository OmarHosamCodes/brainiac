import { describe, expect, test } from "bun:test";

import {
  classifyTimeEntryEditError,
  validateTimeEntryDraft,
  type TimeEntryDraft,
} from "./agency-time-entry";

const overnightDraft: TimeEntryDraft = {
  projectId: "project-1",
  taskId: "",
  tagIds: [],
  isBillable: true,
  date: "2026-08-08",
  startTime: "22:27:00",
  endTime: "11:29:00",
  durationInput: "13:02:00",
  description: "UX",
};

describe("validateTimeEntryDraft", () => {
  test("overnight range is valid without a task when requireTask is false", () => {
    expect(validateTimeEntryDraft(overnightDraft)).toBe("Select a task.");
    expect(validateTimeEntryDraft(overnightDraft, { requireTask: false })).toBeNull();
  });
});

describe("classifyTimeEntryEditError", () => {
  test("does not mark clocks invalid for a missing task", () => {
    expect(classifyTimeEntryEditError("Select a task.")).toEqual({
      start: false,
      end: false,
      duration: false,
    });
  });

  test("scopes invalid start and end separately", () => {
    expect(classifyTimeEntryEditError("Invalid start time.")).toEqual({
      start: true,
      end: false,
      duration: false,
    });
    expect(classifyTimeEntryEditError("Invalid end time.")).toEqual({
      start: false,
      end: true,
      duration: false,
    });
  });

  test("marks both clocks for an inverted range", () => {
    expect(classifyTimeEntryEditError("End time must be after start time.")).toEqual({
      start: true,
      end: true,
      duration: false,
    });
  });
});
