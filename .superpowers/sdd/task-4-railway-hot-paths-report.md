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

## Review fixes (Important)

1. Failed `team.list` is now `teams: null`, distinct from a successful `{ items: [] }`. Seeding skips a null team list so a transient failure cannot wipe a good cache. `teamCount` is `chrome.teams?.items.length ?? 0`.
2. Real-router test: sibling preload puts the previous `/_authenticated/agency` match in router `_cache`; after `resetAuthenticatedClientState`, that cached user id is gone, query shell is gone, and Back does not restore `prev`.

Did not add `staleTime`, `shouldReload`, or disable `refetchOnWindowFocus`. Did not amend `7e7c799b`.

### Covering tests (re-run)

```bash
cd apps/web && bun test src/lib/auth-session.test.ts \
  src/lib/boot-chrome.test.ts \
  src/lib/authenticated-client-reset.test.ts \
  src/lib/authenticated-boot.test.ts \
  src/lib/authenticated-parent-freshness.test.ts
```

```
bun test v1.4.0 (34cbb9a40)

src/lib/auth-session.test.ts:
(pass) resolveAuthSession > loader user bridges while the client session is still pending
(pass) resolveAuthSession > authoritative signed-out client result does not keep the loader user
(pass) resolveAuthSession > transient client failure keeps the loader user instead of signing out
(pass) resolveAuthSession > unsettled client data without an error keeps the loader user
(pass) resolveAuthSession > client user wins once present
(pass) resolveAuthSession > pending only when neither source has a user

src/lib/boot-chrome.test.ts:
(pass) resolveBootTeamId > first team is only an initial fallback
(pass) resolveBootTeamId > preserves the selected team when it is still in the list
(pass) resolveBootTeamId > falls back to the first team when the selected team is gone
(pass) resolveBootTeamId > no-team accounts resolve to an empty team id
(pass) loadBootShellChrome > loads chrome for the selected team, not always the first team
(pass) loadBootShellChrome > keeps successful chrome RPCs when a sibling fetch fails
(pass) loadBootShellChrome > failed team list is null, not a successful empty list
(pass) loadBootShellChrome > no-team accounts skip notification and timer fetches
(pass) seedBootChromeQueries > seeds only successful chrome results
(pass) seedBootChromeQueries > failed chrome RPCs do not seed authoritative zeros
(pass) seedBootChromeQueries > failed team list does not seed or wipe an existing team list
(pass) seedBootChromeQueries > does not overwrite query data updated after boot began
(pass) seedBootChromeQueries > does not seed another team's chrome when no team is selected yet

src/lib/authenticated-client-reset.test.ts:
(pass) shouldResetAuthenticatedClientState > does not reset during pending hydration or the first settled user
(pass) shouldResetAuthenticatedClientState > resets on sign-out and account replacement
(pass) shouldResetAuthenticatedClientState > does not reset while a transient pending state still has the current user
(pass) resetAuthenticatedClientState > clears user-scoped query and team state without tearing down live sockets
(pass) resetAuthenticatedClientState > Back after reset cannot restore the previous authenticated match or query shell

src/lib/authenticated-boot.test.ts:
(pass) loadAuthenticatedShell > expired or revoked sessions redirect to login with the deep-link path
(pass) loadAuthenticatedShell > direct canvas load without search uses the canvas fallback redirect
(pass) loadAuthenticatedShell > successful boot seeds chrome for the preferred team
(pass) loadAuthenticatedShell > failed team list does not seed an empty list over a good cache
(pass) loadAuthenticatedShell > hard refresh remains request-scoped: each load fetches session and chrome again

src/lib/authenticated-parent-freshness.test.ts:
(pass) authenticated parent loader freshness > child navigation re-runs a settled parent even without missing preload freshness
(pass) authenticated parent loader freshness > route staleTime 30s does not stop stay child-navigation parent reloads

 31 pass
 0 fail
 82 expect() calls
Ran 31 tests across 5 files. [290.00ms]
```

No dedicated `session-boot` test file; session coverage remains `auth-session.test.ts` + `authenticated-boot.test.ts`.

`bunx oxlint` and `bunx oxfmt --check` clean on touched files.
