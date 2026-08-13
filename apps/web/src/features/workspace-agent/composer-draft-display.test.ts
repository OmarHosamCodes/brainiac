import { describe, expect, test } from "bun:test";

import {
  formatComposerDraftSavedAt,
  shouldOfferComposerDraftRestore,
} from "./composer-draft-display";

describe("shouldOfferComposerDraftRestore", () => {
  test("offers restore only when the live composer is empty and the server draft is not", () => {
    expect(shouldOfferComposerDraftRestore({ liveDraft: "", serverText: "hello" })).toBe(true);
    expect(shouldOfferComposerDraftRestore({ liveDraft: "x", serverText: "hello" })).toBe(false);
    expect(shouldOfferComposerDraftRestore({ liveDraft: "", serverText: "" })).toBe(false);
  });
});

describe("formatComposerDraftSavedAt", () => {
  test("returns a short local stamp", () => {
    const stamp = formatComposerDraftSavedAt("2026-08-14T09:00:00.000Z");
    expect(stamp.length).toBeGreaterThan(0);
  });
});
