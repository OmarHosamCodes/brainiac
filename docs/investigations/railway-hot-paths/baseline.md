# Baseline — Railway hot paths

Captured **2026-09-08** from worktree `fix/railway-hot-paths`. Evidence only. No product code was changed for this capture.

## Capture identity

| Field | Value |
| --- | --- |
| Worktree | `/home/omar/Projects/brainiac/.worktrees/fix-railway-hot-paths` |
| Branch | `fix/railway-hot-paths` |
| Commit SHA | `5f655f6a12c60976a9e09b5cd6cc7937a1e9a379` |
| UTC window (named) | **2026-09-08T09:02:39Z – 2026-09-08T10:05:46Z** (~1 h; Railway metrics slices inside this range) |
| HTTP log sample | 500 most-recent edge lines **2026-09-08T09:49:56Z – 2026-09-08T10:03:20Z** (~13 min). Path counts in that sample are **limited** unless noted. |
| Railway project | Internal Tools `262dcd7c-7600-4b50-8fa3-da75ba297b1f` |
| Environment | Orch `5907dcac-7af8-4a06-bfb5-da3131ec8263` |
| Service | web `2cfbb176-0575-49cb-9e7f-bb99f727b76e` |
| App URL | https://brainiac.school-of-marketing.com |
| Deployment | `90d4fb9b-d784-451c-84eb-d724dfc0f00a` **SUCCESS** (created 2026-09-06T08:09:38Z) |
| Deployed commit | `5f655f6a12c60976a9e09b5cd6cc7937a1e9a379` (matches this worktree; branch `dev` at deploy time) |
| Replicas | **1** (`numReplicas: 1`, region `europe-west4-drams3a`). Active instance `16b9770b-6cbc-407c-a7bb-2967b0632c93` RUNNING; one REMOVED instance leftover on the same deployment. |
| Memory limit | Unchanged. Metrics: **1023.997 MB**. Service manifest `limitOverride.containers.memoryBytes`: 1_000_000_000. **Do not change.** |
| Browser / version | **Not measured.** No production credentials in this agent session. An open local tab on another checkout was not used (unrelated Sentry/router work). |
| Route | **Not measured** in-browser. Edge logs in the 13-minute sample include `/`, `/agency`, `/agency/dashboard`. |
| Team task count | Production Postgres stats for `agency_ops_project_task`: **27 live tuples** (estimator; may be stale). Local dump used for EXPLAIN: **473 catalog-eligible** tasks on the largest team (876 team rows, 1 archived). |
| Catalog `pageSize` | **100** (`apps/web/src/features/shared/agency-task-chooser-catalog.ts`) |
| Tabs | **Not measured.** Edge traffic in the hour includes multiple Chrome desktop UAs; do not assign all session GETs to one tab. |

## Original observations (not this window)

Retained from the plan. They had **no UTC interval or deployment ID**. This file is the comparable baseline.

| Original observation | This capture |
| --- | --- |
| Memory 944 / 1024 MB; CPU ~2%; HTTP p95 420–476 ms; zero 5xx | Memory avg **921 MB** / 1024 (current 918, max 953, **89.7%**); CPU avg **0.024 vCPU** of 1 (max 0.14); HTTP **p50 172 / p95 231 / p99 1804 ms**; **0 5xx**, 7 4xx, 2669 2xx, 2676 total |
| Postgres cache hit 99.99%, 33 MB, low CPU | Cache hit **99.995%**; DB **33.1 MB**; CPU avg **0.008 / 24 vCPU**; connections 2/500; deadlocks 0 |
| `projectTasks/list` 7.2 s (not p95) | Hour metrics **n=224**, p50 210 ms, p95 **233 ms**. 13-min log sample n=24 (limited), max 471 ms. Original 7.2 s **not reproduced** as a tail in this window. |
| unread count 3.9 s | Hour metrics **n=129**, reported p50=p95=304 ms (coarse buckets). Log sample n=30 (limited), max **3503 ms** (one slow request; not p95). |
| projects list 3.5 s / 112 KB | Hour metrics **n=88** (limited for p95 claim). Log sample n=17, max 840 ms, avg tx **~113 KB** (matches the 112 KB size, not the 3.5 s duration). |
| active timer 3.5 s | Hour metrics **n=130**, p50=p95=196 ms. Log sample n=18 (limited), max 408 ms. |
| Notification list ~every 8 s; session GET bursts | Confirmed: list median interarrival **8.3 s**; get-session **45/63** gaps &lt; 0.5 s (bursts of up to **16/s**). |
| Notification preferences 61 s / 499 | **Not reproduced.** Hour metrics n=8, all 2xx, p50 183 ms. One **499** this hour was `/rpc/agencyOps/tenure/policy/get` (10 ms, client abort). |
| Long-lived `/rpc/ws` | Confirmed. Status 0, `connection upgraded to WebSocket`, durations tens of seconds to **~30 min**. **Excluded from RPC p95.** |

