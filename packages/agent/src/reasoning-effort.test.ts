import { describe, expect, test } from "bun:test";

import { resolveOpenRouterReasoning } from "./reasoning-effort";

describe("resolveOpenRouterReasoning", () => {
  test("sends effort only for Pro", () => {
    expect(
      resolveOpenRouterReasoning({ tier: "pro", auto: true, free: false, effort: "high" }),
    ).toEqual({ effort: "high" });
    expect(
      resolveOpenRouterReasoning({ tier: "balanced", auto: true, free: false, effort: "high" }),
    ).toBeUndefined();
    expect(
      resolveOpenRouterReasoning({ tier: "pro", auto: true, free: false }),
    ).toBeUndefined();
  });
});
