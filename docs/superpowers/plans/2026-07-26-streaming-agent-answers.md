# Streaming Agent Answers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship production token + tool streaming for the workspace agent answer path (oRPC async generator over `/rpc/ws`), with Stop cancel, scroll-follow, and durable partial persistence — composer chrome left alone except send→Stop.

**Architecture:** Keep `agent.chat.turn` as the non-streaming completion path for tests/backcompat. Add `agent.chat.turnStream` as a thin `async function*` router over a service generator that (1) prepares the turn, (2) yields typed events from a new `streamDashboardAgent` helper that surfaces OpenRouter `getTextStream` / tool message streams already used internally, (3) persists user + assistant (including Stop partials) before the terminal event. Client opens a one-shot WebSocket RPC (same pattern as agency live), consumes the iterator in the feature hook, and drives presentational chat-panel props (streaming bubble, tool `in_progress`, Stop, jump-to-latest).

**Tech Stack:** Bun, Hono, oRPC (async generator + Bun WebSocket), `@openrouter/sdk` `callModel` streams, TanStack Query (invalidate after complete), React 19 + motion/react, shadcn `Button`/`Spinner` for Stop, Zod schemas in `@orch/agent/types`.

## Global Constraints

- Golden-file layers: router thin → service `(actorUserId, input)` → hook owns stream → views props-only.
- Browser must import `@orch/agent/types` (and other client-safe exports), never `@orch/agent` barrel.
- Design brief: Restrained product surface; answer experience only (priority B); keep partial on Stop; send morphs to Stop while in flight; reduced-motion: no pulsing caret theater.
- Copy: “Stop”, “Stopped”, “Stopped before a reply.”, “Jump to latest”; plain stream errors; no exclamation marks / “Oops”.
- Commands: Bun only (`bun test`, `bun run check`, `bun run check-types`, `bun run check:conventions`, `bun run check:golden` when adding files).
- Do not invent SSE/Hono stream routes; reuse oRPC `async function*` + `/rpc/ws`.
- Persisted `dashboardConversationMessage.content` stays `.min(1)`; empty Stop uses `"Stopped before a reply."`.
- Client streaming placeholder may have empty `content` via a local `StreamingChatMessage` type, not the persisted Zod schema.

---

## File map

