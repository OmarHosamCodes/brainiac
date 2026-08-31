import { describe, expect, it } from "bun:test";

import { normalizeTimeEntryLinkUrls } from "./normalize-time-entry-links";

describe("normalizeTimeEntryLinkUrls (api)", () => {
  it("normalizes and dedupes urls", () => {
    expect(
      normalizeTimeEntryLinkUrls([
        "example.com/a",
        "https://example.com/a",
        "https://other.example/b",
      ]),
    ).toEqual(["https://example.com/a", "https://other.example/b"]);
  });

  it("returns empty for undefined", () => {
    expect(normalizeTimeEntryLinkUrls(undefined)).toEqual([]);
  });
});
