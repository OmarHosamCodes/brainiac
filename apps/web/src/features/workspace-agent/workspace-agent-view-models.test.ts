import { describe, expect, test } from "bun:test";

import {
  formatWorkspaceAgentTracePayload,
  getWorkspaceAgentToolTraceViewModel,
} from "./workspace-agent-view-models";

describe("workspace-agent-view-models", () => {
  test("formats structured tool traces", () => {
    const view = getWorkspaceAgentToolTraceViewModel({
      name: "list_agency_time_entries",
      status: "completed",
      error: null,
      input: { page: 1 },
      output: { entries: [] },
      durationMs: 12,
    });

    expect(view.isStructured).toBe(true);
    expect(view.inputText).toContain('"page"');
    expect(view.durationMs).toBe(12);
  });

  test("handles circular payloads without throwing", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(formatWorkspaceAgentTracePayload(circular)).toBe("[object Object]");
  });
});
