import { describe, expect, test } from "bun:test";

import { toggleIdInList } from "./money-settings-helpers";

describe("toggleIdInList", () => {
  test("adds and removes", () => {
    expect(toggleIdInList(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleIdInList(["a", "b"], "a")).toEqual(["b"]);
  });
});
