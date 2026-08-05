import { describe, expect, test } from "bun:test";

import {
  normalizeNumberRecord,
  normalizeStringArrayRecord,
  normalizeStringRecord,
  toggleIdInList,
} from "./money-settings-helpers";

describe("toggleIdInList", () => {
  test("adds and removes", () => {
    expect(toggleIdInList(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleIdInList(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("money settings normalize helpers", () => {
  test("normalizeStringRecord keeps valid maps", () => {
    expect(normalizeStringRecord({ a: "x" })).toEqual({ a: "x" });
    expect(normalizeStringRecord({ a: 1 })).toEqual({});
  });

  test("normalizeStringArrayRecord keeps valid maps", () => {
    expect(normalizeStringArrayRecord({ a: ["u1"] })).toEqual({ a: ["u1"] });
    expect(normalizeStringArrayRecord({ a: "u1" })).toEqual({});
  });

  test("normalizeNumberRecord keeps finite numbers", () => {
    expect(normalizeNumberRecord({ paid: 200 })).toEqual({ paid: 200 });
    expect(normalizeNumberRecord({ paid: Number.NaN })).toEqual({});
  });
});
