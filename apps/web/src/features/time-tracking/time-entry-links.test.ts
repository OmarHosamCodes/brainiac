import { describe, expect, it } from "bun:test";

import {
  formatTimeEntryLinkLabel,
  joinedTimeEntryLinkUrls,
  normalizeTimeEntryLinkUrl,
  normalizeTimeEntryLinkUrls,
} from "@/features/time-tracking/time-entry-links";

describe("normalizeTimeEntryLinkUrl", () => {
  it("prepends https when scheme is missing", () => {
    expect(normalizeTimeEntryLinkUrl("example.com/path")).toBe("https://example.com/path");
  });

  it("rejects empty and invalid urls", () => {
    expect(normalizeTimeEntryLinkUrl("")).toBeNull();
    expect(normalizeTimeEntryLinkUrl("   ")).toBeNull();
    expect(normalizeTimeEntryLinkUrl("http://")).toBeNull();
  });
});

describe("normalizeTimeEntryLinkUrls", () => {
  it("dedupes and preserves order", () => {
    expect(
      normalizeTimeEntryLinkUrls([
        "https://a.example/1",
        "https://b.example/2",
        "https://a.example/1",
        "",
      ]),
    ).toEqual({
      urls: ["https://a.example/1", "https://b.example/2"],
      error: null,
    });
  });

  it("returns an error for invalid urls", () => {
    expect(normalizeTimeEntryLinkUrls(["http://"])).toEqual({
      urls: [],
      error: "Enter a valid http(s) URL.",
    });
  });
});

describe("joinedTimeEntryLinkUrls", () => {
  it("joins unique urls with a middle-dot separator", () => {
    expect(
      joinedTimeEntryLinkUrls([
        {
          links: [
            { id: "1", url: "https://a.example" },
            { id: "2", url: "https://b.example" },
          ],
        },
        { links: [{ id: "3", url: "https://a.example" }] },
      ]),
    ).toBe("https://a.example · https://b.example");
  });
});

describe("formatTimeEntryLinkLabel", () => {
  it("shows hostname and path", () => {
    expect(formatTimeEntryLinkLabel("https://github.com/org/repo/pull/1")).toBe(
      "github.com/org/repo/pull/1",
    );
  });
});
