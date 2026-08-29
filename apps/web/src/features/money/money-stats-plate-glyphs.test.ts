import { describe, expect, test } from "bun:test";

import { clampPlateRatio } from "./money-stats-plate-signal";

describe("clampPlateRatio", () => {
  test("clamps to 0-1", () => {
    expect(clampPlateRatio(-0.2)).toBe(0);
    expect(clampPlateRatio(1.5)).toBe(1);
    expect(clampPlateRatio(0.42)).toBe(0.42);
  });
});
