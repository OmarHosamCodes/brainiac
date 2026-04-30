---
title: Layer 3 — appRouter (Root Router)
tags: [layer3, api, orpc, router]
---

# Layer 3 — appRouter (Root Router)

**Entity:** `appRouter` — root ORPC router object  
**Type:** ORPC Router (aggregate)  
**File:** `packages/api/src/routers/index.ts`

## Exports

| Export            | Type                             | Description                                |
| ----------------- | -------------------------------- | ------------------------------------------ |
| `appRouter`       | `object`                         | Top-level router combining all sub-routers |
| `AppRouter`       | `typeof appRouter`               | TypeScript type of the full router tree    |
| `AppRouterClient` | `RouterClient<typeof appRouter>` | Type used by the web client via `useOrpc`  |

## Router Tree

```
appRouter
├── agent         → agentRouter         (routers/agent.ts)
├── agencyOps     → agencyOpsRouter     (routers/agency-ops/index.ts)
├── billing       → billingRouter       (routers/billing/index.ts)
├── ...systemRouter (spread — healthCheck, privateData at root level)
├── team          → teamRouter          (routers/team/index.ts)
└── workspace     → workspaceRouter     (routers/workspace/index.ts)
```

> `systemRouter` is spread (`...systemRouter`) so its procedures (`healthCheck`, `privateData`) live at the `appRouter` root, not under a `system` namespace.

## Outgoing Dependencies

| Dependency                      | Mechanism                             |
| ------------------------------- | ------------------------------------- |
| `./agency-ops`                  | imports `agencyOpsRouter`             |
| `./agent`                       | imports `agentRouter`                 |
| `./billing`                     | imports `billingRouter`               |
| `./system`                      | imports `systemRouter` (spread)       |
| `./team`                        | imports `teamRouter`                  |
| `./workspace`                   | imports `workspaceRouter`             |
| `@orpc/server` (`RouterClient`) | used to derive `AppRouterClient` type |

## Incoming Dependents

| Consumer                              | Mechanism                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/lib/handlers.ts`     | imports `appRouter`; passes it to `RPCHandler` (serves `/rpc/*`) and `OpenAPIHandler` (serves `/api-reference/*`) |
| `apps/web` (via `useOrpc` composable) | consumes `AppRouterClient` type for end-to-end type-safe RPC calls                                                |

## Standalone Status

Not standalone — aggregates all six sub-routers.
