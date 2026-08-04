import { describe, expect, test } from "bun:test";

import { buildWorkspaceAgentQuickStarts } from "@/features/workspace-agent/workspace-agent-quick-starts";

describe("buildWorkspaceAgentQuickStarts", () => {
  test("agency idle member gets log-time plus hours, waste, and presence", () => {
    const starts = buildWorkspaceAgentQuickStarts({ surface: "agency", hasActiveTimer: false });

    expect(starts.map((start) => start.id)).toEqual(["log-time", "hours", "waste", "team"]);
    expect(starts[0]?.toolPreset).toBe("agent");
    expect(starts.every((start) => start.prompt.trim().length > 0)).toBe(true);
  });

  test("agency member with active timer leads with timer status", () => {
    const starts = buildWorkspaceAgentQuickStarts({ surface: "agency", hasActiveTimer: true });

    expect(starts.map((start) => start.id)).toEqual(["timer", "hours", "waste", "team"]);
    expect(starts[0]?.toolPreset).toBeUndefined();
  });

  test("canvas starters stay board-scoped", () => {
    const starts = buildWorkspaceAgentQuickStarts({ surface: "canvas" });
    expect(starts.map((start) => start.id)).toEqual(["explain", "find", "layout"]);
    expect(starts.find((start) => start.id === "layout")?.toolPreset).toBe("agent");
  });
});
