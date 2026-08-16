import { describe, expect, test } from "bun:test";

import {
  agencyListSearchMatches,
  splitAgencySearchHighlight,
  tokenizeAgencySearchQuery,
} from "@/features/shared/agency-list-search";

describe("tokenizeAgencySearchQuery", () => {
  test("splits on unicode whitespace and lowercases", () => {
    expect(tokenizeAgencySearchQuery("  Acme   Website ")).toEqual(["acme", "website"]);
    expect(tokenizeAgencySearchQuery("   ")).toEqual([]);
  });
});

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

  test("marks each nested token that appears in the field", () => {
    expect(splitAgencySearchHighlight("Design", "Acme Design")).toEqual([
      { text: "Design", match: true },
    ]);
    expect(splitAgencySearchHighlight("Acme", "Acme Design")).toEqual([
      { text: "Acme", match: true },
    ]);
    expect(splitAgencySearchHighlight("Website", "Acme Design")).toEqual([
      { text: "Website", match: false },
    ]);
  });
});
