# Orch Composer Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Queue sends while a turn is streaming, persist unsent composer drafts on the server, turn `@` / `/` typing into scope chips, Continue after Stop on the same thread, and expose reasoning effort only on Pro.

**Architecture:** Keep the live runtime (`useChat` + `OrchTurnStreamTransport` over oRPC `agent.chat.turnStream`). Add a small FIFO in the workspace-agent hook, a `dashboard_composer_draft` table keyed by user + conversation, extend the existing mention parser to `@` (nodes) and `/` (Agency task/project), reuse installed `MessageQueue` / `DraftRestore` / `StoppedRun` elements, and pass `modelPreset.effort` through to OpenRouter `reasoning.effort`.

**Tech Stack:** Bun, Drizzle, oRPC, Zustand (`useWorkspaceAgentStore`), assistant-ui `Thread` / `ModelSelector`, OpenRouter TypeScript SDK.

## Global Constraints

- Bun only. Never npm/pnpm/yarn.
- Golden layers: routers thin `protectedProcedure` → `service(actorUserId, input)` → `.parse()` Zod output. Views (`*-view.tsx`) are props-only: no oRPC, stores, or query hooks.
- Browser imports `@orch/agent/types` or `@orch/agent/model-routing`, never the `@orch/agent` barrel.
- Transport stays `agent.chat.turnStream`. No `/api/chat`. `reconnectToStream = null`.
- Collapsed Orch pill remains the only global entry/composer. Do not mount `assistant-modal`, `launcher-bubble`, Voice, MCP, quota, or code-runner disconnected demos.
- Writes never apply inside the model path. This plan does not add Agency/Canvas writes.
- Drafts persist in Postgres (not `localStorage`). Timer-style durability: survive refresh.
- Do not wire Prompt library.
- Tests: co-located `*.test.ts` with `bun:test`. No component render tests.
- Before finish: `bun run check`, `bun run check-types`, `bun run check:conventions`, `bun run check:golden` (when adding in-scope source files).
- Conventional commits (`feat:`, `fix:`, `refactor:`). UTF-8 only (middle dot `·`, em dash `—`).

## File map

| File                                                                              | Responsibility                                                   |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/web/src/features/workspace-agent/workspace-agent-message-queue.ts`          | FIFO enqueue/dequeue/cancel; max 5                               |
| `apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts`     | Queue unit tests                                                 |
| `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts`              | Enqueue while streaming; drain on idle; Continue; draft debounce |
| `apps/web/src/features/workspace-agent/workspace-agent-thread-composer-view.tsx`  | Mount `MessageQueue`; `@`/`/` popover                            |
| `apps/web/src/features/workspace-agent/workspace-agent-thread-slots.tsx`          | Mount `StoppedRun` when `streamStopped`                          |
| `packages/db/src/schema/workspace.ts`                                             | `dashboardComposerDraft` table                                   |
| `packages/db/src/migrations/0051_dashboard_composer_draft.sql`                    | Migration                                                        |
| `packages/api/src/routers/agent/composer-draft-service.ts`                        | get/upsert/discard drafts                                        |
| `packages/api/src/routers/agent/composer-draft-service.test.ts`                   | Draft contract tests (pure helpers)                              |
| `packages/api/src/routers/agent/router.ts`                                        | `conversations.draft.get/upsert/discard`                         |
| `apps/web/src/features/workspace-agent/workspace-agent-mentions.ts`               | `@` and `/` triggers                                             |
| `apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts`          | Trigger parser tests                                             |
| `packages/agent/src/types.ts`                                                     | `effort` on `agentModelPresetSchema`                             |
| `packages/agent/src/index.ts`                                                     | Pass `reasoning: { effort }` into `callModel`                    |
| `apps/web/src/features/workspace-agent/workspace-agent-thread-model-selector.tsx` | Effort control when tier is Pro                                  |
| `apps/web/src/components/elements/message-queue.tsx`                              | Installed presentational queue (do not restyle)                  |
| `apps/web/src/components/elements/draft-restore.tsx`                              | Installed restore chip                                           |
| `apps/web/src/components/elements/stopped-run.tsx`                                | Installed Continue/Discard                                       |

---

### Task 1: Message queue domain helper

**Files:**

- Create: `apps/web/src/features/workspace-agent/workspace-agent-message-queue.ts`
- Test: `apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts`

**Interfaces:**

- Consumes: nothing
- Produces: `QueuedAgentMessage`, `MAX_QUEUED_AGENT_MESSAGES`, `canEnqueueAgentMessage`, `enqueueAgentMessage`, `cancelQueuedAgentMessage`, `dequeueAgentMessage`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, test } from "bun:test";

import {
  MAX_QUEUED_AGENT_MESSAGES,
  canEnqueueAgentMessage,
  cancelQueuedAgentMessage,
  dequeueAgentMessage,
  enqueueAgentMessage,
} from "./workspace-agent-message-queue";

describe("canEnqueueAgentMessage", () => {
  test("queues only while streaming and under the cap", () => {
    expect(canEnqueueAgentMessage({ isStreaming: false, queueLength: 0 })).toBe(false);
    expect(canEnqueueAgentMessage({ isStreaming: true, queueLength: 0 })).toBe(true);
    expect(
      canEnqueueAgentMessage({ isStreaming: true, queueLength: MAX_QUEUED_AGENT_MESSAGES }),
    ).toBe(false);
  });
});

describe("enqueueAgentMessage", () => {
  test("appends FIFO and ignores empty text without attachments", () => {
    const first = enqueueAgentMessage([], { text: "  hello  " });
    expect(first).toHaveLength(1);
    expect(first[0]?.text).toBe("hello");
    expect(enqueueAgentMessage(first, { text: "   " })).toEqual(first);
  });
});

describe("cancelQueuedAgentMessage", () => {
  test("removes one id", () => {
    const queued = enqueueAgentMessage([], { text: "a" });
    const id = queued[0]?.id ?? "";
    expect(cancelQueuedAgentMessage(queued, id)).toEqual([]);
  });
});

describe("dequeueAgentMessage", () => {
  test("pops the head", () => {
    const queued = enqueueAgentMessage(enqueueAgentMessage([], { text: "a" }), { text: "b" });
    const { next, rest } = dequeueAgentMessage(queued);
    expect(next?.text).toBe("a");
    expect(rest).toHaveLength(1);
    expect(rest[0]?.text).toBe("b");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts`
