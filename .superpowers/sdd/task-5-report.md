# Task 5 report — `@` and `/` trigger parser

## Status

**Complete.** Parser-only changes in `workspace-agent-mentions.ts` plus co-located tests. No hook, view, plan, or API edits.

## What changed

- Added `getActiveWorkspaceAgentTrigger` with shared regex for `@` and `/` at end-of-draft (after whitespace or open punctuation).
- Refactored `getActiveWorkspaceAgentMention` and `stripActiveWorkspaceAgentMention` as thin wrappers (`at` only / delegate to trigger strip).
- Added `stripActiveWorkspaceAgentTrigger` for generic trigger removal.
- Added `getWorkspaceAgentSlashSuggestions` for Agency project/task label substring matching with selected-id filtering.
- Preserved `getWorkspaceAgentMentionSuggestions` and scoring helpers unchanged.

## Tests

```
bun test apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts
```

5 pass, 0 fail — `@` detection, `/` detection, closed trigger null, strip trigger, slash suggestions (substring + skip selected).

## Verification

- `bun run check-types` — pass
- `use-workspace-agent.ts` compiles unchanged (wrappers preserved)

## Concerns

- Slash suggestions use simple `includes` substring match (no scoring/ranking like node mentions); Task 6 popover wiring may want richer ordering later.
- Trigger regex treats `@` and `/` only when preceded by start-of-string or `[\s([{:;,]` — edge cases with other punctuation are unchanged from plan spec.
