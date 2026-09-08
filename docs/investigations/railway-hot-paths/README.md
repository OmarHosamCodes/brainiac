# Railway hot paths

Investigation notes for reducing verified request amplification on production Railway (project **Internal Tools**, environment **Orch**, service **web**, https://brainiac.school-of-marketing.com).

This folder is evidence only. Product fixes land in later tasks on `fix/railway-hot-paths`. Railway memory stays unchanged.

## Capture rules

- Exclude `/rpc/ws` duration from RPC latency comparisons. Long-lived WebSockets are not RPC samples.
- Do not claim endpoint p95 from a handful of slow-log examples. If fewer than 100 comparable requests are available, label the sample **limited**.
- A slow HTTP request alone does not justify a count rewrite or index.
- **Do not skip COUNT after page 1.** `projectTasks.list` must keep an exact `total` on every page. Later task 6 may optimize measured stages; it must not drop count.
- Sanitize evidence: no cookies, credentials, notification bodies, private task titles, client IPs, or user identifiers.

## Documents

| File | Section | Status |
| --- | --- | --- |
| [baseline.md](./baseline.md) | Before-change capture (this task) | Captured 2026-09-08 |
| [treatment.md](./treatment.md) | After a separately authorized deploy | Empty until rollout |

## What later tasks should change vs leave

Optimize (if this baseline still holds after each change):

1. Per-event `authClient.getSession()` in live timer/notification handlers.
2. Ungated 8 s notification list polling while a team subscription is connected (shell featured-rail observer stays mounted on Canvas).
3. Authenticated loader / boot chrome reseeding — only after measuring loader `cause`/`preload` (not measured in-browser this capture).
4. Task-chooser catalog prefetch + auto-drain duplication and 15 s freshness — keep complete hydration and exact `total`.

Leave:

- Railway memory / plan.
- Exact `total` on every `projectTasks.list` page (including catalog page 2+).
- Auth lifecycle, notification reconciliation, Better Auth focus refetch (unless a later measured change).
- Timer persistence, global preload removal, speculative `projects/list` payload rewrite.
- COUNT-skip / cursor-only chooser protocol (follow-up only if count is later proven dominant **and** a new contract is designed).

This capture’s local EXPLAIN does **not** show catalog COUNT as the dominant SQL stage. Production `projectTasks/list` p95 in the named window is 233 ms (n=224), not the original 7.2 s individual slow request.