## Railway resource snapshot (web, ~1 h)

Window: `2026-09-08T09:02:39Z` – `2026-09-08T10:02:44Z`.

| Metric | Value |
| --- | --- |
| CPU avg / max / limit | 0.024 / 0.140 / 1.0 vCPU |
| Memory avg / max / limit | 921 / 953 / 1024 MB (89.7% current) |
| HTTP 2xx / 4xx / 5xx | 2669 / 7 / 0 |
| HTTP p50 / p90 / p95 / p99 | 172 / 224 / 231 / 1804 ms |
| Error rate | 0 |

Postgres (`Postgres-EEa9`, same environment, overlapping hour): cache hit 99.995%; size 33.1 MB (tables 11.2 MB, indexes 11.0 MB); CPU near zero; memory ~287 MB of 24 GB. Table stats (live tuples, not an application count): time entries 10_520, notifications 8_926, project tasks **27**, projects 7, sessions 174. `agency_ops_project_task` has **6.9M index scans** vs 5k seq scans — lookups are frequent; the table is small. Missing-index list from Railway was empty. Unused-index names are mostly PK/unique; do not drop from this snapshot.

4xx in the hour (sanitized): scanner `404` on a WordPress probe path; missing user-avatar objects; missing font; one **499** abort on `tenure/policy/get`. Not used as SQL evidence.

## Per-endpoint HTTP (Railway metrics, ~1 h)

`--http --path` totals. Railway percentile fields for several paths collapsed (p50 = p90 = p95); treat those percentiles as **coarse**. Sample size is still useful. `/rpc/ws` metrics returned no HTTP counters (expected for upgrades).

| Path | n (hour) | p95 claim? | Metrics p50 / p95 (ms) | Notes |
| --- | --- | --- | --- | --- |
| `/api/auth/get-session` | **447** | yes | 14 / 14 | Cheap; **volume + bursts**, not duration. |
| `/rpc/notifications/list` | **309** | yes | 194 / 197 | ~5.2/min. Matches 8 s poll with hidden-tab pauses (`refetchIntervalInBackground: false`). Avg payload in 13-min sample ~23 KB. |
| `/rpc/agencyOps/projectTasks/list` | **224** | yes | 210 / **233** | Not a 7 s endpoint in this window. Avg payload in sample ~46 KB. |
| `/rpc/agencyOps/timer/getActive` | **130** | yes | 196 / 196 | |
| `/rpc/notifications/unreadCount` | **129** | yes (count); tail coarse | 304 / 304 | Log sample max 3503 ms (limited n=30). |
| `/rpc/agencyOps/projects/list` | 88 | **limited** | 208 / 208 | Large payload (~113 KB). |
| `/rpc/notifications/preferences/get` | 8 | **limited** | 183 / 183 | Not the historical 61 s abort. |

13-minute edge sample (n=500, **limited** for most paths; still useful for cadence):

| Path | n | median interarrival | p50 / max ms | Interpretation |
| --- | --- | --- | --- | --- |
| `/rpc/notifications/list` | 79 | **8.3 s** | 189 / 639 | Scheduled **warm** poll. |
| `/rpc/notifications/unreadCount` | 30 | 21.5 s | 193 / 3503 | **Cold** 30 s backstop + boot/focus extras. |
| `/api/auth/get-session` | 64 | **burst** (45 gaps &lt; 0.5 s) | 8 / 39 | Live-event / focus / multi-client; not 8 s polling. |
| `/rpc/agencyOps/projectTasks/list` | 24 | 0.9 s (11 gaps &lt; 0.5 s) | 216 / 471 | Boot + catalog drain clustering. |
| `/rpc/agencyOps/timer/getActive` | 18 | 11.1 s | 200 / 408 | Mix of boot and observers. |
| `/version.json` | 136 | — | 4 / 10 | Service-worker / update check; ignore for RPC p95. |
| `/rpc/ws` | 17 | — | lifetime 5 s–30 min | Excluded. |

Slow completed RPCs ≥1 s in that 13-minute sample (n=3; **not endpoint p95s**): `tenure/policy/get` 6817 ms; `notifications/unreadCount` 3503 ms; `team/get` 1804 ms.

## Browser scenario matrix

