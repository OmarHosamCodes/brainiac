# Task 3 Review — Server-side composer draft persistence

**Reviewer:** task reviewer  
**BASE:** `bbcdd812`  
**HEAD:** `b1bbaa8f`  
**Verdict:** Spec ✅ · Task quality **Issues found**

---

## Spec ✅/❌

**Spec ✅**

| Requirement | Status |
| --- | --- |
| `dashboardComposerDraft` in `packages/db/src/schema/workspace.ts` after `dashboardConversationMessage` | ✅ |
| Migration `0051_dashboard_composer_draft.sql` with table, user index, `coalesce` unique index | ✅ |
| Journal entry for 0051 in `meta/_journal.json` | ✅ |
| `composer-draft.ts` — normalize, key, Zod schemas, `@orch/agent/types` attachment schema | ✅ |
| `composer-draft.test.ts` — trim/cap and `composerDraftKey` tests per brief | ✅ |
| `composer-draft-service.ts` — `getComposerDraft`, `upsertComposerDraft`, `discardComposerDraft` with `(actorUserId, input)` | ✅ |
| `conversations.draft.{get, upsert, discard}` thin `protectedProcedure` handlers | ✅ |
| Actor from `context.session.user.id` | ✅ |
| `conversationId` optional → new-chat draft (`NULL` row); unique on `(user_id, coalesce(conversation_id, ''))` | ✅ |
| Reuses `DashboardConversationMessageAttachmentRecord` JSON shape | ✅ |
| No Drizzle unique index for `coalesce` (SQL only) | ✅ |
| Conventional commit `feat: persist Orch composer drafts on the server` | ✅ |
| Co-located `bun:test` unit tests (no render tests) | ✅ |
| `dashboardComposerDraft` exported via `@orch/db/schema` (`export * from "./workspace"`) | ✅ |
| Global constraints — golden layers, Postgres not localStorage, Bun only | ✅ |

**Documented deviation (acceptable per brief/repo pattern):**

| Item | Status |
| --- | --- |
| `meta/0051_snapshot.json` via `db:generate` | ⚠️ Not produced — `db:generate` blocked (non-TTY / drift prompts). Repo snapshots stop at `0024`; migrations `0025`–`0050` are hand-SQL + journal only. Brief allows keeping hand-written `0051` SQL when generate misbehaves. **Not a spec fail.** |

---

## Strengths

1. **Faithful to brief** — Schemas, migration SQL, service logic, and router shape match the task brief verbatim (including intentional omissions like `toInternalServerError`).
2. **Golden layer discipline** — Router stays thin (`protectedProcedure` → service → Zod `.parse()`); no DB imports in `router.ts`; actor identity from session only.
3. **Correct null-key semantics** — `conversationFilter` uses `isNull(conversationId)` for the new-chat draft; `composerDraftKey` maps `null`/missing to `""` then `NULL` on insert.
4. **Unique index done right** — Expression unique index lives only in SQL migration, not forced into Drizzle where Postgres cannot express `coalesce`.
5. **Type hygiene** — Service uses `AgentTextAttachment[]` from `@orch/agent/types` (better than brief’s loose inline attachment type); `check-types` passes across the monorepo.
6. **TDD traceability** — Required normalize/key tests exist and pass (`2 pass, 0 fail` verified by reviewer).
7. **Schema export** — New table is reachable from `@orch/db/schema` for Task 4 client hooks.

---

## Issues

### Critical

_None._

No wrong actor identity, no DB in router, no broken unique-index SQL, no cross-user data exposure, and core API surface (`get` / `upsert` / `discard`) is present.

### Important

1. **`draft.*` handlers omit `toInternalServerError`** — Sibling `conversations.list` / `get` / `rename` / `delete` in the same router wrap service calls in `try/catch` and throw `toInternalServerError("agent.conversations.*", error, …)`. `draft.get`, `draft.upsert`, and `draft.discard` do not. Brief snippet matches this omission, but within `conversations` it is inconsistent: DB failures (FK violation on bad `conversationId`), Zod parse failures on corrupt JSONB, and unique-index violations will surface without the structured logging/context those siblings get.

2. **Upsert TOCTOU race on first save** — `upsertComposerDraft` does read-then-insert/update without `ON CONFLICT` or `23505` retry. Two concurrent first upserts for the same `(userId, conversationId)` both see `existing.draft === null`, both `INSERT`, and the loser hits `dashboard_composer_draft_user_conversation_uidx`. Other services in this repo (e.g. notifications, tenure, clients) use `onConflictDoUpdate` or explicit `23505` handling. Debounced composer saves in Task 4 are a plausible trigger. Coalesce expression index makes a naive Drizzle `onConflictDoUpdate` awkward, but catch-and-retry-update (or raw SQL upsert) is still warranted before client wiring.

3. **No conversation ownership check when `conversationId` is provided** — Sibling conversation mutations call `getConversationRecord(actorUserId, conversationId)` before writes. Draft upsert only relies on FK existence: a valid but foreign `conversationId` inserts a row scoped to the actor (no leak), while a non-existent `conversationId` yields a raw Postgres FK error. Aligning with `getConversationRecord` would give consistent `NOT_FOUND` errors and prevent orphan draft rows tied to conversations the actor does not own.

### Minor

1. **Empty upsert still persists a row** — `text: ""` with `attachments: []` creates/updates a DB row. Brief does not require discard-on-empty; Task 4 may want client-side discard or server auto-delete. Documented in implementer report.
2. **Extra read on upsert** — `getComposerDraft` runs before and after write (three queries on update path). Matches brief; minor latency cost for debounced saves.
3. **Service input not tied to Zod infer** — `upsertComposerDraft` uses an inline input type instead of `z.infer<typeof composerDraftUpsertInputSchema>`. Brief did the same; small maintainability nit.

---

## Notes

### Acceptable deviations

- **No `0051_snapshot.json`:** Brief requires generate when repo workflow needs it, but explicitly permits keeping hand-written `0051` SQL if generate rewrites or fails. Current repo pattern (`0025`–`0050` hand-SQL, snapshots only through `0024`) supports this choice. Not Critical or blocking.
- **`toInternalServerError` omission matches brief verbatim:** Flagged as Important for consistency with adjacent handlers, not as a spec miss.
- **No integration / service CRUD tests:** Brief only mandates pure-helper unit tests. Acceptable for this task slice; Task 4 is first E2E exercise.
- **`db:push` not run in report:** Environment TUI limitation; migration SQL is reviewable and journal entry is present.

### Verified by reviewer

```
bun test ./packages/api/src/routers/agent/composer-draft.test.ts
→ 2 pass, 0 fail

bun run check-types
→ 8/8 packages successful
```

### Task 4 readiness

API procedures and schema export are sufficient for Task 4 wiring. Address Important #2 (upsert race) and ideally #1 (error wrapping) and #3 (conversation validation) before or during Task 4 to avoid flaky debounced saves and inconsistent error surfaces.

---

## Task quality

**Issues found**

Core Task 3 deliverables match the brief and layer rules. No Critical defects. Three Important gaps remain: error wrapping inconsistency with sibling `conversations.*` handlers, a real concurrent-first-upsert race against the unique index, and missing conversation ownership validation. These should be fixed before or early in Task 4 client integration; they are not grounds to reject the schema/API surface itself.
