import { describe, expect, test } from "bun:test";

import {
  shouldPersistActiveTimerDescription,
  shouldSkipActiveTimerDescriptionSync,
} from "./tracker-description-sync";

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

describe("shouldPersistActiveTimerDescription", () => {
  test("persists when draft differs from cache", () => {
    expect(
      shouldPersistActiveTimerDescription({
        draftDescription: "new",
        activeTimerDescription: "old",
        descriptionDirty: false,
      }),
    ).toBe(true);
  });

  test("persists when dirty even if optimistic cache already matches draft", () => {
    expect(
      shouldPersistActiveTimerDescription({
        draftDescription: "picked suggestion",
        activeTimerDescription: "picked suggestion",
        descriptionDirty: true,
      }),
    ).toBe(true);
  });

  test("skips when clean draft already matches cache", () => {
    expect(
      shouldPersistActiveTimerDescription({
        draftDescription: "synced",
        activeTimerDescription: "synced",
        descriptionDirty: false,
      }),
    ).toBe(false);
  });
});