Expected: FAIL with "Cannot find module" / "enqueueAgentMessage is not a function"

- [ ] **Step 3: Write minimal implementation**

```typescript
export const MAX_QUEUED_AGENT_MESSAGES = 5;

export type QueuedAgentMessage = {
  id: string;
  text: string;
};

export function canEnqueueAgentMessage(input: { isStreaming: boolean; queueLength: number }) {
  return input.isStreaming && input.queueLength < MAX_QUEUED_AGENT_MESSAGES;
}

export function enqueueAgentMessage(
  queue: readonly QueuedAgentMessage[],
  input: { text: string },
): QueuedAgentMessage[] {
  const text = input.text.trim();
  if (!text) return [...queue];
  if (queue.length >= MAX_QUEUED_AGENT_MESSAGES) return [...queue];
  return [...queue, { id: crypto.randomUUID(), text }];
}

export function cancelQueuedAgentMessage(
  queue: readonly QueuedAgentMessage[],
  id: string,
): QueuedAgentMessage[] {
  return queue.filter((entry) => entry.id !== id);
}

export function dequeueAgentMessage(queue: readonly QueuedAgentMessage[]): {
  next: QueuedAgentMessage | null;
  rest: QueuedAgentMessage[];
} {
  const [next, ...rest] = queue;
  return { next: next ?? null, rest };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/workspace-agent-message-queue.ts apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts
git commit -m "$(cat <<'EOF'
feat: add workspace agent send queue helper

FIFO while a turn is streaming, capped at five, so mid-turn sends are not dropped.
EOF
)"
```

---

### Task 2: Wire queue into send and mount MessageQueue

**Files:**

- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts`
- Modify: `apps/web/src/features/workspace-agent/workspace-agent-thread-composer-view.tsx`
- Modify: `apps/web/src/features/workspace-agent/workspace-agent-view.tsx` (pass queue props)
- Modify: `apps/web/src/features/workspace-agent/chat-panel-view.tsx` only if composer is reached through it — prefer composer-view props from the existing composer slot in `workspace-agent-view.tsx`

**Interfaces:**

- Consumes: `canEnqueueAgentMessage`, `enqueueAgentMessage`, `cancelQueuedAgentMessage`, `dequeueAgentMessage` from Task 1
- Produces: hook fields `queuedMessages`, `runningQueueLabel`, `onCancelQueuedMessage`; `sendMessage` enqueues when `isStreaming` instead of returning `false`

Current `sendMessage` bails with `if ((!content && attachments.length === 0) || isStreaming) return false;`. Change that so streaming + non-empty text enqueues.

- [ ] **Step 1: Write a failing test for send-path classification**

Add to `workspace-agent-message-queue.test.ts`:

```typescript
import { nextSendAction } from "./workspace-agent-message-queue";

