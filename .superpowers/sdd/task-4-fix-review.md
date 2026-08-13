# Task 4 Re-Review — Hide restore chip during in-flight send

**BASE:** `a5711e7d`  
**HEAD:** `44616369`  
**Verdict:** Spec ✅ · Task quality **Approved**

---

## Fix verification

| Important item | Status | Evidence |
| --- | --- | --- |
| **#1** Restore chip suppressed during in-flight send and streaming; post-stream pre-discard gap covered | ✅ Fixed | `use-workspace-agent.ts` — `composerSendInFlight` state (default `false`). On `"send"` path only: `setComposerSendInFlight(true)` at line 567 **before** `setDraft("")` (568). `try`/`catch`/`finally` wraps `chatSendMessage` + discard/invalidate; `finally` clears flag (594–596). Queue path returns early (537–541) without setting `composerSendInFlight`. `serverDraftOffer` gated with `!composerSendInFlight && !isStreaming` (297–299) plus helper `isBusy: composerSendInFlight \|\| isStreaming` (304–305). Flag stays true through discard + invalidate call, covering the post-stream pre-discard window. Discard remains after successful `chatSendMessage` only (579–587). Failed send restores `setDraft(content)` in `catch` (590–592); no discard on failure. |

---

## Spec

**Still ✅**

Original Task 4 deliverables (draft autosave, restore offer, send-discard matrix, golden layers, props-only views) remain intact. Fix commit touches only the three files scoped in the fix brief; no API/DB, plan, or routeTree changes.

---

## Issues

### Critical

_None._

### Important

_None._ Important #1 from `task-4-review.md` is resolved in HEAD.

### Minor

1. **No hook timing integration tests** — Unchanged from original Task 4 review Minor #2. `composer-draft-display.test.ts` covers the new `isBusy` helper case only; debounce, send-discard, and chip visibility timing in the hook are still untested. Acceptable per fix brief (bun:test helpers only).
2. **Redundant `isBusy` when hook already gates** — `serverDraftOffer` checks `!composerSendInFlight && !isStreaming` before calling `shouldOfferComposerDraftRestore` with `isBusy: composerSendInFlight || isStreaming`. Defense-in-depth only; harmless.
3. **Brief post-invalidate cache window** — `invalidateComposerDraftQuery` is fire-and-forget; stale `composerDraftQuery.data` could theoretically flash the chip until refetch completes after a successful discard. Pre-existing React Query behavior; narrower than the original in-flight/streaming defect and out of fix scope.

---

## Minor #1 (original review) — resolved

`composerDraftQueryOptions` is now destructured from `use-workspace-agent-data` and used by `invalidateComposerDraftQuery` via `composerDraftQueryOptions.queryKey` (292–294). Keys cannot drift from the query hook.

---

## Verified by reviewer

```
bun test apps/web/src/features/workspace-agent/composer-draft-display.test.ts
→ 2 pass, 0 fail
```

Commit `44616369` matches fix report: three files, message `fix: hide Orch draft restore while a send is in flight`.

---

## Task quality

**Approved**

Important #1 is substantively fixed: the restore chip cannot surface while a send is in flight or while streaming, and `composerSendInFlight` covers the post-stream pre-discard gap. Discard timing, failed-send restore, and queue-path isolation match the fix brief. Original Minor #1 (unused export) is also resolved. Residual nits are Minor and do not block Task 5.
