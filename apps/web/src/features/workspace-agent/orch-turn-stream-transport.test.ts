import { describe, expect, test } from "bun:test";

import { OrchTurnStreamTransport } from "./orch-turn-stream-transport";

describe("OrchTurnStreamTransport", () => {
  test("rejects empty submit before the network", async () => {
    const transport = new OrchTurnStreamTransport();
    await expect(
      transport.sendMessages({
        messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "   " }] }],
        abortSignal: new AbortController().signal,
        body: { content: "   ", attachments: [], toolPreset: "ask", surface: "canvas" },
      } as never),
    ).rejects.toThrow("Message is empty.");
  });

  test("does not reconnect to a dropped stream", async () => {
    const transport = new OrchTurnStreamTransport();
    expect(await transport.reconnectToStream()).toBeNull();
  });

  test("fills Orch extras from getContext when Thread send omits body", async () => {
    const transport = new OrchTurnStreamTransport(() => ({
      surface: "canvas",
      toolPreset: "agent",
    }));
    await expect(
      transport.sendMessages({
        messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "   " }] }],
        abortSignal: new AbortController().signal,
      } as never),
    ).rejects.toThrow("Message is empty.");
  });

  test("rejects Agency turns without a team", async () => {
    const transport = new OrchTurnStreamTransport(() => ({
      surface: "agency",
      toolPreset: "ask",
    }));
    await expect(
      transport.sendMessages({
        messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "hours" }] }],
        abortSignal: new AbortController().signal,
      } as never),
    ).rejects.toThrow("Select an Agency team before asking about time.");
  });
});