| File                                                                      | Responsibility                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/agent/src/types.ts`                                             | Stream event Zod schemas + types; re-export                              |
| `packages/agent/src/stream-turn.ts`                                       | `streamDashboardAgent` async generator over OpenRouter                   |
| `packages/agent/src/stream-turn.test.ts`                                  | Unit tests for event ordering / cancel / tools                           |
| `packages/agent/src/index.ts`                                             | Export stream helper (server barrel OK)                                  |
| `packages/api/src/routers/agent/schemas.ts`                               | Re-export stream schemas                                                 |
| `packages/api/src/routers/agent/service.ts`                               | `streamDashboardConversationTurn` generator + persistence                |
| `packages/api/src/routers/agent/stream.integration.test.ts`               | Integration: mock agent stream → events + DB rows                        |
| `packages/api/src/routers/agent/router.ts`                                | `chat.turnStream` thin generator                                         |
| `apps/web/src/features/shared/agency-live-rpc.ts`                         | Extract/rename shared `createOrpcWebSocketClient` (keep agency wrappers) |
| `apps/web/src/features/workspace-agent/agent-turn-stream.ts`              | One-shot WS consume helper for `turnStream`                              |
| `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts`      | Stream orchestration, Stop, pending assistant                            |
| `apps/web/src/features/workspace-agent/hooks/use-workspace-agent-data.ts` | Drop `chatTurn` mutation from send path (keep if unused elsewhere)       |
| `apps/web/src/features/workspace-agent/chat-panel-view.tsx`               | Scroll-follow, jump chip, streaming caret, status line                   |
| `apps/web/src/features/workspace-agent/composer-view.tsx`                 | Send ↔ Stop morph (`onStop`)                                             |
| `apps/web/src/features/workspace-agent/workspace-agent-view.tsx`          | Wire Stop + streaming props                                              |
| `apps/web/src/features/workspace-agent/workspace-agent-view-models.ts`    | Optional status label helpers                                            |
| `docs/golden-file-source-inventory.md` (via `check:golden`)               | Register new in-scope files if required                                  |

---

### Task 1: Stream event schemas

**Files:**

- Modify: `packages/agent/src/types.ts`
- Modify: `packages/api/src/routers/agent/schemas.ts` (re-export only if pattern requires)
- Test: `packages/agent/src/stream-events.test.ts`

**Interfaces:**

- Consumes: existing `agentChatTurnInputSchema`, `dashboardConversationMessageSchema`, `agentToolCallSchema`, `agentChatTurnResponseSchema` fields
- Produces: `agentChatTurnStreamEventSchema`, `AgentChatTurnStreamEvent`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent/src/stream-events.test.ts
import { describe, expect, test } from "bun:test";
import { agentChatTurnStreamEventSchema } from "./types";

describe("agentChatTurnStreamEventSchema", () => {
  test("accepts token and completed events", () => {
    expect(
      agentChatTurnStreamEventSchema.parse({
        type: "token",
        delta: "Hello",
      }).type,
    ).toBe("token");

    const completed = agentChatTurnStreamEventSchema.parse({
      type: "completed",
      conversation: {
        id: "c1",
        title: "Hi",
        model: "m",
        toolPreset: "ask",
        usageSummary: {
          latest: null,
          totals: {
            inputTokens: 0,
            cachedTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            totalTokens: 0,
            costUsd: 0,
          },
        },
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
        lastMessageAt: "2026-07-26T00:00:00.000Z",
        lastMessagePreview: "Hi",
      },
      userMessage: {
        id: "u1",
        role: "user",
        content: "Hi",
        contextNodeTitles: [],
        model: "m",
        toolsCalled: [],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
      assistantMessage: {
        id: "a1",
        role: "assistant",
        content: "Hello",
        contextNodeTitles: [],
        model: "m",
        toolsCalled: [],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
      createdConversation: true,
      workspaceSnapshot: null,
      stopped: false,
    });
    expect(completed.type).toBe("completed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/agent/src/stream-events.test.ts`
Expected: FAIL with `agentChatTurnStreamEventSchema` not defined / export missing.

- [ ] **Step 3: Add schemas to types.ts**

Append near `agentChatTurnResponseSchema`:

```typescript
export const agentChatTurnStreamStartedEventSchema = z.object({
  type: z.literal("started"),
  conversationId: z.string().trim().min(1),
  createdConversation: z.boolean(),
  userMessageId: z.string().trim().min(1),
  assistantMessageId: z.string().trim().min(1),
  model: z.string().trim().min(1),
});

export const agentChatTurnStreamTokenEventSchema = z.object({
  type: z.literal("token"),
  delta: z.string().min(1).max(8_000),
});

export const agentChatTurnStreamToolEventSchema = z.object({
  type: z.literal("tool"),
  tool: agentToolCallSchema,
});

export const agentChatTurnStreamErrorEventSchema = z.object({
  type: z.literal("error"),
  message: z.string().trim().min(1).max(2_000),
});

export const agentChatTurnStreamCompletedEventSchema = z.object({
  type: z.literal("completed"),
  conversation: dashboardConversationSummarySchema,
  userMessage: dashboardConversationMessageSchema,
  assistantMessage: dashboardConversationMessageSchema,
  createdConversation: z.boolean(),
  workspaceSnapshot: agentChatResponseSchema.shape.workspaceSnapshot,
  stopped: z.boolean(),
});

export const agentChatTurnStreamEventSchema = z.discriminatedUnion("type", [
  agentChatTurnStreamStartedEventSchema,
  agentChatTurnStreamTokenEventSchema,
  agentChatTurnStreamToolEventSchema,
  agentChatTurnStreamErrorEventSchema,
  agentChatTurnStreamCompletedEventSchema,
]);

export type AgentChatTurnStreamEvent = z.infer<typeof agentChatTurnStreamEventSchema>;
```

