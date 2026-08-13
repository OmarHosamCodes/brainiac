# Task 2 Report — Wire queue into send and mount MessageQueue

**Branch:** `omarhosamcodes/cloud-agent-1786657271032-f0r08`  
**Commit:** `de1f3e86`  
**Status:** DONE

## Summary

Task 2 wires the Task 1 FIFO message queue into `useWorkspaceAgent.sendMessage` and mounts the installed `MessageQueue` component in the Thread composer. While a turn is streaming, non-empty composer text is enqueued instead of being dropped. When streaming ends, a guarded `useEffect` drains the queue one message at a time. Stop still calls `stopGeneration()`; queued items remain until cancelled or drained.

## TDD steps executed

### Step 1 — Failing test

Added `nextSendAction` tests to `workspace-agent-message-queue.test.ts`:

- sends immediately when idle → `"send"`
- queues when streaming → `"queue"`
- drops empty idle sends → `"ignore"`

### Step 2 — Verify failure

```
bun test apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts
```

Result: **FAIL** — `Export named 'nextSendAction' not found`

### Step 3 — Implementation

**`workspace-agent-message-queue.ts`**

- Added `nextSendAction(input)` returning `"send" | "queue" | "ignore"` per brief.

**`hooks/use-workspace-agent.ts`**

- `queuedMessages` state (`QueuedAgentMessage[]`).
- `sendMessage` uses `nextSendAction`; `"queue"` path enqueues and clears draft; `"ignore"` returns `false`.
- `drainLockRef` + `useEffect` dequeues head when `!isStreaming` and queue non-empty, then calls `sendMessage({ text: next.text })`.
- `onCancelQueuedMessage` removes by id via `cancelQueuedAgentMessage`.
- `runningQueueLabel` = last assistant `getMessageText` snippet or `"Working…"`.
- Exported `queuedMessages`, `runningQueueLabel`, `onCancelQueuedMessage` on the hook return object.

**`workspace-agent-thread-composer-view.tsx`**

- New props: `isStreaming`, `queuedMessages`, `runningQueueLabel`, `onCancelQueuedMessage`.
- Renders `MessageQueue` from `@/components/elements/message-queue` above `ThreadComposer` when `isStreaming || queuedMessages.length > 0`.

**`workspace-agent-view.tsx`**

- Passes queue props from view model into `WorkspaceAgentThreadComposerView` composer slot.

**Not changed:** `chat-panel-view.tsx` (composer reached via existing slot in `workspace-agent-view.tsx`). Stop behavior unchanged.

### Step 4 — Verify pass

```
bun test apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts
```

Result: **7 pass, 0 fail**

Additional validation:

```
bun run check-types
```

Result: **8/8 packages successful**

### Step 5 — Commit

```
de1f3e86 feat: queue Orch sends while a turn is streaming
```

## Files touched

| File                                       | Change                                                 |
| ------------------------------------------ | ------------------------------------------------------ |
| `workspace-agent-message-queue.ts`         | `nextSendAction`                                       |
| `workspace-agent-message-queue.test.ts`    | `nextSendAction` tests                                 |
| `hooks/use-workspace-agent.ts`             | queue state, send classification, drain effect, labels |
| `workspace-agent-thread-composer-view.tsx` | `MessageQueue` mount + props                           |
| `workspace-agent-view.tsx`                 | pass queue props to composer                           |

## Behavior notes

- **Enqueue while streaming:** User submits text during an active turn → message appended to FIFO (max 5), draft cleared, returns `true`.
- **Drain on idle:** When `isStreaming` becomes false and queue has items, head is dequeued and sent automatically; `drainLockRef` prevents double-send races.
- **Cancel:** `onCancelQueuedMessage` removes a queued item without affecting the in-flight turn.
- **Stop:** `stopGeneration()` unchanged; queue persists for later drain or user cancel.
- **UI:** `MessageQueue` shows running label + queued list with cancel buttons above the composer toolbar.

## Out of scope (later tasks)

- Composer `canSend` / assistant-ui runtime send gating while streaming (may still block submit at UI layer until a later task).
- Attachment-only sends while idle: `nextSendAction` returns `"ignore"` for empty text per brief; attachment-only path not extended in this task.

## Concerns

None blocking. Manual browser verification of MessageQueue during a live stream was not performed in this environment (no authenticated dev session); unit tests and typecheck pass.

---

## Review fix — attachment-only idle sends

**Commit:** `bf9b3ca0`  
**Status:** DONE

### Change

Extended `nextSendAction` with optional `attachmentsLength`. Empty text with zero attachments stays `"ignore"`; empty text with attachments is `"send"` when idle and `"ignore"` when streaming (queue remains text-only). Wired `sendMessage` to pass `attachments.length`.

### Tests

```
bun test apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts
```

Result: **10 pass, 0 fail**

New cases:

- sends attachment-only when idle → `"send"`
- ignores attachment-only while streaming → `"ignore"`
- queues text with attachments while streaming → `"queue"`

### Concerns

None. Attachment-only while streaming is intentionally `"ignore"` until queued messages support attachments.

---

## Review fix — composer send while streaming

**Commit:** `e22bfc9e`  
**Status:** DONE

### Problem

`MessageQueue` and hook `sendMessage` already enqueue while `isStreaming`, but `ComposerAction` hid `ComposerPrimitive.Send` whenever `thread.isRunning`, so users could not submit follow-ups from the live Thread composer.

### Change

**`thread.tsx`**

- Added optional `onSendWhileRunning?: (text: string) => boolean | Promise<boolean>` on `ThreadComposer`.
- While `thread.isRunning`, render a custom Send button (not `ComposerPrimitive.Send`) that reads composer text via `unstable_useComposerInput`, calls `onSendWhileRunning`, and clears input when it returns `true`.
- Kept `ComposerPrimitive.Cancel` (Stop) visible alongside the running Send control.

**`workspace-agent-thread-composer-view.tsx`**

- Added `onSend` prop; passes `onSendWhileRunning={(text) => onSend({ text })}` to `ThreadComposer`.

**`workspace-agent-view.tsx`**

- Passes `onSend={view.sendMessage}` into the composer view.

**`workspace-agent-composer-send-while-running.ts`**

- `shouldShowComposerSendWhileRunning` and `canComposerSendWhileRunning` helpers (unit-tested).

### Tests

```
bun test apps/web/src/features/workspace-agent/workspace-agent-message-queue.test.ts
```

Result: **12 pass, 0 fail**

New cases:

- `shouldShowComposerSendWhileRunning` — running + handler only
- `canComposerSendWhileRunning` — non-empty trimmed text

```
bun run check-types
```

Result: **8/8 packages successful**

### Concerns

Enter-to-send while streaming may still route through assistant-ui runtime gating; button Send is the supported path for this fix. Manual browser verification during a live stream was not performed in this environment.