describe("nextSendAction", () => {
  test("sends immediately when idle", () => {
    expect(nextSendAction({ isStreaming: false, queueLength: 0, text: "hi" })).toBe("send");
  });

  test("queues when streaming", () => {
    expect(nextSendAction({ isStreaming: true, queueLength: 0, text: "hi" })).toBe("queue");
  });

  test("drops empty idle sends", () => {
    expect(nextSendAction({ isStreaming: false, queueLength: 0, text: "  " })).toBe("ignore");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts`
Expected: FAIL — `nextSendAction` not exported

- [ ] **Step 3: Implement `nextSendAction` and hook wiring**

Add to `workspace-agent-message-queue.ts`:

```typescript
export function nextSendAction(input: {
  isStreaming: boolean;
  queueLength: number;
  text: string;
}): "send" | "queue" | "ignore" {
  if (!input.text.trim()) return "ignore";
  if (input.isStreaming) {
    return canEnqueueAgentMessage(input) ? "queue" : "ignore";
  }
  return "send";
}
```

In `use-workspace-agent.ts`:

1. `const [queuedMessages, setQueuedMessages] = useState<QueuedAgentMessage[]>([]);`
2. In `sendMessage`, replace the `isStreaming` early return:

```typescript
const action = nextSendAction({
  isStreaming,
  queueLength: queuedMessages.length,
  text: content,
});
if (action === "ignore") return false;
if (action === "queue") {
  setQueuedMessages((current) => enqueueAgentMessage(current, { text: content }));
  setDraft("");
  return true;
}
```

3. Drain after the stream ends. After the existing `onData` `data-orchCompleted` handler (and also a `useEffect` on `isStreaming`):

```typescript
useEffect(() => {
  if (isStreaming || queuedMessages.length === 0) return;
  const { next, rest } = dequeueAgentMessage(queuedMessages);
  if (!next) return;
  setQueuedMessages(rest);
  void sendMessage({ text: next.text });
}, [isStreaming, queuedMessages, sendMessage]);
```

ponytail: this effect re-runs when `queuedMessages` changes; guard with a ref if it double-sends. Prefer:

```typescript
const drainLockRef = useRef(false);
useEffect(() => {
  if (isStreaming || drainLockRef.current || queuedMessages.length === 0) return;
  const { next, rest } = dequeueAgentMessage(queuedMessages);
  if (!next) return;
  drainLockRef.current = true;
  setQueuedMessages(rest);
  void sendMessage({ text: next.text }).finally(() => {
    drainLockRef.current = false;
  });
}, [isStreaming, queuedMessages, sendMessage]);
```

4. `onCancelQueuedMessage = (id) => setQueuedMessages((q) => cancelQueuedAgentMessage(q, id))`
5. `runningQueueLabel` = last assistant text snippet or `"Working…"` while `isStreaming`

In `workspace-agent-thread-composer-view.tsx`, above the composer toolbar, when `isStreaming || queuedMessages.length > 0`:

```tsx
import { MessageQueue } from "@/components/elements/message-queue";

{
  isStreaming || queuedMessages.length > 0 ? (
    <MessageQueue
      className="mb-2 max-w-none"
      running={runningQueueLabel}
      queued={queuedMessages}
      onCancel={onCancelQueuedMessage}
    />
  ) : null;
}
```

Pass the new props from `workspace-agent-view.tsx` / composer slot. Do not change Stop: Stop still calls `stopGeneration()`; queued items stay until cancelled or drained.

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/workspace-agent-message-queue.ts apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts apps/web/src/features/workspace-agent/workspace-agent-thread-composer-view.tsx apps/web/src/features/workspace-agent/workspace-agent-view.tsx
git commit -m "$(cat <<'EOF'
feat: queue Orch sends while a turn is streaming

Mid-turn composer submits wait in MessageQueue instead of fighting Stop or dropping.
EOF
)"
```

---

### Task 3: Server-side composer draft persistence

**Files:**

- Modify: `packages/db/src/schema/workspace.ts`
- Create: `packages/db/src/migrations/0051_dashboard_composer_draft.sql`
- Create: `packages/db/src/migrations/meta/0051_snapshot.json` via `bun run db:generate` (do not hand-write snapshot)
- Create: `packages/api/src/routers/agent/composer-draft.ts` (schemas + pure normalize)
- Create: `packages/api/src/routers/agent/composer-draft.test.ts`
- Create: `packages/api/src/routers/agent/composer-draft-service.ts`
- Modify: `packages/api/src/routers/agent/router.ts`

**Interfaces:**

- Consumes: `DashboardConversationMessageAttachmentRecord` shape already in `packages/db/src/schema/workspace.ts`
- Produces: `getComposerDraft(actorUserId, { conversationId })`, `upsertComposerDraft(actorUserId, input)`, `discardComposerDraft(actorUserId, { conversationId })`

`conversationId` is `string | null`. Null means the unsaved "new chat" composer. Unique on `(user_id, coalesce(conversation_id, ''))`.

- [ ] **Step 1: Write failing normalize tests**

`packages/api/src/routers/agent/composer-draft.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";

import { composerDraftKey, normalizeComposerDraftText } from "./composer-draft";

describe("normalizeComposerDraftText", () => {
  test("trims and caps at 20000 characters", () => {
    expect(normalizeComposerDraftText("  hi  ")).toBe("hi");
    expect(normalizeComposerDraftText("x".repeat(20_001)).length).toBe(20_000);
  });
});

describe("composerDraftKey", () => {
  test("uses empty string for the new-chat draft", () => {
    expect(composerDraftKey(null)).toBe("");
    expect(composerDraftKey("conv-1")).toBe("conv-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/api/src/routers/agent/composer-draft.test.ts`
Expected: FAIL module not found

- [ ] **Step 3: Schema, helper, service, router**

`packages/api/src/routers/agent/composer-draft.ts`:

```typescript
import { z } from "zod";

import { agentTextAttachmentSchema } from "@orch/agent/types";

export const COMPOSER_DRAFT_TEXT_MAX = 20_000;

export function normalizeComposerDraftText(value: string) {
  return value.trim().slice(0, COMPOSER_DRAFT_TEXT_MAX);
}

export function composerDraftKey(conversationId: string | null | undefined) {
  return conversationId?.trim() || "";
}

export const composerDraftConversationInputSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
});

export const composerDraftUpsertInputSchema = composerDraftConversationInputSchema.extend({
  text: z.string().max(COMPOSER_DRAFT_TEXT_MAX),
  attachments: z.array(agentTextAttachmentSchema).max(6).default([]),
});

export const composerDraftRecordSchema = z.object({
  conversationId: z.string().nullable(),
  text: z.string(),
  attachments: z.array(agentTextAttachmentSchema),
  savedAt: z.string().datetime(),
});
```

Add to `packages/db/src/schema/workspace.ts` (after `dashboardConversationMessage`):

```typescript
export const dashboardComposerDraft = pgTable(
  "dashboard_composer_draft",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(() => dashboardConversation.id, {
      onDelete: "cascade",
    }),
    text: text("text").notNull().default(""),
    attachments: jsonb("attachments")
      .$type<DashboardConversationMessageAttachmentRecord[]>()
      .notNull()
      .default([]),
    savedAt: timestamp("saved_at").defaultNow().notNull(),
  },
  (table) => [index("dashboard_composer_draft_user_idx").on(table.userId)],
);
```

Do **not** add a unique index in Drizzle that Postgres cannot express with `coalesce`. Put it in SQL:

`packages/db/src/migrations/0051_dashboard_composer_draft.sql`:

```sql
CREATE TABLE "dashboard_composer_draft" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "conversation_id" text REFERENCES "dashboard_conversation"("id") ON DELETE cascade,
  "text" text DEFAULT '' NOT NULL,
  "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "saved_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "dashboard_composer_draft_user_idx" ON "dashboard_composer_draft" ("user_id");
CREATE UNIQUE INDEX "dashboard_composer_draft_user_conversation_uidx"
  ON "dashboard_composer_draft" ("user_id", coalesce("conversation_id", ''));
```

Run `bun run db:generate` if the repo workflow requires a meta snapshot; if generate wants to rewrite 0051, keep the unique index SQL above.

`packages/api/src/routers/agent/composer-draft-service.ts`:

```typescript
import { db } from "@orch/db";
import { dashboardComposerDraft } from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { and, eq, isNull } from "drizzle-orm";

import {
  composerDraftKey,
  composerDraftRecordSchema,
  normalizeComposerDraftText,
  type composerDraftUpsertInputSchema,
} from "./composer-draft";

type DraftInput = { conversationId?: string };

function conversationFilter(userId: string, conversationId: string | undefined) {
  const key = composerDraftKey(conversationId);
  if (!key) {
    return and(
      eq(dashboardComposerDraft.userId, userId),
      isNull(dashboardComposerDraft.conversationId),
    );
  }
  return and(
    eq(dashboardComposerDraft.userId, userId),
    eq(dashboardComposerDraft.conversationId, key),
  );
}

export async function getComposerDraft(actorUserId: string, input: DraftInput) {
  const [row] = await db
    .select()
    .from(dashboardComposerDraft)
    .where(conversationFilter(actorUserId, input.conversationId))
    .limit(1);
  if (!row) return { draft: null };
  return {
    draft: composerDraftRecordSchema.parse({
      conversationId: row.conversationId,
      text: row.text,
      attachments: row.attachments,
      savedAt: row.savedAt.toISOString(),
    }),
  };
}

export async function upsertComposerDraft(
  actorUserId: string,
  input: {
    conversationId?: string;
    text: string;
    attachments?: Array<{ filename: string; mediaType: string; text: string }>;
  },
) {
  const text = normalizeComposerDraftText(input.text);
  const attachments = input.attachments ?? [];
  const conversationId = composerDraftKey(input.conversationId) || null;
  const existing = await getComposerDraft(actorUserId, input);
  const savedAt = new Date();
  if (existing.draft) {
    await db
      .update(dashboardComposerDraft)
      .set({ text, attachments, savedAt })
      .where(conversationFilter(actorUserId, input.conversationId));
  } else {
    await db.insert(dashboardComposerDraft).values({
      id: createWorkspaceId("draft"),
      userId: actorUserId,
      conversationId,
      text,
      attachments,
      savedAt,
    });
  }
  return getComposerDraft(actorUserId, input);
}

export async function discardComposerDraft(actorUserId: string, input: DraftInput) {
  await db
    .delete(dashboardComposerDraft)
    .where(conversationFilter(actorUserId, input.conversationId));
  return { discarded: true as const };
}
```

Router — add under `conversations` in `packages/api/src/routers/agent/router.ts`:

```typescript
draft: {
  get: protectedProcedure
    .input(composerDraftConversationInputSchema)
    .handler(async ({ input, context }) => {
      return z
        .object({ draft: composerDraftRecordSchema.nullable() })
        .parse(await getComposerDraft(context.session.user.id, input));
    }),
  upsert: protectedProcedure
    .input(composerDraftUpsertInputSchema)
    .handler(async ({ input, context }) => {
      return z
        .object({ draft: composerDraftRecordSchema.nullable() })
        .parse(await upsertComposerDraft(context.session.user.id, input));
    }),
  discard: protectedProcedure
    .input(composerDraftConversationInputSchema)
    .handler(async ({ input, context }) => {
      return z
        .object({ discarded: z.literal(true) })
        .parse(await discardComposerDraft(context.session.user.id, input));
    }),
},
```

Import the schemas and service functions at the top of the router. Keep handlers thin.

- [ ] **Step 4: Run tests**

Run: `bun test packages/api/src/routers/agent/composer-draft.test.ts`
Expected: PASS

Local schema: `bun run db:push` (or migrate 0051).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/workspace.ts packages/db/src/migrations/0051_dashboard_composer_draft.sql packages/db/src/migrations/meta packages/api/src/routers/agent/composer-draft.ts packages/api/src/routers/agent/composer-draft.test.ts packages/api/src/routers/agent/composer-draft-service.ts packages/api/src/routers/agent/router.ts
git commit -m "$(cat <<'EOF'
feat: persist Orch composer drafts on the server

Unsent text belongs on Postgres per user and conversation so refresh does not lose it.
EOF
)"
```

---

### Task 4: DraftRestore chip in the composer

**Files:**

- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts`
- Modify: `apps/web/src/features/workspace-agent/workspace-agent-thread-composer-view.tsx`

**Interfaces:**

- Consumes: `orpc.agent.conversations.draft.get/upsert/discard` from Task 3
- Produces: `serverDraft`, `onRestoreServerDraft`, `onDiscardServerDraft`

- [ ] **Step 1: Write failing format helper test**

Add `apps/web/src/features/workspace-agent/composer-draft-display.ts` via TDD:

```typescript
import { describe, expect, test } from "bun:test";

import {
  formatComposerDraftSavedAt,
  shouldOfferComposerDraftRestore,
} from "./composer-draft-display";

describe("shouldOfferComposerDraftRestore", () => {
  test("offers restore only when the live composer is empty and the server draft is not", () => {
    expect(shouldOfferComposerDraftRestore({ liveDraft: "", serverText: "hello" })).toBe(true);
    expect(shouldOfferComposerDraftRestore({ liveDraft: "x", serverText: "hello" })).toBe(false);
    expect(shouldOfferComposerDraftRestore({ liveDraft: "", serverText: "" })).toBe(false);
  });
});

describe("formatComposerDraftSavedAt", () => {
  test("returns a short local stamp", () => {
    const stamp = formatComposerDraftSavedAt("2026-08-14T09:00:00.000Z");
    expect(stamp.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `bun test apps/web/src/features/workspace-agent/composer-draft-display.test.ts`
Expected: FAIL module not found

- [ ] **Step 3: Implement helper + hook + view**

```typescript
export function shouldOfferComposerDraftRestore(input: { liveDraft: string; serverText: string }) {
  return input.liveDraft.trim().length === 0 && input.serverText.trim().length > 0;
}

export function formatComposerDraftSavedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
```

Hook behavior:

1. Query `orpc.agent.conversations.draft.get` with `{ conversationId }` when a conversation is selected; omit `conversationId` for new chat.
2. Debounce upsert 500ms on `draft` changes (skip while `isStreaming`). Empty live draft after a successful send should `discard`.
3. After `sendMessage` succeeds (action `"send"`), call `discardComposerDraft`.
4. `onRestoreServerDraft`: `setDraft(serverDraft.text)` then hide the chip (live draft non-empty).
5. `onDiscardServerDraft`: mutation discard + invalidate query.

View — above the composer, when `shouldOfferComposerDraftRestore`:

```tsx
import { DraftRestore } from "@/components/elements/draft-restore";

{
  serverDraftOffer ? (
    <DraftRestore
      className="mb-2 max-w-none"
      draft={serverDraft.text}
      savedAt={formatComposerDraftSavedAt(serverDraft.savedAt)}
      onRestore={onRestoreServerDraft}
      onDiscard={onDiscardServerDraft}
    />
  ) : null;
}
```

Never write drafts to `localStorage`. The existing Zustand `draft` is in-memory only for the current session; server is source of restore.

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/workspace-agent/composer-draft-display.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/composer-draft-display.ts apps/web/src/features/workspace-agent/composer-draft-display.test.ts apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts apps/web/src/features/workspace-agent/workspace-agent-thread-composer-view.tsx
git commit -m "$(cat <<'EOF'
feat: restore unsent Orch drafts from the server

Show DraftRestore when the composer is empty and a saved draft exists for this thread.
EOF
)"
```

---

### Task 5: `@` and `/` trigger parser

**Files:**

- Modify: `apps/web/src/features/workspace-agent/workspace-agent-mentions.ts`
- Create: `apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts`

**Interfaces:**

- Consumes: existing `getActiveWorkspaceAgentMention` `@` pattern
- Produces: `WorkspaceAgentComposerTrigger` with `kind: "at" | "slash"`, `getActiveWorkspaceAgentTrigger`, `stripActiveWorkspaceAgentTrigger`

`@` → Canvas/node chips (existing). `/` → Agency `project` / `task` chips. Sniper click mode stays; typing is an additional path, not click-only.

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, test } from "bun:test";

import {
  getActiveWorkspaceAgentTrigger,
  stripActiveWorkspaceAgentTrigger,
} from "./workspace-agent-mentions";

describe("getActiveWorkspaceAgentTrigger", () => {
  test("detects an @ query at the end", () => {
    expect(getActiveWorkspaceAgentTrigger("see @lau")).toEqual({
      kind: "at",
      query: "lau",
      start: 4,
      end: 8,
    });
  });

  test("detects a / query at the end", () => {
    expect(getActiveWorkspaceAgentTrigger("track /land")).toEqual({
      kind: "slash",
      query: "land",
      start: 6,
      end: 11,
    });
  });

  test("returns null when the trigger is closed", () => {
    expect(getActiveWorkspaceAgentTrigger("see @launch now")).toBeNull();
  });
});

describe("stripActiveWorkspaceAgentTrigger", () => {
  test("removes the active trigger token", () => {
    expect(stripActiveWorkspaceAgentTrigger("see @lau")).toBe("see ");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts`
Expected: FAIL `getActiveWorkspaceAgentTrigger` not exported

- [ ] **Step 3: Implement**

Replace the mention helpers with:

```typescript
export type WorkspaceAgentComposerTriggerKind = "at" | "slash";

export type WorkspaceAgentComposerTrigger = {
  kind: WorkspaceAgentComposerTriggerKind;
  query: string;
  start: number;
  end: number;
};

const ACTIVE_TRIGGER_PATTERN = /(^|[\s([{:;,])([@/])([^\s@/]*)$/;

export function getActiveWorkspaceAgentTrigger(
  draft: string,
): WorkspaceAgentComposerTrigger | null {
  const match = ACTIVE_TRIGGER_PATTERN.exec(draft);
  if (!match) return null;
  const prefix = match[1] ?? "";
  const marker = match[2];
  const query = match[3] ?? "";
  const start = match.index + prefix.length;
  if (marker !== "@" && marker !== "/") return null;
  return {
    kind: marker === "@" ? "at" : "slash",
    query,
    start,
    end: draft.length,
  };
}

export function getActiveWorkspaceAgentMention(draft: string) {
  const trigger = getActiveWorkspaceAgentTrigger(draft);
  if (!trigger || trigger.kind !== "at") return null;
  return { query: trigger.query, start: trigger.start, end: trigger.end };
}

export function stripActiveWorkspaceAgentTrigger(draft: string) {
  const trigger = getActiveWorkspaceAgentTrigger(draft);
  if (!trigger) return draft;
  return `${draft.slice(0, trigger.start)}${draft.slice(trigger.end)}`;
}

export function stripActiveWorkspaceAgentMention(draft: string) {
  return stripActiveWorkspaceAgentTrigger(draft);
}
```

Keep `getWorkspaceAgentMentionSuggestions` for nodes. Add:

```typescript
export type WorkspaceAgentSlashCandidate = {
  kind: "project" | "task";
  id: string;
  label: string;
};

export function getWorkspaceAgentSlashSuggestions(
  candidates: WorkspaceAgentSlashCandidate[],
  query: string,
  selectedIds: Set<string>,
  limit = 6,
) {
  const normalized = query.trim().toLowerCase();
  return candidates
    .filter((entry) => !selectedIds.has(entry.id))
    .filter((entry) => {
      if (!normalized) return true;
      return entry.label.toLowerCase().includes(normalized);
    })
    .slice(0, limit);
}
```

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/workspace-agent-mentions.ts apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts
git commit -m "$(cat <<'EOF'
feat: parse @ and / composer triggers into scope tokens

Typing @ or / at the end of the draft is enough to start a scope insert.
EOF
)"
```

---

### Task 6: Composer trigger popover

**Files:**

- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts`
- Modify: `apps/web/src/features/workspace-agent/workspace-agent-thread-composer-view.tsx`

**Interfaces:**

- Consumes: Task 5 trigger helpers; existing `addScopeChip`; Agency project/task lists already loaded for the tracker/team (reuse `useAgencyProjectsQuery` / task query already used by the feature, or pass `slashCandidates` from the hook via existing shared agency queries in `apps/web/src/features/shared/`)
- Produces: `composerTrigger`, `composerTriggerSuggestions`, `onPickComposerTrigger`

- [ ] **Step 1: Extend mention tests for slash ranking**

```typescript
test("slash suggestions match label substrings and skip selected ids", () => {
  const suggestions = getWorkspaceAgentSlashSuggestions(
    [
      { kind: "task", id: "t1", label: "Landing page" },
      { kind: "task", id: "t2", label: "Invoice export" },
    ],
    "land",
    new Set(["t1"]),
  );
  expect(suggestions.map((entry) => entry.id)).toEqual([]);
});
```

Add a second assertion with empty selected set expecting `t1`.

- [ ] **Step 2: Run to verify the empty-selected case is the intended pass after implementation**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts`

- [ ] **Step 3: Wire popover**

In the hook:

- `composerTrigger = getActiveWorkspaceAgentTrigger(draft)`
- `@` suggestions: existing node suggestions when `composerTrigger.kind === "at"` (allow on both surfaces; nodes unlock Canvas).
- `/` suggestions: when `teamId` is set, map projects and tasks to `WorkspaceAgentSlashCandidate`. `/` on Canvas still inserts Agency chips (that is how Agency unlocks from Canvas).
- `onPickComposerTrigger(candidate)`:
  - `addScopeChip({ kind: candidate.kind === "at" ? "node" : candidate.kind, id, label })`
  - `setDraft(stripActiveWorkspaceAgentTrigger(draft))`
  - `markScopeHintSeen()`

In the composer view, render a `Popover` anchored to the composer when `composerTrigger` is non-null and suggestions length > 0. Use shadcn `Command` / existing popover (same as plus menu). Rows:

- `@` : node title
- `/` : `{kind} · {label}`

Keyboard: Enter picks the first suggestion. Escape closes by stripping nothing (leave the token; user can delete). Do not enter sniper mode.

Keep the sniper crosshair. Click-to-scope still works.

- [ ] **Step 4: Run tests + types**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts`
Then: `bun run check-types`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts apps/web/src/features/workspace-agent/workspace-agent-thread-composer-view.tsx apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts
git commit -m "$(cat <<'EOF'
feat: insert Orch scope chips from @ and / suggestions

Composer typing can pin a node, project, or task without entering sniper click mode.
EOF
)"
```

---

### Task 7: Continue after Stop

**Files:**

- Modify: `apps/web/src/features/workspace-agent/workspace-agent-thread-slots.tsx`
- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts`
- Create: `apps/web/src/features/workspace-agent/workspace-agent-continue.ts`
- Create: `apps/web/src/features/workspace-agent/workspace-agent-continue.test.ts`

**Interfaces:**

- Consumes: existing `streamStopped` (set from `data-orchCompleted.stopped`)
- Produces: `CONTINUE_TURN_TEXT`, `continueStoppedTurn()`, `dismissStoppedTurn()`

Continue is a **new user turn** on the same `conversationId`, not `regenerate()`. Partial assistant text stays in `messages`. Discard only clears the stopped banner.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, test } from "bun:test";

import { CONTINUE_TURN_TEXT, shouldShowStoppedRun } from "./workspace-agent-continue";

describe("shouldShowStoppedRun", () => {
  test("shows only when stopped and not streaming", () => {
    expect(shouldShowStoppedRun({ streamStopped: true, isStreaming: false })).toBe(true);
    expect(shouldShowStoppedRun({ streamStopped: true, isStreaming: true })).toBe(false);
    expect(shouldShowStoppedRun({ streamStopped: false, isStreaming: false })).toBe(false);
  });
});

describe("CONTINUE_TURN_TEXT", () => {
  test("is a single continue token", () => {
    expect(CONTINUE_TURN_TEXT).toBe("Continue.");
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-continue.test.ts`

- [ ] **Step 3: Implement**

```typescript
export const CONTINUE_TURN_TEXT = "Continue.";

export function shouldShowStoppedRun(input: { streamStopped: boolean; isStreaming: boolean }) {
  return input.streamStopped && !input.isStreaming;
}
```

Hook:

```typescript
const continueStoppedTurn = useCallback(() => {
  setStreamStopped(false);
  void sendMessage({ text: CONTINUE_TURN_TEXT });
}, [sendMessage]);

const dismissStoppedTurn = useCallback(() => {
  setStreamStopped(false);
}, []);
```

In `WorkspaceAgentThreadMessageProvider` / thread slots, when `shouldShowStoppedRun`, render after the last assistant message (not as a second composer):

```tsx
import { StoppedRun } from "@/components/elements/stopped-run";

{
  shouldShowStoppedRun({ streamStopped, isStreaming }) ? (
    <StoppedRun
      className="max-w-none px-4"
      words={lastAssistantText.split(/\s+/).filter(Boolean).slice(-24)}
      reason="Stopped"
      onContinue={onContinueStoppedTurn}
      onDiscard={onDismissStoppedTurn}
    />
  ) : null;
}
```

`lastAssistantText` comes from the last assistant `OrchUIMessage` text parts. Do not delete that message on Discard.

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-continue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/workspace-agent-continue.ts apps/web/src/features/workspace-agent/workspace-agent-continue.test.ts apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts apps/web/src/features/workspace-agent/workspace-agent-thread-slots.tsx
git commit -m "$(cat <<'EOF'
feat: continue an Orch turn after Stop

Keep the partial answer and send one new Continue turn on the same thread.
EOF
)"
```

---

### Task 8: Reasoning effort on the wire

**Files:**

- Modify: `packages/agent/src/types.ts` (`agentModelPresetSchema`, `DEFAULT_AGENT_MODEL_PRESET`)
- Create: `packages/agent/src/reasoning-effort.ts`
- Create: `packages/agent/src/reasoning-effort.test.ts`
- Modify: `packages/agent/src/index.ts` (`callModel` in both tool and text-only passes)

**Interfaces:**

- Consumes: `AgentModelPreset` already on `agentChatTurnInputSchema.modelPreset`
- Produces: `resolveOpenRouterReasoning(preset): { effort: "low" | "medium" | "high" } | undefined`

OpenRouter ChatRequest supports `reasoning: { effort }`. Pass it only when `preset.tier === "pro"` and `preset.effort` is set. Fast/Balanced ignore leftover effort so switching away from Pro is safe.

- [ ] **Step 1: Write failing test**

```typescript
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
    expect(resolveOpenRouterReasoning({ tier: "pro", auto: true, free: false })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test packages/agent/src/reasoning-effort.test.ts`

- [ ] **Step 3: Implement**

In `packages/agent/src/types.ts`:

```typescript
export const agentReasoningEffortSchema = z.enum(["low", "medium", "high"]);

export const agentModelPresetSchema = z.object({
  tier: agentModelTierSchema.default("balanced"),
  auto: z.boolean().default(true),
  free: z.boolean().default(false),
  effort: agentReasoningEffortSchema.optional(),
});
```

`packages/agent/src/reasoning-effort.ts`:

```typescript
import type { AgentModelPreset } from "./types";

export function resolveOpenRouterReasoning(preset: AgentModelPreset | null | undefined) {
  if (!preset || preset.tier !== "pro") return undefined;
  if (!preset.effort) return undefined;
  return { effort: preset.effort };
}
```

In both `callModel` sites in `packages/agent/src/index.ts` (~682 and ~846):

```typescript
const reasoning = resolveOpenRouterReasoning(args.modelPreset);
const result = createOpenRouterClient().callModel({
  model: args.model,
  instructions: args.instructions,
  input: args.normalizedMessages,
  ...(tools ? { tools, stopWhen: [stepCountIs(args.maxSteps)] } : {}),
  ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
  ...(args.maxOutputTokens === undefined ? {} : { maxOutputTokens: args.maxOutputTokens }),
  ...(reasoning ? { reasoning } : {}),
});
```

Thread `modelPreset` from `DashboardAgentConfig` into those `args`. If `callModel` types reject `reasoning`, check `@openrouter/sdk` `callModel` options; the ChatRequest field is `reasoning?: { effort?: "low" | "medium" | "high" | ... }`.

Do **not** mount `elements-reasoning-effort` (it wants fake token spend). Use ModelSelector effort in Task 9.

- [ ] **Step 4: Run tests**

Run: `bun test packages/agent/src/reasoning-effort.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/types.ts packages/agent/src/reasoning-effort.ts packages/agent/src/reasoning-effort.test.ts packages/agent/src/index.ts
git commit -m "$(cat <<'EOF'
feat: pass Pro reasoning effort to OpenRouter

Orch Pro turns can set reasoning.effort without changing Fast or Balanced.
EOF
)"
```

---

### Task 9: Pro effort control in ModelSelector

**Files:**

- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent-model-preset.ts`
- Modify: `apps/web/src/features/workspace-agent/workspace-agent-thread-model-selector.tsx`
- Modify: `apps/web/src/components/assistant-ui/model-selector.tsx` only if `ModelSelector` needs an `effort` / `onEffortChange` passthrough — it already has `efforts` on `ModelOption` and `resolveModelEffort`

**Interfaces:**

- Consumes: `agentReasoningEffortSchema`; `DEFAULT_EFFORT_OPTIONS` in model-selector
- Produces: `modelPreset.effort` included in `buildOrchTurnSendContext`

Set `TIER_MODELS` Pro to `{ id: "pro", name: "Pro", description: "Harder problems", efforts: true }`. Fast/Balanced omit `efforts`.

- [ ] **Step 1: Write failing preset test if a helper is extracted**

If effort lives in the hook, add `apps/web/src/features/workspace-agent/model-preset-effort.ts`:

```typescript
import { describe, expect, test } from "bun:test";

import { effortForOutboundPreset } from "./model-preset-effort";

describe("effortForOutboundPreset", () => {
  test("keeps effort only on Pro", () => {
    expect(effortForOutboundPreset("pro", "medium")).toBe("medium");
    expect(effortForOutboundPreset("fast", "medium")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test apps/web/src/features/workspace-agent/model-preset-effort.test.ts`

- [ ] **Step 3: Implement**

```typescript
import type { AgentModelTier, AgentModelPreset } from "@orch/agent/types";

export function effortForOutboundPreset(
  tier: AgentModelTier,
  effort: AgentModelPreset["effort"],
): AgentModelPreset["effort"] {
  return tier === "pro" ? effort : undefined;
}
```

Hook: persist `{ tier, auto, free, effort }` in the existing `PRESET_STORAGE_KEY` JSON (model **preference** may stay local; the **turn** still sends effort on the wire). Default effort when switching to Pro: `"medium"`.

ModelSelector: pass `effort` / `onEffortChange` if the installed selector supports it (see `resolveModelEffort` in `apps/web/src/components/assistant-ui/model-selector.tsx`). If the Root API is `value` + models with `efforts: true`, set effort via the selector's effort buttons that already render for models with `efforts`.

Include `effort: effortForOutboundPreset(tier, effort)` in `modelPresetState.modelPreset` so `buildOrchTurnSendContext` already forwards it.

- [ ] **Step 4: Run tests + types**

Run: `bun test apps/web/src/features/workspace-agent/model-preset-effort.test.ts`
Then: `bun run check-types`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/model-preset-effort.ts apps/web/src/features/workspace-agent/model-preset-effort.test.ts apps/web/src/features/workspace-agent/hooks/use-workspace-agent-model-preset.ts apps/web/src/features/workspace-agent/workspace-agent-thread-model-selector.tsx
git commit -m "$(cat <<'EOF'
feat: show reasoning effort under Orch Pro

One Low/Med/High control on Pro; other tiers stay a single-word label.
EOF
)"
```

---

### Task 10: Verify the slice

**Files:** none new

- [ ] **Step 1: Run unit tests for this plan**

```bash
bun test apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts
bun test apps/web/src/features/workspace-agent/composer-draft-display.test.ts
bun test apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts
bun test apps/web/src/features/workspace-agent/workspace-agent-continue.test.ts
bun test apps/web/src/features/workspace-agent/model-preset-effort.test.ts
bun test packages/api/src/routers/agent/composer-draft.test.ts
bun test packages/agent/src/reasoning-effort.test.ts
```

Expected: all PASS

- [ ] **Step 2: Repo checks**

```bash
bun run check
bun run check-types
bun run check:conventions
bun run check:golden
```

Expected: PASS. If `check:golden` reports new files, run the inventory generator the repo already uses (`bun run check:golden` / generate script) and commit the inventory update in this same verify commit.

- [ ] **Step 3: Manual smoke (browser)**

1. Send a long Ask turn; type another line and Send — it appears in MessageQueue; after the first turn ends, it sends.
2. Type in composer, refresh — DraftRestore appears; Restore fills; Discard clears server row.
3. Type `@` on Canvas and `/` on Agency — chips appear without sniper.
4. Stop mid-stream — StoppedRun Continue sends `Continue.` on the same thread; partial remains.
5. Switch to Pro — Low/Med/High appears; Fast hides it.

- [ ] **Step 4: Commit inventory only if generated**

```bash
git add docs/golden-file-source-inventory.md
git commit -m "$(cat <<'EOF'
chore: update golden file inventory for composer reliability

New draft service and queue helpers are in-scope source files.
EOF
)"
```

---

## Out of scope

- Prompt library
- Voice / MCP / quota / sandbox runner chrome
- Agency gap-fill, Money, Needs-action, waste copilot (see `2026-08-14-agency-orch-ops.md`)
- Canvas `node.update` / agencyRef (see `2026-08-14-canvas-orch-scope.md`)
- Thread search / read-aloud (see `2026-08-14-orch-thread-search-and-read-aloud.md`)
