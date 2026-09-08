# Task 4 report — Bound authenticated loader work safely

## What I implemented

Authenticated shell boot now treats session, chrome, and cache as independent lifecycles:

- `resolveAuthSession` uses the loader user only while the client session is pending or in transient failure. An authoritative signed-out client result (`data: null` or `{ user: null }`, no error) no longer keeps the previous loader user.
- Sign-out and account replacement clear the query cache, reset `selectedTeamId`, clear cached `/_authenticated` router matches, and `invalidate()` so Back/rapid sign-in cannot restore the previous user's shell. Live sockets are not torn down for identity changes (Task 2 in-place viewer updates remain).
- Boot chrome fetches unread, list, and timer independently. Failed RPCs stay `null` and are not seeded as zero/empty/null authority. Seeding skips a query whose `dataUpdatedAt` is newer than boot start.
- First-team is only the initial fallback. Client navigation passes the selected team into `fetchBootShellChrome`.
- Boot session remains request-scoped (`createServerFn` + request cookie). No global session/chrome cache. Better Auth `refetchOnWindowFocus` is unchanged.

**Route `staleTime` was not added.** A router-core test proved child navigation re-runs the settled parent (`cause: "stay"`), and the same re-runs still happen with `staleTime: 30_000` / `preloadStaleTime: 30_000`. Those stay reloads are not stale-age driven, so route freshness would not bound parent boot fanout. Global `defaultPreload: "intent"` is unchanged.

## What I tested and test results

From `apps/web`:

```bash
bun test src/lib/auth-session.test.ts \
  src/lib/boot-chrome.test.ts \
  src/lib/authenticated-client-reset.test.ts \
  src/lib/authenticated-boot.test.ts \
  src/lib/authenticated-parent-freshness.test.ts
```

**GREEN:** 28 pass, 0 fail.

Task 2–3 regressions also passed (68 tests across 9 files).

`bunx oxlint` and `bunx oxfmt --check` clean on touched files. Did not run root `bun run check`.

## TDD Evidence

### RED

```bash
cd apps/web && bun test src/lib/auth-session.test.ts src/lib/boot-chrome.test.ts \
  src/lib/authenticated-client-reset.test.ts src/lib/authenticated-boot.test.ts \
  src/lib/authenticated-parent-freshness.test.ts
```

Representative failures (before production changes):

```
resolveAuthSession > authoritative signed-out client result does not keep the loader user
  Expected: user null
  Received: loader user / snapshot object treated as user

loadBootShellChrome > keeps successful chrome RPCs when a sibling fetch fails
  notifications became empty chrome instead of null sibling

seedBootChromeQueries > failed chrome RPCs do not seed authoritative zeros
  (stub seeded nothing; later implementation must not write { count: 0 })

resetAuthenticatedClientState > clears user-scoped query and team state
  Expected undefined query data, Received previous shell

authenticated parent loader freshness > with 30s staleTime, child navigation does not re-run
  Expected: 1 parent load
  Received: 3 (cause stay) — even with staleTime: 30_000
```

### GREEN

After implementation, the 28 tests above pass. The parent-freshness suite was rewritten to lock the measured router-core behavior: stay child-nav re-runs the parent, and `staleTime: 30_000` does not stop that.

## Files changed

- `apps/web/src/lib/auth-session.ts` + test
- `apps/web/src/lib/boot-chrome.ts` + test (team fallback, independent RPCs, conditional seed)
- `apps/web/src/lib/boot-prefetch.ts` (optional preferred `teamId`, request-scoped cookie client)
- `apps/web/src/lib/authenticated-boot.ts` + test (session redirect, deep-link search, request-scoped double load)
- `apps/web/src/lib/authenticated-client-reset.ts` + test
- `apps/web/src/lib/authenticated-parent-freshness.test.ts` (staleTime decision evidence)
- `apps/web/src/routes/_authenticated.tsx`
- `apps/web/src/providers/auth-provider.tsx`
- `apps/web/src/features/user-settings/hooks/use-user-settings-modal-actions.ts`

Not changed: Railway memory, Better Auth focus refetch, chooser catalog, COUNT, Task 2 live identity / Task 3 notification polling.

## staleTime decision

**Not added** on `/_authenticated`.

Evidence: installed `@tanstack/router-core` 1.171.20 reloads a successful parent on child navigation with `cause: "stay"` (1 → 3 loads across preload + `/canvas` + `/agency`). Repeating the same matrix with `staleTime: 30_000` and `preloadStaleTime: 30_000` still produced 3 parent loads. Intent preload itself did not add a parent load. Because route `staleTime` does not prevent these stay reloads, it is not a necessary or sufficient bound; savings stay with the lifecycle safeguards (no zero seeds, selected-team chrome, signed-out/account reset).

## Concerns

- Parent boot can still re-run on in-shell child navigation. Stopping that would need a non-spec `shouldReload` change, not `staleTime`.
- Selected team is preserved on client navigation only; zustand is not persisted, so a hard refresh still falls back to the first team (pre-existing).
- Explicit sign-out resets from both the settings hook and AuthProvider; the helper is idempotent.
- `apps/web` `tsc -b` still reports a pre-existing Task 3 error in `notifications-queries.ts`; no new errors in Task 4 files.
