# Date and Nullability Audit

Audited 2026-07-10 across the API list, filter, dashboard, summary, and live-event contracts.

## Rules

- API timestamps are ISO-8601 strings validated with `z.string().datetime()`; service mappers call `.toISOString()` on non-null database timestamps.
- Database nullable timestamps are represented as `z.string().datetime().nullable()` rather than empty strings or omitted values.
- Optional request filters use `.optional()` only when omission has distinct query semantics; a nullable mutation field uses `.nullable().optional()` when clients can explicitly clear a value.
- Range filters use required `from`/`to`, `rangeFrom`/`rangeTo`, or `startDate`/`endDate` pairs and are validated as datetimes.
- Summary endpoints preserve nullable period/aggregate fields when no data exists instead of manufacturing zero dates.

## Reviewed Families

| Family                 | Contract source                                       | Notable nullable fields                                            |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| Clients/projects/tasks | `agency-ops/shared/schemas.ts`, clients/tasks routers | archived/due dates, optional task links, avatars                   |
| Time tracking/reports  | shared schemas, time-tracking router, reports input   | task links, deleted/ended timestamps, report ranges                |
| Billing                | billing router                                        | budget periods, effective rates, invoice issued/paid dates         |
| Resourcing             | resourcing router and tenure service contracts        | tenure/intern dates and optional exemptions                        |
| Notifications/live     | notification schemas and live event schema            | read/seen dates, actor identity, nullable timer                    |
| Team/workspace/agent   | team schemas, workspace schemas, agent schemas        | membership/update timestamps, archived conversations, usage latest |

## Exceptions

- `createdAt`, `updatedAt`, and required event/range timestamps are non-null by schema design.
- `dueDate`, `archivedAt`, `deletedAt`, `completedAt`, `endedAt`, `readAt`, `seenAt`, `paidAt`, `issuedAt`, and tenure/intern end dates remain nullable because the underlying lifecycle state is genuinely incomplete.
- No endpoint uses a nullable timestamp without a corresponding nullable Zod contract in the reviewed families.
