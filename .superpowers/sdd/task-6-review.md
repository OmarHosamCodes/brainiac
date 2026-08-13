# Task 6 Review — Composer `@` / `/` trigger popover

**Reviewer:** task reviewer  
**BASE:** `feaed779`  
**HEAD:** `472d8ff8`  
**Verdict:** Spec ✅ · Task quality **Issues found**

---

## Spec ✅/❌

**Spec ✅** (with one behavioral risk below)

| Requirement                                                                                      | Status                                                          |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Hook: `composerTrigger = getActiveWorkspaceAgentTrigger(draft)`                                  | ✅                                                              |
| `@` suggestions on **both** Agency and Canvas (removed canvas-only gate)                         | ✅                                                              |
| `/` suggestions when `teamId` set: projects (`name`) + tasks (`title`)                           | ✅                                                              |
| `/` suggestions `[]` when `teamId` missing                                                       | ✅                                                              |
| `WorkspaceAgentComposerTriggerSuggestion` unified type                                           | ✅                                                              |
| `onPickComposerTrigger`: `addScopeChip`, `stripActiveWorkspaceAgentTrigger`, `markScopeHintSeen` | ✅                                                              |
| Pick does **not** enter sniper (`setScopeModeActive` not called)                                 | ✅                                                              |
| `composerTriggerDismissed`; reset on `kind` / `query` / `start` change                           | ✅                                                              |
| `composerTriggerOpen = Boolean(trigger) && suggestions.length > 0 && !dismissed`                 | ✅                                                              |
| Popover when open; `data-workspace-agent-overlay`; same menu primitive as plus menu              | ✅                                                              |
| `@` rows: node title (`suggestion.label`)                                                        | ✅                                                              |
| `/` rows: `project · {label}` / `task · {title}` with UTF-8 middle dot `·`                       | ✅                                                              |
| Enter picks first suggestion instead of send                                                     | ✅ (document capture listener + `handleSendWhileRunning` guard) |
| Escape dismisses without stripping token                                                         | ✅                                                              |
| Props passed through `workspace-agent-view.tsx`                                                  | ✅                                                              |
| Composer `*-view.tsx` has no direct oRPC / store / query hooks                                   | ✅                                                              |
| Task 5 slash ranking tests still pass                                                            | ✅ (reviewer: 5 pass, 0 fail)                                   |
| No Task 7 Continue work                                                                          | ✅ (no `workspace-agent-continue*` files)                       |
| Conventional commit `feat: insert Orch scope chips from @ and / suggestions`                     | ✅                                                              |
| `bun run check-types` (per report)                                                               | ✅                                                              |

---

## Strengths

1. **Brief-faithful hook wiring** — Trigger detection, unified suggestions, dismiss state, pick/dismiss handlers, and slash task query gating (`enabled: composerTrigger?.kind === "slash"`) match the plan.
2. **Golden-view compliance** — Hook calls (`unstable_useComposerInput`, effects) moved to `workspace-agent-composer-trigger-controls.tsx`; composer view stays props-only; `bun run check:conventions` passes.
3. **Keyboard contract** — `ComposerTriggerKeyboard` capture handler intercepts Enter/Escape before global shell handlers; pick path calls `markScopeHintSeen` and does not toggle sniper.
4. **Scope boundary** — Diff limited to workspace-agent composer files; parser tests unchanged and passing; no Task 7 leakage.

---

## Issues

### Critical

1. **`ComposerDraftBridge` pushes stale Zustand draft into the composer while the user is typing** — `workspace-agent-composer-trigger-controls.tsx` runs two effects: (1) composer `value` → `onDraftChange`, (2) whenever `value !== draft`, `setText(draft)`. On each keystroke, assistant-ui `value` advances immediately but the `draft` prop lags until the parent re-renders after effect 1’s `setDraft`. Effect 2 therefore calls `setText(draft)` with a stale store value on every in-flight keypress (e.g. `value="hello"`, `draft="hell"` → `setText("hell")`). The `syncingFromStore` ref only suppresses the reverse write in effect 1; it does not stop the stale push. This directly conflicts with the product rule that a focused composer must not stutter or lose edits from sync while typing. Required fix: one-way sync while focused (composer → store only), or guard store→composer pushes to explicit external events (restore, pick, send, conversation switch)—not bare `value !== draft` during user input.

### Important

_None beyond the Critical item (pick/strip and trigger detection both depend on the same bridge)._

### Minor

1. **Projects query always-on when `teamId` is set** — `useAgencyProjectsQuery(agencyTeamId)` is not gated to slash-active (tasks query is). Query is `enabled: Boolean(teamId)` so no fetch without team; adds warm-cache work on Agency pages. Acceptable per report; optional slash-only gate.
2. **Enter handling shape differs from brief snippet** — Brief shows wrapping `onSend` / `onSendWhileRunning` in the view. `ThreadComposer` has no `onSend` prop; implementation uses `handleSendWhileRunning` plus `ComposerTriggerKeyboard` document capture. Behavior matches intent; style deviation only.
3. **No manual browser verification** — Report notes popover UX untested in authenticated dev session. Automated tests cover parser only.

---

## Notes

### Acceptable deviations

- **New `workspace-agent-composer-trigger-controls.tsx`** — Not listed in brief Step 5 `git add`, but required to satisfy golden-view after draft/keyboard wiring; conventions pass.
- **`onPickComposerTrigger` resets `composerTriggerDismissed`** — Not in brief; reasonable so a pick can reopen on query change.
- **`mentionSuggestions` / `addMentionedNode` retained** — `@` no longer canvas-only; compatibility preserved.

### Verified by reviewer

```
bun test apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts
→ 5 pass, 0 fail
```

```
git diff feaed779 472d8ff8 --stat
→ 4 files, +407 / −137
```

```
bun run check:conventions
→ check-conventions: ok
```

### Draft sync context

Before Task 6, composer input lived in assistant-ui while trigger detection read Zustand `draft`; the bridge was added to unify them. The two-way effect pair is the right idea but the store→composer leg needs a focus/source guard to avoid fighting in-flight typing.

---

## Task quality

**Issues found**

Task 6 meets the spec surface area and tests, but the `ComposerDraftBridge` two-way sync is a **Critical** reliability defect against composer typing rules. Fix the bridge before treating Task 6 as production-ready.
