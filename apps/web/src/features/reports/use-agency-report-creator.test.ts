import { describe, expect, test } from "bun:test";

import { applyExcludeEntry, applyStartEditing } from "./use-agency-report-creator";

describe("agency report creator entry targeting", () => {
  test("applyStartEditing selects and edits the given entry id", () => {
    expect(applyStartEditing("b")).toEqual({
      selectedEntryId: "b",
      editingEntryId: "b",
    });
  });

  test("applyExcludeEntry removes only the given id and clears selection when it matches", () => {
    const withOtherSelected = applyExcludeEntry({
      excludedEntryIds: new Set(),
      excludeUndoStack: [],
      selectedEntryId: "a",
      editingEntryId: null,
      entryId: "b",
    });
    expect([...withOtherSelected.excludedEntryIds]).toEqual(["b"]);
    expect(withOtherSelected.selectedEntryId).toBe("a");
    expect(withOtherSelected.excludeUndoStack).toEqual(["b"]);

    const withSameSelected = applyExcludeEntry({
      excludedEntryIds: new Set(["b"]),
      excludeUndoStack: ["b"],
      selectedEntryId: "a",
      editingEntryId: "a",
      entryId: "a",
    });
    expect([...withSameSelected.excludedEntryIds].sort()).toEqual(["a", "b"]);
    expect(withSameSelected.selectedEntryId).toBeNull();
    expect(withSameSelected.editingEntryId).toBeNull();
  });
});
