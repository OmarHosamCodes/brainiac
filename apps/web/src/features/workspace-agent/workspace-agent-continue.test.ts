import { describe, expect, test } from "bun:test";

import { CONTINUE_TURN_TEXT, shouldShowStoppedRun } from "./workspace-agent-continue";

describe("shouldShowStoppedRun", () => {
  test("shows only when stopped and not streaming", () => {
    expect(shouldShowStoppedRun({ streamStopped: true, isStreaming: false })).toBe(true);
    expect(shouldShowStoppedRun({ streamStopped: true, isStreaming: true })).toBe(false);
    expect(shouldShowStoppedRun({ streamStopped: false, isStreaming: false })).toBe(false);
  });
});

describe("CONTINUE_TURN_TEXT", () => {
  test("is a single continue token", () => {
    expect(CONTINUE_TURN_TEXT).toBe("Continue.");
  });
});