| Scenario | Result |
| --- | --- |
| 1. Cold authenticated Tracker load, including SSR-internal RPCs | **Not measured** (no production login). Source mapping below. Edge sample had 2 `/_serverFn` requests; most `get-session` UAs were Chrome (client). SSR `fetchBootSession` / `fetchBootShellChrome` call `/api/auth/get-session` and `/rpc` on the server and will not show as extra browser RPCs. |
| 2. Two minutes idle with confirmed team subscription | **Not measured** in-browser. Edge cadence for `notifications/list` (median 8.3 s) is the idle-poll signature while the featured-rail query is mounted. |
| 3. Ten sidebar hovers + ten in-shell navigations in 30 s, then after freshness window | **Not measured.** Loader `cause` / `preload` not observed. Router-core default `preloadStaleTime` is **30 s**; `_authenticated` does not set its own `staleTime`. |
| 4. Forced WS loss, reconnect, Agency → Canvas → Agency, two tabs | **Not measured.** |
| 5. Catalog sizes 0, 1, 100, 101, 250+; first usable vs full hydration | **Not measured** in-browser. Source: `pageSize: 100`, auto-drain all pages, first page via `ensureAgencyTaskChooserCatalog` (`pages: 1`). Local dump: 473 catalog tasks ⇒ 5 pages. Production live_tuples ~27 ⇒ likely **one** page if stats are current. |

Do not invent browser timings.

## Request initiator mapping (this worktree)

### Session GET `/api/auth/get-session`

| Initiator | Behavior |
| --- | --- |
| SSR boot | `fetchBootSession` in `apps/web/src/lib/session-boot.ts` — server fetch during `_authenticated` loader. |
| Better Auth client | `authClient` in `apps/web/src/lib/auth-client.ts`; `AuthProvider` uses `authClient.useSession()`. Focus refetch remains enabled (Better Auth default). QueryClient `refetchOnWindowFocus` is **false**, so this is not TanStack Query. |
| Live events | `getViewerUserId()` → `authClient.getSession()` in `apps/web/src/features/shared/live/agency-live-handlers.ts` on **every** `timer.updated` and `notification.created`. Matches session **bursts**, not 8 s polling. |

### Notifications

`withAgencySyncQueryOptions` (`apps/web/src/features/shared/agency-query-options.ts`):

- `AGENCY_POLL.warm = 8_000`, `cold = 30_000`.
- `liveGated` is **opt-in**. Notification queries do **not** pass `{ liveGated: true, teamId }`.
- `refetchIntervalInBackground: false` (hidden tab stops interval polling).
- `refetchOnWindowFocus: true` on agency sync queries.

Callers:

- `useAgencyNotificationsQuery` — **warm**, ungated. Featured rail (`use-featured-rail-notification.ts`) mounts it whenever a team is selected (Canvas included). Inbox also mounts it when open.
- `useAgencyNotificationUnreadCountQuery` — **cold**, ungated. Inbox hook.
- Boot chrome (`apps/web/src/lib/boot-prefetch.ts`) seeds list + unread (and timer) from SSR; failed chrome RPCs currently fall back to empty/zero via the loader in `apps/web/src/routes/_authenticated.tsx`.

Live `notification.created` patches cache after a session GET (recipient filter).

### Authenticated loader / boot

`apps/web/src/routes/_authenticated.tsx` loader always `Promise.all([fetchBootSession(), fetchBootShellChrome()])`, then **unconditionally** `setQueryData` for teams, unread, list, and timer (empty/zero/null if chrome RPCs failed).

`getRouter()` (`apps/web/src/router.tsx`) sets `defaultPreload: "intent"` only. Installed `@tanstack/router-core@1.171.20` uses `preloadStaleTime ?? defaultPreloadStaleTime ?? 30_000`. Missing route `staleTime` does **not** by itself prove every hover reruns the parent. **Loader invocation counts by `cause`/`preload` were not measured.**

### Task chooser catalog

`apps/web/src/features/shared/agency-task-chooser-catalog.ts`:

- `pageSize: 100`, `staleTime: 15_000`.
- Infinite query key suffix `infinite` then `catalog`/`search`.
- `getNextPageParam` reads **`lastPage.total`**. Displayed total uses **`pages[0].total`**.
- `drainNextPage` auto-fetches until `hasNextPage` is false (no Load more).
- `ensureAgencyTaskChooserCatalog` prefetches **one** page (`pages: 1`).
- Does **not** use `withAgencySyncQueryOptions` (no 8 s interval; QueryClient default `refetchOnWindowFocus: false`).

Prefetch sites: `ensureAgencyWorkBootQueries` (Tracker/My Tasks boot), `ensureAgencySegmentBoot` (reports segment), plus mounted chooser consumers (tracker, time-entry log, reports).

### `projectTasks.list` callers (keep COUNT on every page)

