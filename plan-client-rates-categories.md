# Client rates per hour & categories

## 1. DB schema

Add to `agencyOpsClient`:

| Column              | Type                                             | Default      |
| ------------------- | ------------------------------------------------ | ------------ |
| `category`          | `text('category').notNull().default('external')` | `"external"` |
| `billableRateCents` | `integer('billable_rate_cents')`                 | `null`       |
| `currency`          | `text('currency').notNull().default('USD')`      | `"USD"`      |

Add migration `0021_agency_client_rate_category.sql`.

## 2. API

- Extend `agencyClientSchema` to include:
  - `category: z.enum(["internal", "external"])`
  - `billableRateCents: z.number().int().nonnegative().nullable()`
  - `currency: z.string().min(1)`

- Accept optional `category`, `billableRateCents`, `currency` in:
  - `clients.create`
  - `clients.update`
  - `listAgencyClients` returns them

## 3. Web state

Update client types in:

- `apps/web/src/stores/agency-ops.ts` (`AgencyClient`)
- `apps/web/src/stores/agency-optimistic.ts` (`AgencyOptimisticClient`)

Extend `createClient` / `updateClient` to pass new fields. Default create = `external`, no rate.

## 4. Clients table UI (`AgencyClientsSurface`)

Add columns:

- **Category** — badge with `Internal` / `External` (with distinct style)
- **Billable / hour** — formatted like existing rates: `$0/hr`, `Not set`

Replace rename-only popover with an **Edit** popover that includes:

- client name
- category `<select>`: External / Internal
- billable rate `<input type="number">` (dollars, convert to cents)
- Save button

## 5. New client popover (`agency-segment-filters.tsx`)

Add optional fields to "New client" form:

- category `<select>` default `external`
- billable hourly rate `<input type="number">`

## 6. Verification

- `bun run check-types`
- `bun run check` if time permits

## Skipped (ponytail:)

Custom user-defined categories. Add when `internal/external` isn't enough.
