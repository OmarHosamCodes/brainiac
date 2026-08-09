import { describe, expect, test } from "bun:test";

import { landingIndexIdFromHash } from "./landing-index";

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
