# Realtime Integration Registry

Audited 2026-07-10 against `packages/api/src/routers/agency-ops/live/live.ts` and `apps/web/src/features/shared/live/agency-live-handlers.ts`.

The machine-readable source of this table is [`golden-file-realtime-integration-registry.json`](golden-file-realtime-integration-registry.json), verified by `bun run check:realtime`.

| Event                  | Producer                              | Consumer/cache owner                                     | Notification path                                   | Tests                                                                |
| ---------------------- | ------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| `journey.step.updated` | Agency journey service/live publisher | Task-management live sync; journey/project query refetch | None                                                | Live connection tests; journey query-key predicate contract test     |
| `timer.updated`        | Time-tracking service/live publisher  | Shared agency query cache and presence members           | Timer activity fanout                               | `agency-query-cache.test.ts`, live connection tests                  |
| `task.updated`         | Task service/live publisher           | Shared agency task cache                                 | Task assignment/message fanout where applicable     | `agency-query-cache.test.ts`, live connection tests                  |
| `notification.created` | Notifications service/live bridge     | Notifications query cache and unread count               | Push/in-app delivery owned by notifications service | Fanout tests, live connection tests, `notifications-queries.test.ts` |

## Rules

- Live events are Zod-discriminated before publish/consume.
- Each event has one shared live transport owner and a domain-specific cache consumer.
- Durable notification writes occur before `publishNotificationCreated`.
- Cross-feature cache patching remains in shared live handlers; domain-only cache behavior stays in the affected feature.

## Remaining Review

- [x] Add a machine-readable registry and verify it against the live event definitions.
- [x] Add explicit tests for every event producer/consumer pairing at the cache/store or query-predicate boundary. Notification, task, timer, task-message, and journey consumers now have focused contract coverage.
- [x] Audit report/billing/resourcing cross-feature reads against service ownership; see [`golden-file-cross-feature-ownership-audit.md`](golden-file-cross-feature-ownership-audit.md).
