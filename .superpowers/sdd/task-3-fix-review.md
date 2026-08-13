# Task 3 Re-Review — Composer draft Important fixes

**BASE:** `b1bbaa8f`
**HEAD:** `675696af`
**Verdict:** Spec ✅ · Task quality **Approved**

---

## Fix verification

| Important item | Status | Evidence |
| --- | --- | --- |
| **#1** `draft.*` handlers wrap with `toInternalServerError` like siblings; `ORPCError` / `NOT_FOUND` still reach client | ✅ Fixed | `router.ts` — `draft.get`, `draft.upsert`, and `draft.discard` each use `try/catch` with `toInternalServerError("agent.conversations.draft.*", error, { conversationId })`, matching `conversations.list` / `get` / `rename` / `delete`. `toInternalServerError` (`dev-errors.ts`) returns `ORPCError` unchanged; handlers `throw` the result, so `NOT_FOUND` from ownership checks is not swallowed. |
| **#2** Insert unique-violation (`23505`, nested `cause`) retries as update; no `onConflictDoUpdate` on coalesce expression index | ✅ Fixed | `composer-draft.ts` — `isComposerDraftUniqueViolation` walks `cause` up to 4 levels for `code === "23505"` (same pattern as `agency-ops/tasks/service.ts`). `composer-draft-service.ts` — insert path catches unique violations and falls back to `update` via `conversationFilter`; existing-row update path unchanged. No `onConflictDoUpdate` anywhere under `routers/agent/`. Unit test covers direct and nested `23505`. |
| **#3** `get` / `upsert` / `discard` assert conversation ownership when `conversationId` present; new-chat drafts skip | ✅ Fixed | `composer-draft-service.ts` — private `assertConversationOwnership` queries `dashboardConversation` with `id`, `userId`, and `archivedAt IS NULL`; throws `ORPCError("NOT_FOUND", { message: "Conversation not found." })` when missing. Called at start of `getComposerDraft`, `upsertComposerDraft`, and `discardComposerDraft`. Skipped when `composerDraftKey(conversationId)` is empty (new-chat drafts). Matches `getConversationRecord` in `service.ts` without exporting that helper. |

---

## Spec

**Still ✅**

Original Task 3 deliverables (schema, migration, pure helpers, service API, thin router handlers, co-located unit tests, golden layers) remain intact. Fix commit touches only the four files scoped in the fix brief; no plan, web, or unrelated changes.

---

## Issues

### Critical

_None._

### Important

_None._ All three Important findings from `task-3-review.md` are resolved in HEAD.

### Minor

1. **Redundant ownership queries on upsert** — `upsertComposerDraft` calls `assertConversationOwnership` directly, then `getComposerDraft` twice (pre-check and return), each re-asserting ownership. Correct; extra DB round-trips only.
2. **Empty upsert still persists a row** — Unchanged from original Task 3 review Minor #1; out of fix scope.
3. **Extra read on upsert** — `getComposerDraft` before and after write (three queries on update path). Pre-existing from Task 3 brief; unchanged.
4. **Service input not tied to Zod infer** — `upsertComposerDraft` still uses an inline input type instead of `z.infer<typeof composerDraftUpsertInputSchema>`. Pre-existing nit; unchanged.
5. **No integration tests** — Ownership and race-retry behavior are not covered by live Postgres tests. Fix brief allows pure-helper tests only; acceptable for this slice.

---

## Verified by reviewer

```
bun test ./packages/api/src/routers/agent/composer-draft.test.ts
→ 3 pass, 0 fail
```

Commit `675696af` matches fix report: four files, message `fix: harden Orch composer draft upsert and ownership`.

---

## Task quality

**Approved**

All three Important items (#1–#3) are substantively fixed in code, aligned with sibling patterns, and covered by passing unit tests for the new pure helper. Residual nits are Minor and do not block Task 4 client wiring.
