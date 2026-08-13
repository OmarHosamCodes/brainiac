# Task 2 Re-Review — Wire queue into send and mount MessageQueue

**Reviewer:** task reviewer (spec compliance + code quality)  
**BASE:** `756f185c`  
**HEAD:** `bf9b3ca0` (feat `de1f3e86` + fix `bf9b3ca0`)  
**Verdict:** Spec ✅ · Task quality **Approved**

---

## Spec ✅/❌

**Spec ✅**

Task 2 brief requirements remain satisfied after the attachment fix. The fix commit is a justified extension of `nextSendAction`, not a miss on core scope.

| Requirement | Status |
|-------------|--------|
| `nextSendAction` in `workspace-agent-message-queue.ts` with `"send" \| "queue" \| "ignore"` | ✅ |
| Co-located `nextSendAction` tests (idle send, streaming queue, empty ignore) | ✅ |
| `queuedMessages` state + `sendMessage` classification via `nextSendAction` | ✅ |
| Queue path enqueues, clears draft, returns `true` | ✅ |
| `drainLockRef` + `useEffect` drain when `!isStreaming` | ✅ |
| `onCancelQueuedMessage` via `cancelQueuedAgentMessage` | ✅ |
| `runningQueueLabel` from last assistant snippet or `"Working…"` | ✅ |
| `MessageQueue` mounted above composer when `isStreaming \|\| queuedMessages.length > 0` | ✅ |
| Props wired through `workspace-agent-view.tsx` composer slot | ✅ |
| `chat-panel-view.tsx` untouched | ✅ |
| Stop still calls `stopGeneration()`; queue persists | ✅ |
| Conventional commits (`feat:` + `fix:`) | ✅ |
| Global constraints (golden layers, no forbidden mounts, bun:test, `@orch/agent/types` only) | ✅ |

**Fix delta (post first review):**

| Fix item | Status |
|----------|--------|
| Attachment-only idle sends no longer regressed (`attachmentsLength` + `"send"` when idle) | ✅ Fixed in `bf9b3ca0` |
| Streaming attachment-only stays `"ignore"` (text-only queue) | ✅ Intentional + tested |
| `sendMessage` passes `attachments.length` into `nextSendAction` | ✅ |

---

## Fix verification

The first review’s **Important #1** (attachment-only idle sends silently returning `false`) is **resolved**.

`nextSendAction` now treats empty text with attachments as content when idle:

```typescript
const hasContent = input.text.trim().length > 0 || (input.attachmentsLength ?? 0) > 0;
if (!hasContent) return "ignore";
if (input.isStreaming) {
  if (!input.text.trim()) return "ignore";
  return canEnqueueAgentMessage(input) ? "queue" : "ignore";
}
return "send";
```

Three new unit tests cover attachment-only idle send, attachment-only while streaming, and text+attachments while streaming. The fix is minimal (3 files, +23/−1), conventional, and does not disturb queue/drain/UI wiring from `de1f3e86`.

---

## Strengths

1. **Pure send classification** — `nextSendAction` stays a small, testable function; queue policy remains out of the hook except for orchestration.
2. **Race-safe drain** — `drainLockRef` + `.finally()` matches the brief’s recommended guard.
3. **Layer discipline** — Hook owns state; `workspace-agent-thread-composer-view.tsx` stays props-only; `workspace-agent-view.tsx` only passes view-model fields.
4. **Targeted fix** — Attachment regression fixed without widening scope into attachment queuing or composer UI gating.
5. **TDD traceability** — Original three brief cases plus three fix cases; report documents 10 pass / 0 fail after fix.
6. **Stop semantics preserved** — Queue independent of `stopGeneration()`, as specified.

---

## Issues

### Critical

_None._

### Important

1. **Queue-at-cap silent drop** — When streaming with `queueLength >= MAX_QUEUED_AGENT_MESSAGES`, `nextSendAction` returns `"ignore"` and `sendMessage` returns `false` with no user-visible feedback. Unchanged from first review; not addressed by fix.
2. **Definition-of-done validation incomplete in report** — Fix appendix still only documents `bun test` + prior `check-types`. Repo DoD also expects `bun run check` and `bun run check:conventions` for feature changes. Not evidenced in either report section.
3. **Composer/runtime path still bypasses hook `sendMessage`** — `AssistantRuntimeProvider` uses `useAISDKRuntime(chat)`; `ComposerPrimitive.Send` is hidden while `thread.isRunning`. Queue logic lives in the hook’s wrapped `sendMessage`, which composer submit does not call today. Task report correctly flags UI gating as a later task, but end-to-end mid-turn enqueue from the Thread composer will need explicit wiring (hook send or transport-level classification) when Send is re-enabled during streaming.

### Minor

1. **Missing unit test** — No case for `nextSendAction` returning `"ignore"` when streaming at queue cap (`queueLength === MAX_QUEUED_AGENT_MESSAGES`).
2. **`runningQueueLabel` / “running” row between turns** — When `!isStreaming && queuedMessages.length > 0` (pre-drain gap), `MessageQueue` still shows the animated “running” row with last-assistant snippet or `"Working…"`, which can imply an active turn that already ended. Brief visibility condition requires showing the queue in that state; UX may still feel misleading.
3. **Text+attachments while streaming drops attachments on enqueue** — `nextSendAction` returns `"queue"` and `sendMessage` returns `true`, but only `text` is enqueued; attachments are discarded. Acceptable while queue is text-only, but worth documenting for users who attach mid-turn.
4. **Text-only queue model on drain** — Drained sends call `sendMessage({ text: next.text })` with no attachments; acceptable for this task.

---

## Task quality

**Approved**

Core Task 2 deliverables are complete and well layered. The fix commit closes the only Important blocker from the first review (attachment-only idle regression) without scope creep. Remaining Important items are follow-ups (cap feedback, fuller CI evidence, composer/runtime integration when UI allows mid-turn send), not rejections of this task slice.

---

## ⚠️ Cannot verify

- Manual browser verification of `MessageQueue` during a live authenticated stream (report notes no dev session).
- `bun run check` and `bun run check:conventions` pass (not run/documented in report; reviewer instructed not to re-run tests).
- End-to-end drain/cancel behavior under real streaming timing and React Strict Mode double effects.
- Whether composer UI still blocks submit while streaming (`ComposerPrimitive.Send` hidden when `thread.isRunning`; report notes `canSend` gating may remain a later task).
- That mid-turn composer submit will reach hook queue logic once UI gating is lifted (architectural wiring not in this diff).
