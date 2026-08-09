import { describe, expect, test } from "bun:test";

import { landingIndexIdFromHash, landingInPageHash, landingScrollTargetId } from "./landing-index";

describe("landingIndexIdFromHash", () => {
  test("reads a valid index hash", () => {
    expect(landingIndexIdFromHash("#index-canvas")).toBe("canvas");
    expect(landingIndexIdFromHash("index-agent")).toBe("agent");
  });

  test("ignores anything else", () => {
    expect(landingIndexIdFromHash("")).toBeNull();
    expect(landingIndexIdFromHash("#pricing")).toBeNull();
    expect(landingIndexIdFromHash("#index-unknown")).toBeNull();
  });
});

describe("landingScrollTargetId", () => {
  test("maps known landing hashes", () => {
    expect(landingScrollTargetId("#pricing")).toBe("pricing");
    expect(landingScrollTargetId("instrument-index")).toBe("instrument-index");
    expect(landingScrollTargetId("#index-agency")).toBe("index-agency");
  });

  test("ignores unknown hashes", () => {
    expect(landingScrollTargetId("#nope")).toBeNull();
    expect(landingScrollTargetId("")).toBeNull();
  });
});

describe("landingInPageHash", () => {
  test("reads in-page hashes on the landing path", () => {
    expect(landingInPageHash("#pricing", "/")).toBe("#pricing");
    expect(landingInPageHash("/#index-canvas", "/")).toBe("#index-canvas");
  });

  test("leaves other routes to navigate", () => {
    expect(landingInPageHash("/#pricing", "/terms")).toBeNull();
    expect(landingInPageHash("/login", "/")).toBeNull();
  });
});
