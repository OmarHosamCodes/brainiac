import { describe, expect, test, beforeEach } from "bun:test";

import {
  SHELL_LOGO_ANIMATION_MS,
  isShellAnimationReadyAt,
  resetShellBoot,
  startShellBoot,
} from "./shell-boot";

describe("isShellAnimationReadyAt", () => {
  test("returns false before one cycle elapses", () => {
    const startedAt = 1_000;
    expect(isShellAnimationReadyAt(startedAt + SHELL_LOGO_ANIMATION_MS - 1, startedAt)).toBe(false);
  });

  test("returns true after one cycle elapses", () => {
    const startedAt = 1_000;
    expect(isShellAnimationReadyAt(startedAt + SHELL_LOGO_ANIMATION_MS, startedAt)).toBe(true);
  });

  test("returns false when boot never started", () => {
    expect(isShellAnimationReadyAt(Date.now(), null)).toBe(false);
  });
});

describe("shell boot session", () => {
  beforeEach(() => resetShellBoot());

  test("startShellBoot is idempotent", () => {
    startShellBoot();
    startShellBoot();
    resetShellBoot();
    expect(isShellAnimationReadyAt(Date.now(), null)).toBe(false);
  });
});
