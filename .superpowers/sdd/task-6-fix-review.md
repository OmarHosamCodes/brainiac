# Task 6 Fix Re-Review — Critical #1 (ComposerDraftBridge clobbering typing)

**Reviewer:** task reviewer (re-review)  
**BASE:** `472d8ff8`  
**HEAD:** `729d3fef`  
**Verdict:** **Approve**

---

## Approval checklist

| Criterion | Result |
| --- | --- |
| `lastEmittedRef` pattern used | ✅ `useRef(draft)` tracks last reconciled string |
| Composer→store effect deps: `value` + `onDraftChange` only | ✅ `[onDraftChange, value]` — `draft` removed |
| Store→composer effect deps: `draft` + `setText` only, **not** `value` | ✅ `[draft, setText]` |
| Old `syncingFromStore` / `value !== draft` pair removed | ✅ Fully removed |
| Typing lag cannot push stale Zustand back into input | ✅ See analysis below |
| Restore / pick / send can still `setText` on external `draft` change | ✅ Effect 2 runs when `draft` changes and `draft !== lastEmittedRef` |

---

## Typing-lag analysis (strict)

**Root cause (pre-fix):** Effect 2 listed `value` in its dependency array and gated on `value === draft`. Each keystroke advanced `value` while the `draft` prop still held the previous character, so effect 2 re-ran and called `setText(draft)` with stale store text.

**Post-fix behavior:**

1. User keystroke → `value` updates → component re-renders.
2. Effect 1: `value !== lastEmittedRef` → update ref, `onDraftChange(value)`.
3. Effect 2 **does not run** — `draft` and `setText` are unchanged in that render.
4. Parent eventually sets `draft` to match emitted value.
5. Effect 2 runs on `draft` change; `draft === lastEmittedRef` (already updated in step 2) → early return, no `setText`.

The stale-lag path (`value="hello"`, `draft="hell"`) no longer triggers store→composer because effect 2 is not subscribed to `value`. When `draft` later catches up to `"hello"`, `lastEmittedRef` is already `"hello"`, so no clobber.

---

## External draft paths (restore / pick / send / conversation switch)

Verified call sites in `use-workspace-agent.ts` all mutate Zustand via `setDraft`, which flows to `ComposerDraftBridge` as the `draft` prop:

- `onRestoreServerDraft` → `setDraft(serverDraft.text)`
- `onPickComposerTrigger` / `addMentionedNode` → `setDraft(strip…)`
- `switchConversation` / send paths → `setDraft("")`
- `onDraftChange` wired to `view.setDraft` in `workspace-agent-view.tsx`

When any of these change `draft` independently of the current composer `value`, effect 2 sees `draft !== lastEmittedRef`, updates the ref, and calls `setText(draft)`. Requirement satisfied.

---

## Diff verification

Commit `729d3fef` matches the fix brief snippet exactly (ref pattern, dependency arrays, removal of `syncingFromStore`). Single-file change; `ComposerTriggerKeyboard` and `suggestionRowLabel` untouched.

---

## Issues

### Critical

_None._

### Important

_None._

### Minor

1. **No unit test for bridge sync logic** — Fix report notes manual typing verification still recommended. Optional `shouldApplyExternalComposerDraft` helper from brief was not extracted.
2. **Mount divergence edge case** — `lastEmittedRef` initializes to `draft`; if assistant-ui `value` differs on first paint (empty composer, non-empty store), effect 1 may emit `onDraftChange("")` before effect 2 applies `setText(draft)`. Unlikely given co-mounted state; acknowledged in fix report.

---

## Tests (reviewer did not re-run; per fix report)

- `bun test apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts` — 5 pass
- `bun run check` — pass
- `bun run check-types` — pass
- `bun run check:conventions` — pass

---

## Summary

Critical #1 is resolved. The fix implements the prescribed `lastEmittedRef` pattern with correct effect boundaries, eliminating the keystroke clobber while preserving external draft pushes.