API: `listAgencyProjectTasks` → Zod `total: z.number().int().nonnegative()` on every response (`packages/api/src/routers/agency-ops/tasks/router.ts`).

| Consumer | Shape |
| --- | --- |
| Chooser catalog + search | Infinite, pageSize 100, auto-drain |
| My Tasks rail | Paginated list, assignee + statuses; done list uses completion-count total |
| Delegated My Tasks | `delegatedByUserId` |
| Project task list | `projectId` (explicit project keeps archived-client tasks) |
| Clients/projects tables + shared list filters | Team-wide search, pageSize 100 |
| Workspace-agent slash | Search, pageSize 50, enabled while composing |
| `ensureAgencyWorkBootQueries` | Prefetch chooser catalog + My Tasks open/done |
| Agent `listProjectTasks` | Project-scoped pages |
| Agent proposal before-state | Team-wide pageSize 100 |
| Knowledge search `agency.task` | Search, pageSize ≤ 100 |
| Journey discovery filter | API + cache helpers exist; **no current UI caller** passing `journeyDiscoveryForUserId` |

## Task-list stage timings (local dump, read-only)

Local `orch-postgres` (realistic dump, not the live 27-row estimator). `statement_timeout = 15s`, `EXPLAIN (ANALYZE, BUFFERS)`. Largest team: **473** catalog-eligible tasks. Identifiers omitted.

| Stage | Execution time | Plan notes |
| --- | --- | --- |
| Membership (`workspace_team_member` by team+user) | **0.02 ms** | Tiny seq scan, 1 buffer hit. Unique `(team_id, user_id)` exists. |
| Catalog COUNT (`count(*)` + project/client joins, trash + archived-client + not archived task) | **0.49 ms** | Hash joins, **seq scan** of 876 task rows, 72 buffer hits. **Not dominant.** |
| Catalog rows page 1 (`ORDER BY created_at DESC LIMIT 100`) | **0.58 ms** | Same join; top-N heapsort. |
| Catalog rows offset 400 (page 5 of 100) | **0.57 ms** | Full sort of 473 rows; still sub-ms. |
| My Tasks COUNT (member-status correlated subquery + assignee EXISTS) | **2.0 ms** | Nested loop; 775 hits + 10 reads. More expensive than catalog count, still small. |
| Enrich assignees (100 ids) | **~0.7 ms** | |
| Enrich tracked seconds (sum duration for actor, 100 ids) | **7.2 ms** | Slowest local SQL stage: index scan on `agency_ops_time_entry` (109 reads). |

`buildProjectTaskRecord` maps in memory (no per-row SQL). Catalog enrichment still runs `loadTaskAssignees` (which itself loads member statuses) plus `loadTaskTrackedSeconds`. My Tasks **additionally** reloads member statuses and blueprints — duplicate member-status work when `assigneeUserId` is set. Serialization (Zod + JSON) was not timed.

**Implication for task 6:** this baseline does **not** justify skipping COUNT after page 1. Count is sub-millisecond on 473 catalog tasks. If production list latency returns to multi-second, profile **enrichment / pool wait / request amplification** before rewriting count. No index migration from this EXPLAIN: seq scans are on tables that fit in shared buffers; tracked-seconds already uses `agency_ops_time_entry_team_user_idx`. A slow HTTP request alone is not evidence for a count rewrite.

Production vs dump: live `agency_ops_project_task` stats say 27 rows. If that is accurate, catalog drain is one page and COUNT is even cheaper. The dump is the pessimistic SQL case.

## Sentry availability

Checked at capture time (not a product change):

- Railway **web** variables include `SENTRY_DSN`, `VITE_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `SENTRY_ENVIRONMENT` (values not recorded).
- Production JS bundle (`/assets/index-5AEyEooz.js`) contains `Sentry.init`, `browserTracingIntegration`, `tracesSampleRate`, and a `ingest.de.sentry.io` host. **Replay is not present.**
- Source (`apps/web/src/lib/sentry.ts`): `tracesSampleRate` 0.1 in production; `tracePropagationTargets` lists `localhost`, `orch.school-of-marketing.com`, `web-orch.up.railway.app`, and relative `/`. **`brainiac.school-of-marketing.com` is not in that list** (tracing may not attach to the primary custom domain). Documented only; not fixed here.
- Trace **arrival** in the Sentry org UI was **not verified** (no Sentry API session this capture). RUM tracing is **deployed in the production bundle**, not absent.

## What this baseline supports

Request amplification to attack first (later tasks 2–5): session GETs on live events; ungated 8 s list polling from the global featured-rail observer; boot chrome reseeding; chooser prefetch/drain. SQL COUNT is **not** the demonstrated bottleneck. Preserve exact `total` on every list page.
