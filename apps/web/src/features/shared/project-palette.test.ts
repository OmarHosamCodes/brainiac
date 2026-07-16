import { describe, expect, test } from "bun:test";

import { PROJECT_PALETTE, projectHueFor } from "./project-palette";

describe("projectHueFor", () => {
  test("uses colorHueId override when valid", () => {
    expect(projectHueFor("any-id", 3)).toEqual(PROJECT_PALETTE[2]!);
  });

  test("falls back to hashed project id when colorHueId is null", () => {
    const hashed = projectHueFor("stable-project-id", null);
    const hashedAgain = projectHueFor("stable-project-id");
    expect(hashed).toEqual(hashedAgain);
    expect(PROJECT_PALETTE).toContainEqual(hashed);
  });

  test("ignores out-of-range colorHueId", () => {
    const hashed = projectHueFor("stable-project-id");
    expect(projectHueFor("stable-project-id", 0)).toEqual(hashed);
    expect(projectHueFor("stable-project-id", 99)).toEqual(hashed);
  });
});
