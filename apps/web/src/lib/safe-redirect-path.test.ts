import { describe, expect, test } from "bun:test";

import { optionalSafeRedirectPath, safeRedirectPath } from "./safe-redirect-path";

describe("safeRedirectPath", () => {
  test("keeps same-origin relative paths", () => {
    expect(safeRedirectPath("/agency")).toBe("/agency");
    expect(safeRedirectPath("/agency/reports?from=2026-08-01")).toBe(
      "/agency/reports?from=2026-08-01",
    );
    expect(safeRedirectPath("/canvas")).toBe("/canvas");
  });

  test("rejects open redirects", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/canvas");
    expect(safeRedirectPath("/\\evil.com")).toBe("/canvas");
    expect(safeRedirectPath("/%5C%5Cevil.com")).toBe("/canvas");
    expect(safeRedirectPath("/%2f%2fevil.com")).toBe("/canvas");
    expect(safeRedirectPath("https://evil.com")).toBe("/canvas");
    expect(safeRedirectPath(" /agency")).toBe("/agency");
  });

  test("optionalSafeRedirectPath drops invalid values", () => {
    expect(optionalSafeRedirectPath("/%5C%5Cevil.com")).toBeUndefined();
    expect(optionalSafeRedirectPath("/agency/dashboard")).toBe("/agency/dashboard");
    expect(optionalSafeRedirectPath(null)).toBeUndefined();
  });
});
