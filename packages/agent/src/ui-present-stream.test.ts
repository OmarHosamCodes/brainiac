import { describe, expect, test } from "bun:test";

import { mergeToolCallFromStreamMessage, orderedToolCalls } from "./stream-turn";
import { artifactFromToolCall, cappedArtifacts, UI_PRESENT_TOOL_NAME } from "./ui-artifact";

const schemaArtifact = {
  id: "hours-by-project",
  kind: "schema" as const,
  title: "Hours by project",
  schema: {
    version: 1 as const,
    root: {
      type: "table" as const,
      columns: ["Project", "Hours"],
      rows: [["Alpha", 12]],
    },
  },
};

/**
 * Mirrors streamToolEnabledPass: when a ui_present tool completes, emit an artifact event.
 * Keeps the stream/persist contract covered without calling OpenRouter.
 */
function collectLiveEventsFromToolMessages(
  messages: Array<
    | {
        type: "function_call";
        callId: string;
        name: string;
        arguments: string;
      }
    | {
        type: "function_call_output";
        callId: string;
        output: unknown;
      }
  >,
) {
  const calls = new Map();
  const callOrder: string[] = [];
  const events: Array<
    | { type: "tool"; tool: ReturnType<typeof mergeToolCallFromStreamMessage> }
    | { type: "artifact"; artifact: NonNullable<ReturnType<typeof artifactFromToolCall>> }
  > = [];

  for (const message of messages) {
    const tool = mergeToolCallFromStreamMessage(message, calls, callOrder);
    if (!tool) continue;
    events.push({ type: "tool", tool });
    if (tool.status === "completed") {
      const artifact = artifactFromToolCall(tool);
      if (artifact) events.push({ type: "artifact", artifact });
    }
  }

  return {
    events,
    toolCalls: orderedToolCalls(callOrder, calls),
    artifacts: cappedArtifacts(
      events.flatMap((event) => (event.type === "artifact" ? [event.artifact] : [])),
    ),
  };
}

describe("ui_present stream emission", () => {
  test("yields an artifact event when ui_present completes", () => {
    const { events, artifacts } = collectLiveEventsFromToolMessages([
      {
        type: "function_call",
        callId: "c1",
        name: UI_PRESENT_TOOL_NAME,
        arguments: JSON.stringify({ artifact: schemaArtifact }),
      },
      {
        type: "function_call_output",
        callId: "c1",
        output: { message: 'Rendered "Hours by project" in the canvas (schema).' },
      },
    ]);

    expect(events.map((event) => event.type)).toEqual(["tool", "tool", "artifact"]);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.id).toBe("hours-by-project");
  });

  test("does not emit artifacts for failed or unrelated tools", () => {
    const failed = collectLiveEventsFromToolMessages([
      {
        type: "function_call",
        callId: "c1",
        name: UI_PRESENT_TOOL_NAME,
        arguments: JSON.stringify({ artifact: { kind: "schema" } }),
      },
      {
        type: "function_call_output",
        callId: "c1",
        output: { error: "Invalid artifact" },
      },
    ]);
    expect(failed.events.some((event) => event.type === "artifact")).toBe(false);

    const other = collectLiveEventsFromToolMessages([
      {
        type: "function_call",
        callId: "c2",
        name: "list_dashboard_nodes",
        arguments: "{}",
      },
      {
        type: "function_call_output",
        callId: "c2",
        output: { nodes: [] },
      },
    ]);
    expect(other.events.some((event) => event.type === "artifact")).toBe(false);
  });
});
