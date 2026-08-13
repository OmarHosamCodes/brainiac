import { describe, expect, test } from "bun:test";

import { effortForOutboundPreset } from "./model-preset-effort";

describe("effortForOutboundPreset", () => {
  test("keeps effort only on Pro", () => {
    expect(effortForOutboundPreset("pro", "medium")).toBe("medium");
    expect(effortForOutboundPreset("fast", "medium")).toBeUndefined();
  });
});
