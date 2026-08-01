import { describe, expect, test } from "bun:test";

import { resolveMemberProfileHeatLayout } from "./member-profile-heat-layout";

describe("resolveMemberProfileHeatLayout", () => {
  test("uses compact for week and month presets", () => {
    expect(resolveMemberProfileHeatLayout("week", [], "2026-03-01", "2026-03-07")).toBe("compact");
    expect(resolveMemberProfileHeatLayout("month", [], "2026-03-01", "2026-03-31")).toBe("compact");
    expect(resolveMemberProfileHeatLayout("today", [], "2026-03-15", "2026-03-15")).toBe("compact");
  });

  test("uses strip for last30 and all-quarter tenure", () => {
    expect(resolveMemberProfileHeatLayout("last30", [], "2026-02-14", "2026-03-15")).toBe("strip");
    expect(resolveMemberProfileHeatLayout("tenure", [], "2026-01-01", "2026-03-31")).toBe("strip");
  });

  test("uses compact for single tenure month", () => {
    expect(resolveMemberProfileHeatLayout("tenure", [1], "2026-02-01", "2026-02-28")).toBe(
      "compact",
    );
  });

  test("uses strip for multi-month tenure and long custom", () => {
    expect(resolveMemberProfileHeatLayout("tenure", [0, 1], "2026-01-01", "2026-02-28")).toBe(
      "strip",
    );
    expect(resolveMemberProfileHeatLayout("custom", [], "2026-01-01", "2026-04-30")).toBe("strip");
  });

  test("uses compact for short custom ranges", () => {
    expect(resolveMemberProfileHeatLayout("custom", [], "2026-03-01", "2026-03-20")).toBe(
      "compact",
    );
  });
});
