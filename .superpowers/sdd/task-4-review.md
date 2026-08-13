# Task 4 Review — DraftRestore chip in the composer

**Reviewer:** task reviewer  
**BASE:** `0c0e318c`  
**HEAD:** `a5711e7d`  
**Verdict:** Spec ✅ · Task quality **Issues found**

---

## Spec ✅/❌

**Spec ✅**

| Requirement                                                                                                                       | Status |
| --------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `composer-draft-display.ts` — `shouldOfferComposerDraftRestore`, `formatComposerDraftSavedAt` per brief                           | ✅     |
| `composer-draft-display.test.ts` — brief TDD cases (restore gate + stamp length)                                                  | ✅     |
| `draft.get` query via `use-workspace-agent-data.ts` with `authEnabled`                                                            | ✅     |
| Omit `conversationId` when `activeConversationId === null`; include when selected                                                 | ✅     |
| `draft.upsert` / `draft.discard` mutations in data hook                                                                           | ✅     |
| Invalidate matching `draft.get` after upsert / discard                                                                            | ✅     |
| Debounced upsert 500ms (`COMPOSER_DRAFT_DEBOUNCE_MS`)                                                                             | ✅     |
| Skip upsert while `isStreaming`                                                                                                   | ✅     |
| Empty live draft debounce does **not** discard (early `return` when `draft.trim().length === 0`)                                  | ✅     |
| Timer ref; cleared on unmount / conversation change / effect cleanup                                                              | ✅     |
| Successful `"send"` discards after `chatSendMessage` succeeds                                                                     | ✅     |
| `"queue"` path does not discard (early return before send/discard)                                                                | ✅     |
| Failed send restores local draft (`setDraft(content)`); no discard                                                                | ✅     |
| Drained queue send uses `sendMessage({ text })` with `isStreaming === false` → `"send"` → discard on success                      | ✅     |
| `serverDraftOffer` computed in hook via `shouldOfferComposerDraftRestore`                                                         | ✅     |
| `onRestoreServerDraft` → `setDraft(serverDraft.text)`; no auto-restore                                                            | ✅     |
| `onDiscardServerDraft` → discard mutation + invalidate                                                                            | ✅     |
| `DraftRestore` in `workspace-agent-thread-composer-view.tsx` above `MessageQueue`, props wired through `workspace-agent-view.tsx` | ✅     |
| `DraftRestore` not mounted in `chat-panel-view.tsx`                                                                               | ✅     |
| `draft-restore.tsx` not restyled (no diff)                                                                                        | ✅     |
| Composer view props-only — no oRPC, stores, or query hooks                                                                        | ✅     |
| No draft `localStorage` (Zustand `draft` in-memory only)                                                                          | ✅     |
| UTF-8 preserved in `use-workspace-agent.ts` (existing `·` / `—` literals unchanged)                                               | ✅     |
| No Task 5 `@` / `/` trigger work in diff                                                                                          | ✅     |
| Conventional commit `feat: restore unsent Orch drafts from the server`                                                            | ✅     |
| Co-located `bun:test` only (no component render tests)                                                                            | ✅     |

---

## Strengths

1. **Brief-faithful helpers** — `composer-draft-display.ts` and tests match the task brief verbatim; reviewer run: `2 pass, 0 fail`.
2. **Golden layer discipline** — Draft I/O lives in data hook + orchestration hook; composer view only receives props and mounts `DraftRestore` with the brief’s className and handlers.
3. **Correct empty-debounce guard** — The critical “do not discard on empty debounce” rule is implemented explicitly; empty composer + server text is preserved for the chip.
4. **Send / queue / fail matrix** — Discard is tied to successful `"send"` only; queue and failed-send paths behave as specified; queue drain reuses `sendMessage` so post-drain success still discards.
5. **Query key alignment** — `draft.get` input shape (`{}` vs `{ conversationId }`) is consistent between the data hook query and `invalidateComposerDraftQuery`.
6. **Non-blocking autosave** — Upsert/discard failures on the send path are swallowed so a successful turn is not blocked by draft cleanup.

---

## Issues

### Critical

_None._

Empty-debounce does not discard. Views do not call oRPC. Core restore offer, autosave, and send-discard wiring are present.

### Important

1. **Restore chip can appear during an in-flight send** — `sendMessage` clears the live draft (`setDraft("")`) before `await chatSendMessage`, while server discard runs only after the stream call succeeds. Until discard + invalidate complete, `serverDraftOffer` is true (live empty, server text still present). The `DraftRestore` chip can show for the text the user just sent—including throughout `isStreaming`—and `onRestoreServerDraft` can refill the composer mid-turn. Brief does not require suppressing the offer during streaming, but this contradicts the product intent (restore unsent work, not resurrect a message already submitted). Suppress offer when `isStreaming` / `submitted`, or optimistically clear `serverDraft` on send start, or discard before awaiting the stream.

### Minor

1. **`composerDraftQueryOptions` exported but unused** — Returned from `use-workspace-agent-data` but `use-workspace-agent` invalidates via `orpc.agent.conversations.draft.get.queryKey` directly. Dead surface; use the shared options object or stop exporting it.
2. **No authenticated browser E2E check** — Implementer report notes manual save/restore was not exercised in this environment. Unit tests cover pure helpers only; hook timing (debounce, send-discard, chip visibility) has no automated coverage.

---

## Notes

### Acceptable deviations

- **`formatComposerDraftSavedAt` in the view** — Brief JSX snippet calls the formatter in `workspace-agent-thread-composer-view.tsx`; acceptable display helper import (not oRPC/query/store).
- **Inherited Task 3 upsert race** — Concurrent first upserts can still hit the unique index (Task 3 review Important #2). Debounced saves make that more likely but the defect predates this task; not a Task 4 spec miss.
- **Queue + chip coexistence** — Brief allows server draft to remain while messages are queued; chip may show alongside `MessageQueue` until a successful send discards. Intentional per brief.

### Verified by reviewer

```
bun test apps/web/src/features/workspace-agent/composer-draft-display.test.ts
→ 2 pass, 0 fail
```

```
git diff 0c0e318c a5711e7d --stat
→ 6 files, +171 (no draft-restore.tsx change)
```

### Task 5 readiness

No `@` / `/` trigger or attachment-restore scope leakage in this diff. Task 5 can proceed after addressing Important #1 if chip behavior during send is considered blocking for UX polish.

---

## Task quality

**Issues found**

Task 4 deliverables match the brief and layer rules. No Critical spec violations. One Important UX/timing gap: the restore chip can surface during an active send until post-success discard. Two Minor nits (unused export, no E2E). Core autosave, restore offer, and send-discard logic are otherwise correct and ready with the in-flight chip suppression fix.