Re-export from `packages/api/src/routers/agent/schemas.ts` if other agent schemas are re-exported there.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/agent/src/stream-events.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/types.ts packages/agent/src/stream-events.test.ts packages/api/src/routers/agent/schemas.ts
git commit -m "$(cat <<'EOF'
feat(agent): add chat turn stream event schemas

EOF
)"
```

---

### Task 2: `streamDashboardAgent` OpenRouter generator

**Files:**

- Create: `packages/agent/src/stream-turn.ts`
- Create: `packages/agent/src/stream-turn.test.ts`
- Modify: `packages/agent/src/index.ts` (export)
- Modify: `packages/agent/package.json` only if a new export path is needed (prefer server barrel; client does not import this)

**Interfaces:**

- Consumes: same workspace/config args as `runDashboardAgent` / `runToolEnabledPass`; OpenRouter `callModel` + `getTextStream` + `getNewMessagesStream` + `cancel()`
- Produces:

```typescript
export type DashboardAgentStreamEvent =
  | { type: "token"; delta: string }
  | { type: "tool"; tool: AgentToolCall }
  | {
      type: "done";
      responseText: string;
      toolCalls: AgentToolCall[];
      usage: DashboardConversationUsageLatest | null;
      model: string;
      workspaceSnapshot: AgentChatResponse["workspaceSnapshot"];
    };

export async function* streamDashboardAgent(
  messages: AgentMessage[],
  workspace: /* same as runDashboardAgent */,
  config: DashboardAgentConfig & { signal?: AbortSignal },
): AsyncGenerator<DashboardAgentStreamEvent, void, void>
```

- [ ] **Step 1: Write failing unit test with a fake model result**

```typescript
// packages/agent/src/stream-turn.test.ts
import { describe, expect, mock, test } from "bun:test";

// Test the pure merge helpers first if extracted; otherwise mock createOpenRouterClient.
// Minimal contract: token events concatenate; abort yields done with stopped text so far.

import { mergeToolCallFromStreamMessage } from "./stream-turn";

