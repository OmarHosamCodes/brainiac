import { describe, expect, test, beforeEach } from "bun:test";

import {
  AGENCY_LOGO_ANIMATION_MS,
  isAgencyAnimationReadyAt,
  resetAgencyBoot,
  startAgencyBoot,
} from "./agency-boot";

describe("isAgencyAnimationReadyAt", () => {
  test("returns false before one cycle elapses", () => {
    const startedAt = 1_000;
    expect(isAgencyAnimationReadyAt(startedAt + AGENCY_LOGO_ANIMATION_MS - 1, startedAt)).toBe(
      false,
    );
  });

  test("returns true after one cycle elapses", () => {
    const startedAt = 1_000;
    expect(isAgencyAnimationReadyAt(startedAt + AGENCY_LOGO_ANIMATION_MS, startedAt)).toBe(true);
  });

  test("returns false when boot never started", () => {
    expect(isAgencyAnimationReadyAt(Date.now(), null)).toBe(false);
  });
});

describe("agency boot session", () => {
  beforeEach(() => resetAgencyBoot());

  test("startAgencyBoot is idempotent", () => {
    startAgencyBoot();
    startAgencyBoot();
    resetAgencyBoot();
    expect(isAgencyAnimationReadyAt(Date.now(), null)).toBe(false);
  });
});
