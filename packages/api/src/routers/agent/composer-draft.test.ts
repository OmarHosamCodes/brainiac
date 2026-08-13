import { describe, expect, test } from "bun:test";

import { composerDraftKey, normalizeComposerDraftText } from "./composer-draft";

describe("normalizeComposerDraftText", () => {
  test("trims and caps at 20000 characters", () => {
    expect(normalizeComposerDraftText("  hi  ")).toBe("hi");
    expect(normalizeComposerDraftText("x".repeat(20_001)).length).toBe(20_000);
  });
});

describe("composerDraftKey", () => {
  test("uses empty string for the new-chat draft", () => {
    expect(composerDraftKey(null)).toBe("");
    expect(composerDraftKey("conv-1")).toBe("conv-1");
  });
});
