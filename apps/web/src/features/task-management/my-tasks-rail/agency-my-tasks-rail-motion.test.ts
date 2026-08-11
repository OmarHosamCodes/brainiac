import { describe, expect, test } from "bun:test";
import { railStaggerIndex, RAIL_STAGGER_CAP } from "./agency-my-tasks-rail-motion";

describe("railStaggerIndex", () => {
  test("caps stagger so long lists do not delay forever", () => {
    expect(railStaggerIndex(0)).toBe(0);
    expect(railStaggerIndex(3)).toBe(3);
    expect(railStaggerIndex(99)).toBe(RAIL_STAGGER_CAP - 1);
  });
});