describe("mergeToolCallFromStreamMessage", () => {
  test("marks function_call as in_progress", () => {
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
    expect(calls.get("c1")?.status).toBe("in_progress");
    expect(order).toEqual(["c1"]);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module/export missing)**

Run: `bun test packages/agent/src/stream-turn.test.ts`

- [ ] **Step 3: Implement `stream-turn.ts`**

Implementation sketch (adapt to existing `runToolEnabledPass` internals — extract shared tool-merge + instructions building rather than copy-paste the whole pass):

```typescript
export function mergeToolCallFromStreamMessage(
  message: {
    type: string;
    callId?: string;
    id?: string;
    name?: string;
    arguments?: string;
    output?: unknown;
  },
  calls: Map<string, AgentToolCall>,
  callOrder: string[],
): AgentToolCall | null {
  // Move the function_call / function_call_output logic from runToolEnabledPass here.
  // Return the updated tool record so the generator can yield { type: "tool", tool }.
}

export async function* streamDashboardAgent(/* args */): AsyncGenerator<DashboardAgentStreamEvent> {
  // 1. Resolve model / instructions / tools exactly like runDashboardAgent ask|agent paths.
  // 2. const result = createOpenRouterClient().callModel({...})
  // 3. Race text stream + tool stream:
  //    - for await (const delta of result.getTextStream()) { if (signal.aborted) break; yield { type:"token", delta } }
  //    - parallel: for await (const msg of result.getNewMessagesStream()) { merge; yield tool }
  // 4. On abort: result.cancel?.(); yield done with accumulated text (trim); do not throw if cancelled cleanly.
  // 5. On success: await getResponse for usage; yield done with full text + tools + workspaceSnapshot from tool side-effects (same as runDashboardAgent).
}
```

Refactor `runToolEnabledPass` to call the shared merge helper so behavior stays one source of truth. Keep `runDashboardAgent` working for `chat.turn`.

- [ ] **Step 4: Run tests**

Run: `bun test packages/agent/src/stream-turn.test.ts packages/agent/src/tools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/stream-turn.ts packages/agent/src/stream-turn.test.ts packages/agent/src/index.ts
git commit -m "$(cat <<'EOF'
feat(agent): stream dashboard agent tokens and tools

EOF
)"
```

---

### Task 3: Service generator + durable writes

**Files:**

- Modify: `packages/api/src/routers/agent/service.ts`
- Create: `packages/api/src/routers/agent/stream.integration.test.ts`

**Interfaces:**

- Consumes: `streamDashboardAgent`, existing conversation helpers, `agentChatTurnStreamEventSchema`
- Produces:

```typescript
export async function* streamDashboardConversationTurn(
  actorUserId: string,
  input: { actorUserName: string; turn: AgentChatTurnInput; signal?: AbortSignal },
): AsyncGenerator<AgentChatTurnStreamEvent, void, void>
```

**Persistence rules:**

1. After auth/guards/model resolve/create conversation: insert **user** row immediately (or in same transaction as placeholder assistant — prefer user-only first).
2. Yield `started` with ids + model.
3. Yield `token` / `tool` as agent streams.
4. On natural end or abort: insert **assistant** with accumulated content (or `"Stopped before a reply."` if empty), update conversation usage/model/timestamps, save workspace snapshot if mutated, then yield `completed` with `stopped: boolean`.
5. On hard failure before any durable assistant write: yield `error` (and still persist assistant error stub only if user row already exists — prefer yield error + do not leave orphan incomplete assistant).

- [ ] **Step 1: Write integration test (mock streamDashboardAgent)**

```typescript
// packages/api/src/routers/agent/stream.integration.test.ts
import { describe, expect, mock, test } from "bun:test";

// Mirror append.integration.test.ts DB setup.
// mock.module("@orch/agent", () => ({ ...real, streamDashboardAgent: async function* () {
//   yield { type: "token", delta: "Hi" };
//   yield { type: "done", responseText: "Hi", toolCalls: [], usage: null, model: "m", workspaceSnapshot: null };
// }}));

test("streamDashboardConversationTurn persists messages and yields completed", async () => {
  const events = [];
  for await (const event of streamDashboardConversationTurn(userId, {
    actorUserName: "Omar",
    turn: { content: "Hello", toolPreset: "ask", surface: "canvas" },
  })) {
    events.push(event);
  }
  expect(events.some((e) => e.type === "started")).toBe(true);
  expect(events.some((e) => e.type === "token")).toBe(true);
  const completed = events.find((e) => e.type === "completed");
  expect(completed?.assistantMessage.content).toBe("Hi");
  expect(completed?.stopped).toBe(false);
});
```

- [ ] **Step 2: Run test — FAIL (function missing)**

Run: `bun test packages/api/src/routers/agent/stream.integration.test.ts`

- [ ] **Step 3: Implement service generator**

Reuse guards from `appendDashboardConversationTurn` (agency teamId, ask-only, model resolve). Prefer extracting a private `prepareDashboardConversationTurnContext(actorUserId, input)` used by both append and stream to avoid drift — only if the shared block is clearly duplicated; otherwise copy once and leave a `// ponytail:` note.

Abort handling:

```typescript
const stopped = Boolean(input.signal?.aborted);
// after loop / on abort listener that breaks the for-await
const content =
  accumulated.trim().length > 0
    ? accumulated.trim().slice(0, 20_000)
    : stopped
      ? "Stopped before a reply."
      : "No response.";
```

- [ ] **Step 4: Run integration tests**

Run: `bun test packages/api/src/routers/agent/stream.integration.test.ts packages/api/src/routers/agent/append.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routers/agent/service.ts packages/api/src/routers/agent/stream.integration.test.ts
git commit -m "$(cat <<'EOF'
feat(api): stream agent turns with durable partial saves

EOF
)"
```

---

### Task 4: Thin `chat.turnStream` router

**Files:**

- Modify: `packages/api/src/routers/agent/router.ts`

**Interfaces:**

- Consumes: `streamDashboardConversationTurn`, `agentChatTurnInputSchema`, `agentChatTurnStreamEventSchema`
- Produces: oRPC procedure `agent.chat.turnStream`

- [ ] **Step 1: Add procedure**

```typescript
turnStream: protectedProcedure
  .input(agentChatTurnInputSchema)
  .handler(async function* ({ input, context, signal }) {
    if (!input.conversationId) {
      await assertCanCreateDashboardConversation(context.session.user.id, {});
    }
    for await (const event of streamDashboardConversationTurn(context.session.user.id, {
      actorUserName: context.session.user.name,
      turn: input,
      signal,
    })) {
      yield agentChatTurnStreamEventSchema.parse(event);
    }
  }),
```

Keep existing `turn` handler unchanged.

- [ ] **Step 2: Typecheck API package**

Run: `bun run check-types --filter=@orch/api` (or repo `bun run check-types`)
Expected: PASS for agent router types.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routers/agent/router.ts
git commit -m "$(cat <<'EOF'
feat(api): expose agent.chat.turnStream procedure

EOF
)"
```

---

### Task 5: Client one-shot WebSocket stream helper

**Files:**

- Modify: `apps/web/src/features/shared/agency-live-rpc.ts` (extract shared client factory name if clean)
- Create: `apps/web/src/features/workspace-agent/agent-turn-stream.ts`
- Create: `apps/web/src/features/workspace-agent/agent-turn-stream.test.ts`

**Interfaces:**

- Consumes: `createAgencyLiveRpcClient` / shared WS factory, `waitForWebSocketOpen`, `AgentChatTurnInput`, `AgentChatTurnStreamEvent`
- Produces:

```typescript
export type StreamAgentTurnHandlers = {
  onEvent: (event: AgentChatTurnStreamEvent) => void;
};

export async function streamAgentChatTurn(
  input: AgentChatTurnInput,
  options: { signal: AbortSignal; onEvent: (event: AgentChatTurnStreamEvent) => void },
): Promise<void>;
```

- [ ] **Step 1: Write unit test with mocked WS client**

```typescript
import { describe, expect, mock, test } from "bun:test";
import { streamAgentChatTurn } from "./agent-turn-stream";

test("forwards events until completed", async () => {
  // mock createAgencyLiveRpcClient to return async iterator yielding started → token → completed
  const events: string[] = [];
  await streamAgentChatTurn(
    { content: "Hi", toolPreset: "ask" },
    {
      signal: new AbortController().signal,
      onEvent: (e) => events.push(e.type),
    },
  );
  expect(events).toEqual(["started", "token", "completed"]);
});
```

- [ ] **Step 2: Run — FAIL missing module**

- [ ] **Step 3: Implement helper**

```typescript
import type { AgentChatTurnInput, AgentChatTurnStreamEvent } from "@orch/agent/types";
import { getServerUrl } from "@/lib/env";
import {
  closeAgencyLiveWebSocket,
  createAgencyLiveRpcClient,
  waitForWebSocketOpen,
} from "@/features/shared/agency-live-rpc";

export async function streamAgentChatTurn(
  input: AgentChatTurnInput,
  options: { signal: AbortSignal; onEvent: (event: AgentChatTurnStreamEvent) => void },
): Promise<void> {
  const { client, websocket } = createAgencyLiveRpcClient(getServerUrl());
  try {
    await waitForWebSocketOpen(websocket);
    const iterator = await client.agent.chat.turnStream(input, { signal: options.signal });
    for await (const event of iterator) {
      options.onEvent(event);
      if (event.type === "completed" || event.type === "error") break;
    }
  } finally {
    closeAgencyLiveWebSocket(websocket, "agent turn stream ended");
  }
}
```

Treat abort like agency live benign errors (do not throw “operation was aborted” to the UI as a hard failure if `completed` with `stopped` already arrived).

- [ ] **Step 4: Run test — PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/shared/agency-live-rpc.ts apps/web/src/features/workspace-agent/agent-turn-stream.ts apps/web/src/features/workspace-agent/agent-turn-stream.test.ts
git commit -m "$(cat <<'EOF'
feat(web): add one-shot websocket consumer for agent turn stream

EOF
)"
```

---

### Task 6: Hook orchestration (pending assistant + Stop)

**Files:**

- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts`
- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent-data.ts` (remove unused turn mutation if unused)

**Interfaces:**

- Consumes: `streamAgentChatTurn`
- Produces view-model fields:

```typescript
isStreaming: boolean
streamingStatus: "idle" | "streaming" | "stopped" | "error"
followOutput: boolean
setFollowOutput: (v: boolean) => void
stopGeneration: () => void
// messages already includes pending user + streaming assistant
```

- [ ] **Step 1: Replace `sendMessage` mutation path with stream consumer**

Behavior:

1. Guard same as today.
2. Clear draft; set `pendingMessages` to **user + assistant** placeholders (`assistant.content = ""`, `toolsCalled = []`).
3. `abortRef = new AbortController()`; `isStreaming = true`.
4. `await streamAgentChatTurn(input, { signal, onEvent })`:
   - `started`: set conversation id; rewrite pending ids to server ids when provided.
   - `token`: append delta to pending assistant content.
   - `tool`: upsert into pending assistant `toolsCalled` by `tool.id`.
   - `completed`: clear pending; set active conversation; `rememberResolvedModel`; apply workspace snapshot; invalidate list/get; if `stopped`, leave no error.
   - `error`: clear pending assistant/user appropriately; restore draft only if no `started` persisted user yet — if user was persisted, keep user visible via invalidate and show error string.
5. `stopGeneration`: `abortRef.current?.abort()` (server yields completed stopped).

`canSend` while streaming = false; expose `isStreaming` for Stop button enablement.

- [ ] **Step 2: Manual smoke via types**

Run: `bun run check-types` (web filter if available)
Expected: hook types OK.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts apps/web/src/features/workspace-agent/hooks/use-workspace-agent-data.ts
git commit -m "$(cat <<'EOF'
feat(web): drive agent composer sends through turn stream

EOF
)"
```

---

### Task 7: Chat panel — scroll-follow, caret, jump, status

**Files:**

- Modify: `apps/web/src/features/workspace-agent/chat-panel-view.tsx`
- Modify: `apps/web/src/features/workspace-agent/workspace-agent-view.tsx`
- Modify: `apps/web/src/features/workspace-agent/workspace-agent-view-models.ts` (+ test if helpers added)

**Interfaces:**

- Consumes: streaming flags from hook via container→view props only
- Produces: presentational props

```typescript
type WorkspaceAgentChatPanelViewProps = {
  // existing...
  isStreaming: boolean;
  streamingMessageId: string | null;
  streamStopped: boolean;
  followOutput: boolean;
  onFollowOutputChange: (follow: boolean) => void;
};
```

- [ ] **Step 1: Implement scroll-follow**

- Ref on scroll container + end sentinel.
- While `followOutput && isStreaming`, `scrollTop = scrollHeight` on content growth (rAF coalesce).
- On user scroll up (`scrollHeight - scrollTop - clientHeight > 64`), set `followOutput` false via callback.
- When not following and streaming: show shadcn `Button` size sm ghost “Jump to latest” that sets follow true and scrolls.

- [ ] **Step 2: Streaming bubble affordances**

- Assistant bubble with empty content while streaming: show nothing or a single muted end caret (`▍` / `▍` with `motion-safe:animate-pulse` only when **not** `prefers-reduced-motion`; under reduce, static `·`).
- After tools: existing `WorkspaceAgentToolTraceListView` (already supports `in_progress`).
- If `streamStopped`: optional one-line muted “Stopped” under that bubble (not a card).

Fix imports: `DashboardConversationMessage` from `@orch/agent/types` if still barrel-imported.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/workspace-agent/chat-panel-view.tsx apps/web/src/features/workspace-agent/workspace-agent-view.tsx apps/web/src/features/workspace-agent/workspace-agent-view-models.ts apps/web/src/features/workspace-agent/workspace-agent-view-models.test.ts
git commit -m "$(cat <<'EOF'
feat(web): scroll-follow and streaming affordances in agent chat

EOF
)"
```

---

### Task 8: Composer send → Stop (shadcn Button)

**Files:**

- Modify: `apps/web/src/features/workspace-agent/composer-view.tsx`
- Modify: `apps/web/src/features/workspace-agent/workspace-agent-view.tsx`

**Interfaces:**

- Add props: `onStop: () => void` (in addition to `onSend`, `isPending`/`isStreaming`)

- [ ] **Step 1: Morph primary control**

When `isPending` (streaming):

```tsx
<Button type="button" size="icon" variant="secondary" aria-label="Stop" onClick={onStop}>
  <Square /* or lucide Square */ className="fill-current" />
</Button>
```

When idle: existing Send (enabled by `canSend`).

Use `AnimatePresence` key swap already present; prefer filled square over spinner for Stop (Cursor-like). Do **not** call `onSend` while streaming.

Check Spinner: only use if first-token wait needs it elsewhere — Stop itself is a square button per brief.

- [ ] **Step 2: Wire `view.stopGeneration` from workspace-agent-view**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/workspace-agent/composer-view.tsx apps/web/src/features/workspace-agent/workspace-agent-view.tsx
git commit -m "$(cat <<'EOF'
feat(web): morph composer send control into Stop while streaming

EOF
)"
```

---

### Task 9: Convention / inventory / full verification

**Files:**

- Possibly: golden inventory entries for new web/api/agent files

- [ ] **Step 1: Run checks**

```bash
bun test packages/agent/src/stream-events.test.ts packages/agent/src/stream-turn.test.ts packages/api/src/routers/agent/stream.integration.test.ts apps/web/src/features/workspace-agent/agent-turn-stream.test.ts
bun run check
bun run check-types
bun run check:conventions
bun run check:golden
```

Expected: all PASS. Fix any golden-view/container/router/service violations (views must not import orpc; router must not import drizzle).

- [ ] **Step 2: Browser smoke (required by brief)**

1. Open canvas with agent rail expanded.
2. Send a short Ask message → tokens appear live; scroll stays pinned.
3. Scroll up mid-stream → Jump to latest appears; click restores follow.
4. Send a longer Agent/tool prompt → tool lines show `in_progress` then complete.
5. Hit Stop mid-stream → partial kept; label Stopped; composer re-enabled.
6. Refresh → completed/stopped messages persisted.
7. Toggle light/dark → contrast OK on bubbles/caret/jump chip.

- [ ] **Step 3: Final commit if inventory/fixes needed**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: verify streaming agent answers conventions

EOF
)"
```

---

## Self-review

**1. Spec coverage**

- Token stream → Tasks 2–7
- Live tool traces → Tasks 2, 3, 6, 7
- Stop cancel → Tasks 2, 3, 6, 8
- Scroll-follow + jump → Task 7
- Production E2E (API + UI) → Tasks 3–9
- Composer chrome left alone except Stop → Task 8
- Golden layers / client-safe imports → Global + Tasks 5–7, 9
- shadcn Button for Stop/Jump → Tasks 7–8

**2. Placeholder scan:** No TBD/TODO steps; concrete schemas, signatures, commands.

**3. Type consistency:** `AgentChatTurnStreamEvent` discriminated on `type`; service yields same shape router parses; client handler switches on `started|token|tool|error|completed`; `stopped` only on `completed`.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-26-streaming-agent-answers.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
