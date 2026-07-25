import { describe, expect, test } from "bun:test";

import { getDicebearGlyphAvatarUrl } from "./dicebear-avatar-url";

describe("getDicebearGlyphAvatarUrl", () => {
  test("seeds glyphs URL and encodes the seed", () => {
    expect(getDicebearGlyphAvatarUrl("Ada Lovelace")).toBe(
      "https://api.dicebear.com/10.x/glyphs/svg?seed=Ada%20Lovelace",
    );
  });

  test("falls back to orch when seed is blank", () => {
    expect(getDicebearGlyphAvatarUrl("   ")).toBe(
      "https://api.dicebear.com/10.x/glyphs/svg?seed=orch",
    );
  });
});
