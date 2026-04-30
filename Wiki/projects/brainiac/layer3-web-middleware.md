---
title: Layer 3 — Web Route Middleware (Nuxt)
tags: [layer3, web, nuxt, middleware, auth, workspace]
---

# Layer 3 — Web Route Middleware (Nuxt)

## 1. Auth Middleware

**Entity:** `auth` Nuxt route middleware  
**Type:** Nuxt Route Middleware  
**File:** `apps/web/app/middleware/auth.ts`

### Execution Mechanism

- Declared via `defineNuxtRouteMiddleware`.
- Skips entirely on server (`if (import.meta.server) return`).
- Client-only:
  1. Calls `useAuthClient()` composable to get the BetterAuth client.
  2. Reads `useAuthSession()` reactive session ref.
  3. If `session.value.isPending` → awaits `authClient.getSession()` to hydrate the session.
  4. If `!session.value.data` → calls `navigateTo("/login")`.

### Outgoing Dependencies

| Dependency         | Mechanism                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `useAuthClient()`  | Layer 2 composable (`apps/web/app/composables/useAuthClient.ts`) — returns BetterAuth client instance |
| `useAuthSession()` | Layer 2 composable — returns reactive session ref                                                     |

### Incoming Dependents

Applied as a route middleware on protected pages/layouts via `definePageMeta({ middleware: ["auth"] })` or globally in layout files.

### Standalone Status

Not standalone — depends on `useAuthClient`, `useAuthSession`.

---

## 2. Workspace Middleware

**Entity:** `workspace` Nuxt route middleware  
**Type:** Nuxt Route Middleware  
**File:** `apps/web/app/middleware/workspace.ts`

### Execution Mechanism

- Declared via `defineNuxtRouteMiddleware`.
- Skips entirely on server (`if (import.meta.server) return`).
- Client-only:
  1. Calls `useWorkspaceStore()` to get the Pinia workspace store.
  2. Awaits `workspaceStore.preloadWorkspace()` — triggers `orpc.workspace.get.useQuery()` fetch if not yet loaded.

### Outgoing Dependencies

| Dependency            | Mechanism                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `useWorkspaceStore()` | Layer 2 Pinia store (`apps/web/app/stores/workspace.ts`) — calls `preloadWorkspace()` action which executes `orpc.workspace.get` ORPC query |

### Incoming Dependents

Applied as a route middleware on workspace-requiring pages via `definePageMeta({ middleware: ["workspace"] })`.

### Standalone Status

Not standalone — depends on `useWorkspaceStore`.
