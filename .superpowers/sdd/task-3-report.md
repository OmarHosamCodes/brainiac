# Task 3 Report — Server-side composer draft persistence

**Branch:** `omarhosamcodes/cloud-agent-1786657271032-f0r08`  
**Commit:** `b1bbaa8f`  
**Status:** DONE

## Summary

Task 3 adds Postgres-backed persistence for unsent Orch composer drafts, keyed by user and conversation (`conversationId: null` = new-chat draft). Exposes `agent.conversations.draft.get`, `upsert`, and `discard` oRPC endpoints. No UI (Task 4). No localStorage.

## TDD steps executed

### Step 1 — Failing test

Created `packages/api/src/routers/agent/composer-draft.test.ts` with:

- `normalizeComposerDraftText` — trims whitespace and caps at 20,000 characters
- `composerDraftKey` — maps `null` to `""` for the new-chat draft key

### Step 2 — Verify failure

```
bun test ./packages/api/src/routers/agent/composer-draft.test.ts
```

Result: **FAIL** — `Cannot find module './composer-draft'`

### Step 3 — Implementation

**`packages/api/src/routers/agent/composer-draft.ts`**

- `COMPOSER_DRAFT_TEXT_MAX = 20_000`
- `normalizeComposerDraftText`, `composerDraftKey`
- Zod schemas: `composerDraftConversationInputSchema`, `composerDraftUpsertInputSchema`, `composerDraftRecordSchema`
- Imports `agentTextAttachmentSchema` from `@orch/agent/types`

**`packages/db/src/schema/workspace.ts`**

- Added `dashboardComposerDraft` table after `dashboardConversationMessage`
- User index only in Drizzle (no unique index — Postgres `coalesce` lives in SQL migration)

**`packages/db/src/migrations/0051_dashboard_composer_draft.sql`**

- Creates `dashboard_composer_draft` table
- `CREATE UNIQUE INDEX ... ON (user_id, coalesce(conversation_id, ''))` per brief

**`packages/db/src/migrations/meta/_journal.json`**

- Added entry `0051_dashboard_composer_draft` (idx 51)

**`packages/api/src/routers/agent/composer-draft-service.ts`**

- `getComposerDraft(actorUserId, { conversationId? })` — returns `{ draft: null }` or parsed record
- `upsertComposerDraft` — insert or update by user + conversation filter
- `discardComposerDraft` — delete matching row
- Uses `createWorkspaceId("draft")` for new rows
- `conversationFilter` uses `isNull(conversationId)` when key is `""`

**`packages/api/src/routers/agent/router.ts`**

- Added `conversations.draft.{ get, upsert, discard }` thin handlers under `conversations`
- `protectedProcedure` → service → Zod `.parse()` output

**Type fix (post-brief):** Service `attachments` parameter typed as `AgentTextAttachment[]` from `@orch/agent/types` so Drizzle insert/update accepts `DashboardConversationMessageAttachmentRecord[]`.

### Step 4 — Verify pass

```
bun test ./packages/api/src/routers/agent/composer-draft.test.ts
```

Result: **2 pass, 0 fail**

Additional validation:

```
bun run check-types   # 8/8 packages successful
bun run check         # ok
bun run check:conventions  # ok
```

### Step 5 — Commit

```
b1bbaa8f feat: persist Orch composer drafts on the server
```

## Files touched

| File | Change |
|------|--------|
| `packages/api/src/routers/agent/composer-draft.test.ts` | New — normalize/key unit tests |
| `packages/api/src/routers/agent/composer-draft.ts` | New — schemas + pure helpers |
| `packages/api/src/routers/agent/composer-draft-service.ts` | New — get/upsert/discard |
| `packages/api/src/routers/agent/router.ts` | `conversations.draft.*` routes |
| `packages/db/src/schema/workspace.ts` | `dashboardComposerDraft` table |
| `packages/db/src/migrations/0051_dashboard_composer_draft.sql` | New migration + unique index |
| `packages/db/src/migrations/meta/_journal.json` | Journal entry for 0051 |

## API surface

| Procedure | Input | Output |
|-----------|-------|--------|
| `agent.conversations.draft.get` | `{ conversationId?: string }` | `{ draft: ComposerDraftRecord \| null }` |
| `agent.conversations.draft.upsert` | `{ conversationId?, text, attachments? }` | `{ draft: ComposerDraftRecord \| null }` |
| `agent.conversations.draft.discard` | `{ conversationId?: string }` | `{ discarded: true }` |

`ComposerDraftRecord`: `{ conversationId, text, attachments, savedAt }` (ISO datetime).

## Schema notes

- **Unique constraint:** `(user_id, coalesce(conversation_id, ''))` — one draft per user per conversation, including exactly one “new chat” row where `conversation_id IS NULL`.
- **Cascade:** Deleting user or conversation removes associated drafts.
- **Attachments:** Reuses `DashboardConversationMessageAttachmentRecord` JSON shape (max 6 via Zod on upsert).

## db:generate / snapshot

`bun run db:generate` could not complete in this environment:

1. Non-TTY shell → immediate failure on first run
2. With pseudo-TTY (`script`) → blocked on unrelated interactive prompts (e.g. `billable_rate_amount` column drift vs stale snapshots)

Repo pattern: snapshots in `meta/` only through `0024_snapshot.json`; migrations `0025`–`0050` are hand-written SQL + journal entries only. **No `0051_snapshot.json` was produced.** Hand-written `0051_dashboard_composer_draft.sql` retained with the `coalesce` unique index as specified.

`bun run db:push` also requires interactive TUI in this turbo setup — not run here.

## Out of scope (per brief)

- Task 4 DraftRestore chip / composer UI wiring
- localStorage draft persistence
- Integration tests against live Postgres

## Concerns / follow-ups

1. **Snapshot gap:** If CI or deploy expects Drizzle snapshots for every migration, someone with a TTY should run `db:generate` after resolving column-drift prompts, or continue the repo’s hand-SQL-only pattern.
2. **No integration tests:** Service CRUD is untested against Postgres; Task 4 client wiring will be first end-to-end exercise.
3. **Draft router error handling:** Unlike sibling `conversations.*` handlers, `draft.*` does not wrap service calls in `toInternalServerError` — matches brief verbatim; consider aligning with list/get/rename/delete if desired.
4. **Empty upsert:** Upserting `text: ""` with no attachments still creates/updates a row; Task 4 may want discard-on-empty client-side.
