# Treatment (after deploy)

**Status: BLOCKED — pending authorized production deploy of `fix/railway-hot-paths`.**

No treatment metrics have been captured. Deployment was **not** authorized for this task. Do not run `railway up`, merge to `dev`, or push for capture purposes unless the user explicitly authorizes production deploy.

When authorized, resolve the Railway project/environment/service IDs, track the **exact deployment** to `SUCCESS`, and fill the sections below using the same sanitization rules and scenario matrix as [baseline.md](./baseline.md).

## Capture identity (to fill after deploy)

| Field | Value |
| --- | --- |
| Worktree | `/home/omar/Projects/brainiac/.worktrees/fix-railway-hot-paths` |
| Branch | `fix/railway-hot-paths` |
| Treatment commit SHA | _pending deploy_ |
| Railway deployment ID | _pending; must be `SUCCESS`_ |
| UTC window (named) | _~1 h comparable to baseline **2026-09-08T09:02:39Z – 2026-09-08T10:05:46Z**_ |
| HTTP log sample | _500 most-recent edge lines inside the named window_ |
| Railway project | Internal Tools `262dcd7c-7600-4b50-8fa3-da75ba297b1f` |
| Environment | Orch `5907dcac-7af8-4a06-bfb5-da3131ec8263` |
| Service | web `2cfbb176-0575-49cb-9e7f-bb99f727b76e` |
| App URL | https://brainiac.school-of-marketing.com |
| Baseline deployment (compare against) | `90d4fb9b-d784-451c-84eb-d724dfc0f00a` @ `5f655f6a12c60976a9e09b5cd6cc7937a1e9a379` |
| Replicas | **1** (must match baseline) |
| Memory limit | **Unchanged** — 1_000_000_000 bytes / ~1024 MB. **Do not change.** |

## What will be compared

Use the **same service, environment, and ~1 h UTC window** as baseline. Record bounded HTTP/runtime logs and Railway resource metrics with explicit service/environment scope.

### Railway resource snapshot (web)

| Metric | Baseline (for delta) | Treatment |
| --- | --- | --- |
| CPU avg / max / limit | 0.024 / 0.140 / 1.0 vCPU | _pending_ |
| Memory avg / max / limit | 921 / 953 / 1024 MB (89.7%) | _pending_ |
| HTTP 2xx / 4xx / 5xx | 2669 / 7 / 0 | _pending_ |
| HTTP p50 / p90 / p95 / p99 | 172 / 224 / 231 / 1804 ms | _pending_ |
| Error rate | 0 | _pending_ |

### Per-endpoint HTTP (Railway metrics, ~1 h)

Compare request **counts**, **bytes** (where available), **errors/aborts**, and **p50/p95** with sample sizes. `/rpc/ws` excluded from RPC p95.

| Path | Baseline n | Baseline p50 / p95 (ms) | Treatment n | Treatment p50 / p95 | Moved? |
| --- | --- | --- | --- | --- | --- |
| `/api/auth/get-session` | 447 | 14 / 14 | _pending_ | _pending_ | _pending_ |
| `/rpc/notifications/list` | 309 | 194 / 197 | _pending_ | _pending_ | _pending_ |
| `/rpc/agencyOps/projectTasks/list` | 224 | 210 / 233 | _pending_ | _pending_ | _pending_ |
| `/rpc/agencyOps/timer/getActive` | 130 | 196 / 196 | _pending_ | _pending_ | _pending_ |
| `/rpc/notifications/unreadCount` | 129 | 304 / 304 | _pending_ | _pending_ | _pending_ |
| `/rpc/agencyOps/projects/list` | 88 | 208 / 208 | _pending_ | _pending_ | _pending_ |
| `/rpc/notifications/preferences/get` | 8 | 183 / 183 | _pending_ | _pending_ | _pending_ |

Note which baseline request sources actually moved (session GET bursts, 8 s list poll, boot chrome seeding, chooser prefetch/drain, live-event session GETs).

### Browser scenario matrix (when credentials available)

Same five scenarios as baseline. Do not invent timings.

| Scenario | Baseline | Treatment |
| --- | --- | --- |
| 1. Cold authenticated Tracker load (SSR-internal RPCs) | Not measured | _pending_ |
| 2. Two minutes idle with confirmed team subscription | Not measured (edge cadence only) | _pending_ |
| 3. Ten sidebar hovers + ten in-shell navigations, then after freshness window | Not measured | _pending_ |
| 4. Forced WS loss, reconnect, Agency → Canvas → Agency, two tabs | Not measured | _pending_ |
| 5. Catalog sizes 0/1/100/101/250+; first usable vs full hydration | Not measured | _pending_ |

For scenario 5, record **first-usable** (one prefetched page) vs **full-catalog** (auto-drain complete) timings when measured.

### Request initiator deltas

Re-check the baseline mapping after deploy. Treatment should show reduced amplification on:

- `/api/auth/get-session` (live-event `getViewerUserId`, focus refetch)
- `/rpc/notifications/list` (ungated 8 s warm poll from featured rail)
- `/rpc/agencyOps/projectTasks/list` (boot prefetch + chooser drain clustering)
- Boot chrome unconditional `setQueryData` reseeding

## Rollback triggers

Revert the responsible hot-path change if any of the following occur post-deploy:

| Trigger | Action |
| --- | --- |
| Auth identity leaks or sticks across team/user switches | **Rollback** |
| Notifications fail to recover after focus, reconnect, or live events | **Rollback** |
| Task chooser catalog hydration loses tasks or corrupts infinite-query pages | **Rollback** |
| Timer state regresses (lost mid-track edits, silent drops, stale active timer) | **Rollback** |
| Latency or errors **materially worsen** vs baseline | **Rollback** or investigate |
| Unexplained **>10% p95 regression** on a hot path with adequate sample size | **Investigate / rollback** |

Out of scope for this capture: Railway plan/memory changes, broad observability rollout, PostHog, global preload removal, timer persistence redesign, speculative `projects/list` rewrite.

## Capture procedure (after authorization)

1. Deploy `fix/railway-hot-paths` to production (user-authorized only); wait for deployment `SUCCESS`.
2. Record treatment commit SHA and deployment ID in the table above.
3. Capture Railway metrics for a **~1 h UTC window** on web service `2cfbb176-0575-49cb-9e7f-bb99f727b76e` (same env as baseline).
4. Pull 500 most-recent sanitized HTTP edge lines inside that window.
5. Run browser scenarios 1–5 if production credentials are available; otherwise note “not measured” as baseline did.
6. Compare tables above to baseline; document which request sources moved and whether rollback triggers fired.
7. Keep memory limit at 1_000_000_000 bytes throughout.
