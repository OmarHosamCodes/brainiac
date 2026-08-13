# Task 4 fix report — Hide restore chip during in-flight send

**Branch:** `omarhosamcodes/cloud-agent-1786657271032-f0r08`  
**Commit:** `44616369`  
**Review item:** Important #1 (`task-4-review.md`)

## Problem

`sendMessage` cleared the live draft before `await chatSendMessage`, while server discard ran only after the stream succeeded. Until discard + invalidate completed, `serverDraftOffer` was true (empty live + server text still present), so `DraftRestore` could show the text the user just sent—including during `isStreaming`—and Restore could refill the composer mid-turn.

## Fix

### `use-workspace-agent.ts`

1. Added `composerSendInFlight` state (default `false`).
2. On the `"send"` path (after ignore/queue/agency-team checks, before clearing draft): set `composerSendInFlight(true)`, wrap `chatSendMessage` + discard/invalidate in `try`/`catch`/`finally`, clear flag in `finally`. Queue path unchanged (does not set `composerSendInFlight`).
3. Gated `serverDraftOffer` with `!composerSendInFlight && !isStreaming` before calling `shouldOfferComposerDraftRestore`.
4. Switched `invalidateComposerDraftQuery` to use `composerDraftQueryOptions.queryKey` from the data hook (Minor #1 — keys cannot drift).

### `composer-draft-display.ts`

- Added optional `isBusy` flag to `shouldOfferComposerDraftRestore` (default false); returns false when busy.

### `composer-draft-display.test.ts`

- Added case: `isBusy: true` → false.

### `use-workspace-agent-data.ts`

- No code change; `composerDraftQueryOptions` is now consumed by the orchestration hook for invalidation.

## Verification

```
bun test apps/web/src/features/workspace-agent/composer-draft-display.test.ts
→ 2 pass, 0 fail
```

```
bun run check
bun run check-types
→ pass
```

## Constraints honored

- Discard still runs only after successful `"send"` (not before stream).
- Failed send restores local draft; server row remains.
- No API/DB, plan, or routeTree changes.
- Views remain props-only; no localStorage.

## Residual concerns

- Hook timing (debounce, send-discard, chip visibility) still has no automated integration test beyond pure helpers.
- `isBusy` in the helper is defense-in-depth; the hook’s explicit `composerSendInFlight` gate covers the post-stream pre-discard gap.
