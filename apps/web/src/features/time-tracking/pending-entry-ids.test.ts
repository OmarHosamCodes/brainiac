import { describe, expect, test } from "bun:test";

import { releasePendingEntryIds } from "./pending-entry-ids";

describe("releasePendingEntryIds", () => {
  test("overlapping updates keep the in-flight sibling pending", () => {
    // A starts [e1], B starts [e1, e2], A finishes — snapshot restore would wipe e2
    // or worse restore [e1] after B finishes and spin forever.
    let ids = ["e1", "e2"];
    ids = releasePendingEntryIds(ids, ["e1"]);
    expect(ids).toEqual(["e2"]);
    ids = releasePendingEntryIds(ids, ["e2"]);
    expect(ids).toEqual([]);
  });

  test("same id begun twice still clears when either call finishes", () => {
    expect(releasePendingEntryIds(["e1"], ["e1"])).toEqual([]);
  });
});
