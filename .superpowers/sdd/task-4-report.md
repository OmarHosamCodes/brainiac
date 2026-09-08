# Task 4 report: Bills chrome restack

**Branch:** `feat/bills-tables`
**Commit:** `e7817511` (`feat: restack bills chrome with tabs and status select`)

## Summary

- Replaced party filter pills with controlled shadcn Tabs for All, Clients, Team, Adjustments, and Expenses, with horizontal overflow on narrow screens.
- Replaced bill status pills with an accessible shadcn Select beside search. Selecting a status now sets it; All statuses clears it.
- Compacted Remaining / Period spend and insight into one quiet summary row while preserving the insight live region.
- Preserved search, count / All expenses, Add menu, FX line, the scoped External chip, and the existing expense Due / Paid / All pills.
- Left bill tables, bill detail sheet internals, and the expense strip body unchanged.

## Verification

- `bunx oxfmt --write` on both touched files: pass
- `bunx oxlint` on both touched files: pass
- `bun test apps/web/src/features/billing/money-bills-filters.test.ts`: 20 pass, 0 fail
- `bun run check-types`: pass
- Browser: verified named party tabs, labeled status combobox, Expenses hiding status, All expenses remaining available, and expense strip pills remaining intact.
- `bun run check:conventions`: blocked by 8 pre-existing violations in task-management, workspace-agent, and workspace-knowledge files; no violation references either touched file.

## Concerns

No Task 4 blocker. The unrelated `.superpowers/sdd/progress.md` and `docs/superpowers/plans/2026-08-29-bills-tables.md` worktree changes were not committed.

---

# Task 4 report — DraftRestore chip in the composer

**Branch:** `omarhosamcodes/cloud-agent-1786657271032-f0r08`  
**Commit:** `a5711e7d` — `feat: restore unsent Orch drafts from the server`  
**Plan:** `docs/superpowers/plans/2026-08-14-orch-composer-reliability.md`

## Summary

Implemented server-backed composer draft restore UX for Orch:

- **`composer-draft-display.ts`** — pure helpers `shouldOfferComposerDraftRestore` and `formatComposerDraftSavedAt`
- **`use-workspace-agent-data.ts`** — `draft.get` query plus `draft.upsert` / `draft.discard` mutations
- **`use-workspace-agent.ts`** — debounced upsert (500ms), discard after successful `"send"`, restore/discard handlers, `serverDraftOffer` computed in hook
- **`workspace-agent-thread-composer-view.tsx`** — `DraftRestore` chip above `MessageQueue` (props-only)
- **`workspace-agent-view.tsx`** — passes new composer props from view model

## TDD

1. Added failing `composer-draft-display.test.ts` (module not found)
2. Implemented `composer-draft-display.ts`
3. Wired hook + view
4. Tests pass

## Behavior

| Scenario                          | Behavior                                            |
| --------------------------------- | --------------------------------------------------- |
| Live draft non-empty              | Debounced upsert to server (500ms); no restore chip |
| Live draft empty, server has text | `DraftRestore` chip shown                           |
| User clicks Restore               | `setDraft(serverDraft.text)`; chip hides            |
| User clicks Discard on chip       | `draft.discard` + invalidate query                  |
| Successful send (`"send"`)        | `draft.discard` + invalidate query                  |
| Queue while streaming (`"queue"`) | No discard; server draft can remain                 |
| Send fails                        | Draft restored locally; no discard                  |
| Empty live draft debounce         | **No** discard — preserves restore offer            |

## Files changed

| File                                       | Change                                |
| ------------------------------------------ | ------------------------------------- |
| `composer-draft-display.ts`                | **Created**                           |
| `composer-draft-display.test.ts`           | **Created**                           |
| `hooks/use-workspace-agent-data.ts`        | Draft query + mutations               |
| `hooks/use-workspace-agent.ts`             | Autosave, restore offer, send discard |
| `workspace-agent-thread-composer-view.tsx` | `DraftRestore` UI                     |
| `workspace-agent-view.tsx`                 | Prop wiring                           |

## Tests run

```bash
bun test apps/web/src/features/workspace-agent/composer-draft-display.test.ts
# 2 pass, 0 fail

bun run check-types   # pass
bun run check         # pass
bun run check:conventions  # pass
```

## Golden layer compliance

- Composer view remains props-only (no oRPC/query/store imports)
- Draft logic lives in hook + data hook
- `DraftRestore` component unchanged (no restyle)

## Out of scope (per brief)

- Task 5 (`@` / `/` triggers)
- API/DB changes
- Attachment restore UI
- `chat-panel-view.tsx` mount

## Concerns

None blocking. Manual browser verification of end-to-end draft save/restore was not performed in this run (no authenticated dev session in agent environment); logic follows Task 3 API contracts and brief exactly.
