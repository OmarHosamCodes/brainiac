import { describe, expect, test } from "bun:test";

import {
  formatDashboardAgentTracePayload,
  getDashboardAgentToolTraceViewModel,
} from "./dashboard-agent-view-models";

describe("dashboard agent tool trace view models", () => {
  test("maps legacy tool names to completed traces", () => {
    expect(getDashboardAgentToolTraceViewModel("search_dashboard")).toEqual({
      name: "search_dashboard",
      inputText: "",
      outputText: "",
      status: "completed",
      error: null,
      isStructured: false,
    });
  });

  test("preserves structured running and error metadata", () => {
    expect(
      getDashboardAgentToolTraceViewModel({
        id: "tool-1",
        name: "patch_block",
        input: { blockId: "block-1" },
        output: { updated: true },
        status: "in_progress",
        error: null,
        durationMs: 42,
      }),
    ).toMatchObject({
      name: "patch_block",
      inputText: '{\n  "blockId": "block-1"\n}',
      outputText: '{\n  "updated": true\n}',
      status: "in_progress",
      durationMs: 42,
      isStructured: true,
    });
  });

  test("formats primitive, empty, and circular payloads safely", () => {
    expect(formatDashboardAgentTracePayload("done")).toBe("done");
    expect(formatDashboardAgentTracePayload(null)).toBe("");
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(formatDashboardAgentTracePayload(circular)).toBe("[object Object]");
  });
});
