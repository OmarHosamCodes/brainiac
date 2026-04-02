# Brainiac API Bruno Suite (Non-AI)

This Bruno collection validates non-AI API behavior across auth, system, team, workspace, and agency operations.

## Scope

- Included:
  - `/api/auth/*`
  - `/rpc/healthCheck`
  - `/rpc/privateData`
  - `/rpc/team/*`
  - `/rpc/workspace/*`
  - `/rpc/agencyOps/*`
- Excluded:
  - `/rpc/agent/*` (AI routes)

## Structure

- `01-auth`: sign-up/sign-in/sign-out/session and invalid password
- `02-system`: public health and private auth checks
- `03-team`: team lifecycle and role-based membership behavior
- `04-workspace`: private/team sharing and cross-owner delete behavior
- `05-agency-ops`: client/project/sprint/item/timer/time-entry/report scenarios
- `06-cleanup`: remove created team and sign out

## Run Prerequisites

1. Start PostgreSQL and apply schema.
2. Start API server at `http://localhost:3000`.
3. Seed baseline data if needed:

```bash
bun run db:push
bun run db:seed
```

## Execute

Open Bruno and run collection `tests/bruno/brainiac-api` with environment `Local`.

The suite is stateful by design and should be run in folder order:

1. `01-auth`
2. `02-system`
3. `03-team`
4. `04-workspace`
5. `05-agency-ops`
6. `06-cleanup`
