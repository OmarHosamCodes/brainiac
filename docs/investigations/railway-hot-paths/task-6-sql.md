# Task 6 — task-list SQL decision

Additive note. Does not replace [baseline.md](./baseline.md).

## Callers of `projectTasks.list` / `listAgencyProjectTasks`

All keep the existing page contract (`items`, `page`, `pageSize`, exact `total`). COUNT stays on every page.

| Consumer                                      | Input shape                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| Chooser catalog + search                      | Infinite, `pageSize` 100, auto-drain; `getNextPageParam` reads `lastPage.total` |
| My Tasks rail                                 | Assignee + `open`/`in_progress` or `done` (completion-count total)              |
| Delegated My Tasks                            | `delegatedByUserId` + open statuses                                             |
| Project task list                             | Explicit `projectId` (archived-client tasks allowed)                            |
| Clients/projects tables + shared list filters | Team-wide search, `pageSize` 100                                                |
| Workspace-agent slash                         | Search, `pageSize` 50, while composing                                          |
| `ensureAgencyWorkBootQueries`                 | Prefetch chooser catalog + My Tasks open/done                                   |
| Agent `listProjectTasks`                      | Project-scoped pages                                                            |
| Agent proposal before-state                   | Team-wide `pageSize` 100                                                        |
| Knowledge search `agency.task`                | Search, `pageSize` ≤ 100                                                        |
| Journey discovery                             | API + cache helpers; no current UI caller for `journeyDiscoveryForUserId`       |

## What changed

`ORDER BY created_at DESC, id DESC`. Unique id after `createdAt` makes offset pages deterministic when timestamps collide. Concurrent inserts can still shift offsets; refreshes stay authoritative. No cursor protocol.

## What did not change

- COUNT / `total` on every page (catalog COUNT was ~0.5 ms on 473 tasks; not the bottleneck).
- No indexes (no new EXPLAIN that a supporting index would help a demonstrated stage).
- No enrichment rewrite. Tracked-seconds is the slowest local SQL stage (~7 ms) but well below this window’s HTTP p95 (233 ms, n=224). My Tasks still reloads member statuses when `assigneeUserId` is set; that duplicate work was not proven dominant.
- No COUNT/rows parallelization (pool contention not ruled out).
- Membership, per-member completion totals, rate inheritance, tracked seconds, search, trash exclusion, and team-wide archived-client exclusion unchanged. Explicit project queries still include archived-client tasks.
