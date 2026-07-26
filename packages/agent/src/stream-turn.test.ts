import { describe, expect, test } from "bun:test";

import { mergeToolCallFromStreamMessage } from "./stream-turn";

describe("mergeToolCallFromStreamMessage", () => {
  test("marks function_call as in_progress", () => {
    const calls = new Map();
    const order: string[] = [];
    const tool = mergeToolCallFromStreamMessage(
      {
        type: "function_call",
        callId: "c1",
        name: "list_nodes",
        arguments: "{}",
      },
      calls,
      order,
    );
    expect(tool?.status).toBe("in_progress");
    expect(order).toEqual(["c1"]);
  });

  test("completes function_call_output", () => {
    const calls = new Map();
    const order: string[] = [];
    mergeToolCallFromStreamMessage(
      {
        type: "function_call",
        callId: "c1",
        name: "list_nodes",
        arguments: "{}",
      },
      calls,
      order,
    );
    const tool = mergeToolCallFromStreamMessage(
      {
        type: "function_call_output",
        callId: "c1",
        output: { nodes: [] },
      },
      calls,
      order,
    );
    expect(tool?.status).toBe("completed");
    expect(tool?.output).toEqual({ nodes: [] });
  });
});
