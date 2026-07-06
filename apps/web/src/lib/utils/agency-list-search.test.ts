import { describe, expect, test } from "bun:test";

import {
  agencyListSearchMatches,
  splitAgencySearchHighlight,
} from "@/lib/utils/agency-list-search";

describe("agencyListSearchMatches", () => {
  test("empty term matches all", () => {
    expect(agencyListSearchMatches("", "Acme")).toBe(true);
    expect(agencyListSearchMatches("  ", "Acme")).toBe(true);
  });

  test("matches any field case-insensitively", () => {
    expect(agencyListSearchMatches("acme", "Acme Corp")).toBe(true);
    expect(agencyListSearchMatches("portal", "Acme Corp", "Client Portal")).toBe(true);
    expect(agencyListSearchMatches("missing", "Acme Corp", "Client Portal")).toBe(false);
  });
});

describe("splitAgencySearchHighlight", () => {
  test("splits matching substrings", () => {
    expect(splitAgencySearchHighlight("Acme Portal", "port")).toEqual([
      { text: "Acme ", match: false },
      { text: "Port", match: true },
      { text: "al", match: false },
    ]);
  });

  test("returns whole string when query is empty", () => {
    expect(splitAgencySearchHighlight("Acme", "")).toEqual([{ text: "Acme", match: false }]);
  });
});
