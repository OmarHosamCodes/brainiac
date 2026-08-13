# Task 3 Fix Report — Important review findings

**Branch:** `omarhosamcodes/cloud-agent-1786657271032-f0r08`  
**Commit:** `675696af`  
**Date:** 2026-08-13

## Summary

Addressed all three Important findings from `task-3-review.md`. No Task 4 UI work. No plan or unrelated file changes.

## Fixes applied

### Important #1 — `toInternalServerError` on draft handlers

**File:** `packages/api/src/routers/agent/router.ts`

Wrapped `draft.get`, `draft.upsert`, and `draft.discard` in `try/catch` with `toInternalServerError`, matching sibling `conversations.list` / `get` / `rename` / `delete` handlers. Context includes `conversationId` where available.

`toInternalServerError` rethrows `ORPCError` unchanged, so `NOT_FOUND` from ownership checks still reaches the client.

### Important #2 — Upsert TOCTOU race

**Files:** `packages/api/src/routers/agent/composer-draft.ts`, `composer-draft-service.ts`

Added `isComposerDraftUniqueViolation` (walks `cause` up to 4 levels for Postgres `23505`), exported from `composer-draft.ts` for unit testing.

`upsertComposerDraft` insert path now catches unique violations and falls back to `update` via `conversationFilter`, then returns `getComposerDraft(...)`. Existing-row update path unchanged. Did not use Drizzle `onConflictDoUpdate` — expression unique index on `coalesce(conversation_id, '')` is SQL-only.

### Important #3 — Conversation ownership

**File:** `packages/api/src/routers/agent/composer-draft-service.ts`

Added private `assertConversationOwnership(actorUserId, conversationId)` duplicating the `getConversationRecord` query pattern from `service.ts` (not exported). Queries `dashboardConversation` with `id`, `userId`, and `archivedAt IS NULL`. Throws `ORPCError("NOT_FOUND", { message: "Conversation not found." })` when missing.

Called at the start of `getComposerDraft`, `upsertComposerDraft`, and `discardComposerDraft`. Skipped when `composerDraftKey(conversationId)` is empty (new-chat drafts).

## Tests

```
bun test ./packages/api/src/routers/agent/composer-draft.test.ts
→ 3 pass, 0 fail
```

Added `isComposerDraftUniqueViolation` tests per brief. No live Postgres tests.

## Files changed

| File | Change |
| --- | --- |
| `packages/api/src/routers/agent/router.ts` | Error wrapping on draft handlers |
| `packages/api/src/routers/agent/composer-draft-service.ts` | Ownership assert, unique-violation retry |
| `packages/api/src/routers/agent/composer-draft.ts` | `isComposerDraftUniqueViolation` helper |
| `packages/api/src/routers/agent/composer-draft.test.ts` | Unique violation unit test |

## Notes / residual concerns

- `upsertComposerDraft` may call `assertConversationOwnership` up to three times per request (direct + two `getComposerDraft` calls). Acceptable for correctness; minor extra queries.
- Empty upsert still persists a row (Minor #1 from review — unchanged, out of scope).
- No integration tests for ownership or race retry (brief allows pure-helper tests only).

## Status

**DONE** — All three Important items fixed, tests pass, committed and pushed.
