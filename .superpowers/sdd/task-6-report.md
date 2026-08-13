# Task 6 report — Composer trigger popover

## Status

**Complete.** Hook wires `@`/`/` trigger detection to scope chips; composer view shows a popover with suggestions; Enter picks first, Escape dismisses without stripping token.

## What changed

### `use-workspace-agent.ts`

- `composerTrigger = getActiveWorkspaceAgentTrigger(draft)`
- `@` suggestions via `getWorkspaceAgentMentionSuggestions` on **both** Agency and Canvas (removed canvas-only gate)
- `/` suggestions when `teamId` is set: `useAgencyProjectsQuery` + `useAgencyProjectTasksQuery` → `getWorkspaceAgentSlashSuggestions`
- Unified `WorkspaceAgentComposerTriggerSuggestion` type and `composerTriggerSuggestions`
- `composerTriggerDismissed` local state; reset when trigger `kind`/`query`/`start` changes
- `composerTriggerOpen = Boolean(trigger) && suggestions.length > 0 && !dismissed`
- `onPickComposerTrigger`: `addScopeChip`, `stripActiveWorkspaceAgentTrigger`, `markScopeHintSeen`
- `onDismissComposerTrigger`: sets dismissed (keeps `@`/`/` token in draft)
- `mentionSuggestions` / `addMentionedNode` kept for compatibility; `@` no longer canvas-only

### `workspace-agent-thread-composer-view.tsx`

- Popover anchored to composer (`data-workspace-agent-overlay`, same feel as plus menu)
- Rows: `@` → node title; `/` → `project · {name}` / `task · {title}` (exhaustive switch on kind)
- Enter (capture) picks first suggestion; Escape dismisses popover
- `onSendWhileRunning` wrapped to pick first suggestion when popover open
- Draft bridge syncs assistant-ui composer input ↔ Zustand `draft` for trigger detection

### `workspace-agent-composer-trigger-controls.tsx` (new)

- `ComposerDraftBridge`, `ComposerTriggerKeyboard`, `suggestionRowLabel` — hooks live outside `*-view.tsx` per golden rules

### `workspace-agent-view.tsx`

- Passes new composer props from view model

## Tests

```
bun test apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts
```

5 pass, 0 fail (Task 5 slash ranking tests unchanged).

```
bun run check-types
```

Pass.

```
bun run check
```

Pass (including golden-view after moving hook components out of view).

## Commit

`472d8ff8` — `feat: insert Orch scope chips from @ and / suggestions`

## Concerns

- Draft sync bridge is new (composer input ↔ store); required for trigger detection but was not explicitly in Task 5. Watch for edge-case loops on restore/pick/send.
- Popover uses `PopoverAnchor` without a trigger; positioning may need tuning on small screens.
- `/` project list loads whenever `teamId` is set (not gated to slash-only); acceptable for warm cache but adds query work on Agency pages.
- Manual browser verification of popover UX not run in this session (no authenticated dev environment).
