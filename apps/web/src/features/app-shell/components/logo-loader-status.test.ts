import { describe, expect, test } from "bun:test";

import { LOGO_LOADER_LONG_MS, LOGO_LOADER_STILL_MS, logoLoaderStatus } from "./logo-loader-status";

describe("logoLoaderStatus", () => {
  test("keeps the outcome label at the start", () => {
    expect(logoLoaderStatus("Opening canvas", 0)).toBe("Opening canvas");
    expect(logoLoaderStatus("Opening canvas", LOGO_LOADER_STILL_MS - 1)).toBe("Opening canvas");
  });

  test("acknowledges a felt wait, then a long wait", () => {
    expect(logoLoaderStatus("Opening canvas", LOGO_LOADER_STILL_MS)).toBe("Still working");
    expect(logoLoaderStatus("Opening canvas", LOGO_LOADER_LONG_MS)).toBe(
      "This is taking longer than usual",
    );
  });
});
