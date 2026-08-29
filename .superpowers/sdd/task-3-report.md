# Task 3 Report: Detail sheet

Status: DONE_WITH_CONCERNS

## Commit

- `5c975a7b feat: add bills row detail sheet`

## Delivered

- Added a right-side bills detail sheet for client/member groups, adjustments, and salary pool.
- Added current-then-prior line ledger rendering, status and remaining summaries, and existing preview/settlement/payment/dismiss handler wiring.
- Added hook-owned detail selection that resolves against current rows and closes when its target disappears.
- Added selected-row and salary-footer highlighting with `aria-selected`.
- Added the new presentational view to the golden source inventory.

## Verification

- `bun test apps/web/src/features/billing/money-bills-table-columns.test.ts`: 11 passed.
- `bun run check-types`: passed across all 8 tasks.
- Targeted `oxfmt` and `oxlint` on touched source files: passed.
- `bun run check:golden`: passed, 1427 artifacts across 28 domains.
- Browser verification on the authenticated Money page: row selection opened the 512px sheet, ledger and footer rendered, and Preview invoice opened the existing preview/export dialog.

## Concerns

- `bun run check` and `bun run check:conventions` remain blocked by 8 pre-existing convention violations in task-management, workspace-agent, and workspace-knowledge files outside this task.
- The available period had client rows but no adjustment or salary-pool rows, so those two variants were verified by types and source review rather than live data.
- Existing `.superpowers/sdd/progress.md` and `docs/superpowers/plans/2026-08-29-bills-tables.md` changes were left uncommitted.

## Review fix

Status: DONE

Commit: `fix: close salary-pool sheet when party filter hides it`

### Changes

- Close `{ kind: "salary-pool" }` unless `moneyBillsSalaryPoolDetailVisible(party, hasPool)` — pool exists and party is `"all"` or `"team"` (not `client` / `adjustments` / `expenses`). Cached `salaryPoolQuery.data?.pool` plus `showsExpenses` was leaving the sheet open on Clients/Team-leave/Adjustments.
- AdjustmentDetail footer: Dismiss uses the primary (default) button when it is the only action (`canDismiss` and not `canRecordPayment` and not `canMarkPaid`). Record payment stays primary when `canRecordPayment` is true.

### Covering tests

```
bun test apps/web/src/features/billing/money-bills-filters.test.ts
```

```
bun test v1.3.14 (0d9b296a)

apps/web/src/features/billing/money-bills-filters.test.ts:
(pass) Money bill URL filters > accepts known values and falls back safely [1.49ms]
(pass) moneyBillsStatusOptionsForParty > all exposes paid first so collected client money can be isolated [0.23ms]
(pass) moneyBillsStatusOptionsForParty > clients statuses in product order [0.06ms]
(pass) moneyBillsStatusOptionsForParty > team and adjustments share status chips [0.06ms]
(pass) moneyBillsStatusOptionsForParty > expenses has no status chips [0.02ms]
(pass) moneyBillsStatusOptionsForParty > refunded only allowed on clients [0.08ms]
(pass) moneyBillsEmptyCopy > default all + no status [0.21ms]
(pass) moneyBillsEmptyCopy > party only [0.06ms]
(pass) moneyBillsEmptyCopy > party + status [0.04ms]
(pass) moneyBillsEmptyCopy > search overrides filter title [0.05ms]
(pass) moneyBillsEmptyCopy > external client filter explains how to include internal clients [0.04ms]
(pass) moneyBillsEmptyCopy > default copy does not mention expenses [0.02ms]
(pass) moneyBillsSalaryPoolDetailVisible > all + pool [0.03ms]
(pass) moneyBillsSalaryPoolDetailVisible > team + pool [0.01ms]
(pass) moneyBillsSalaryPoolDetailVisible > client + pool [0.01ms]
(pass) moneyBillsSalaryPoolDetailVisible > adjustments + pool [0.01ms]
(pass) moneyBillsSalaryPoolDetailVisible > expenses + pool [0.02ms]
(pass) moneyBillsSalaryPoolDetailVisible > all + no pool [0.01ms]
(pass) moneyBillsActiveFilterSummary > hides when all and no status [0.23ms]
(pass) moneyBillsActiveFilterSummary > composes party and status [0.06ms]

 20 pass
 0 fail
 38 expect() calls
Ran 20 tests across 1 file. [54.00ms]
```

```
bun test apps/web/src/features/billing/money-bills-table-columns.test.ts
```

```
bun test v1.3.14 (0d9b296a)

apps/web/src/features/billing/money-bills-table-columns.test.ts:
(pass) moneyBillGroupCarryCount > counts carry lines only [7.56ms]
(pass) moneyBillGroupCarryCount > returns zero when no carry lines [0.47ms]
(pass) moneyBillGroupPeriodLabel > formats a single non-carry period [1.10ms]
(pass) moneyBillGroupPeriodLabel > ignores carry periods when non-carry lines share one range [0.96ms]
(pass) moneyBillGroupPeriodLabel > returns Mixed when non-carry lines span multiple periods [0.60ms]
(pass) moneyBillGroupPeriodLabel > falls back to carry lines when no non-carry lines exist [0.52ms]
(pass) moneyBillGroupPeriodLabel > returns Mixed for carry-only lines with multiple periods [0.55ms]
(pass) moneyBillGroupPeriodLabel > returns empty string when lines are empty [0.03ms]
(pass) moneyBillTableShowsWaste > returns false for empty rows [0.07ms]
(pass) moneyBillTableShowsWaste > returns false when all waste amounts are zero [0.03ms]
(pass) moneyBillTableShowsWaste > returns true when any waste amount is positive [0.01ms]

 11 pass
 0 fail
 18 expect() calls
Ran 11 tests across 1 file. [42.00ms]
```

```
bun run check-types
```

```
$ turbo check-types
• turbo 2.10.2

   • Packages in scope: @orch/agent, @orch/api, @orch/auth, @orch/config, @orch/db, @orch/env, @orch/workspace, server, web
   • Running check-types in 9 packages
   • Remote caching disabled, using shared worktree cache

web:check-types: cache miss, executing a5421f9c21da8e3b
web:check-types: $ tsc -b --noEmit

 Tasks:    8 successful, 8 total
Cached:    7 cached, 8 total
  Time:    24.884s
```

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
