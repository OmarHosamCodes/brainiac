import { describe, expect, test } from "bun:test";

import { isOptimisticTaskMessage, resolveMessageAnimationKey } from "./agency-thread-motion";
import { createEmptyListOverlay } from "./agency-optimistic-merge";

describe("resolveMessageAnimationKey", () => {
  test("keeps server id when not reconciled", () => {
    expect(resolveMessageAnimationKey("server-1", {})).toBe("server-1");
  });

  test("uses optimistic id after reconciliation", () => {
    expect(
      resolveMessageAnimationKey("server-1", {
        "optimistic-1": "server-1",
      }),
    ).toBe("optimistic-1");
  });
});

describe("isOptimisticTaskMessage", () => {
  test("detects pending optimistic messages", () => {
    const overlay = createEmptyListOverlay<{ id: string }>();
    overlay.upserts["optimistic-1"] = { id: "optimistic-1" };

    expect(isOptimisticTaskMessage("optimistic-1", overlay)).toBe(true);
  });

  test("treats reconciled messages as confirmed", () => {
    const overlay = createEmptyListOverlay<{ id: string }>();
    overlay.upserts["server-1"] = { id: "server-1" };
    overlay.idMap["optimistic-1"] = "server-1";

    expect(isOptimisticTaskMessage("server-1", overlay)).toBe(false);
    expect(isOptimisticTaskMessage("optimistic-1", overlay)).toBe(false);
  });
});
