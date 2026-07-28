import { describe, expect, test } from "bun:test";

import { shouldSkipActiveTimerDescriptionSync } from "./tracker-description-sync";

describe("shouldSkipActiveTimerDescriptionSync", () => {
  test("never skips when hydrating a different timer", () => {
    expect(
      shouldSkipActiveTimerDescriptionSync({
        sameTimer: false,
        skipDescription: true,
        descriptionDirty: true,
      }),
    ).toBe(false);
  });

  test("skips when the local draft is dirty on the same timer", () => {
    expect(
      shouldSkipActiveTimerDescriptionSync({
        sameTimer: true,
        descriptionDirty: true,
      }),
    ).toBe(true);
  });

  test("skips when the caller requests skip on the same timer", () => {
    expect(
      shouldSkipActiveTimerDescriptionSync({
        sameTimer: true,
        skipDescription: true,
        descriptionDirty: false,
      }),
    ).toBe(true);
  });

  test("does not skip a clean same-timer sync", () => {
    expect(
      shouldSkipActiveTimerDescriptionSync({
        sameTimer: true,
        descriptionDirty: false,
      }),
    ).toBe(false);
  });
});
