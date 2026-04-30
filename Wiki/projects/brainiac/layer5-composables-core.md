---
title: Layer 5 — Core Composables (useOrpc, useAuthClient, useBilling, useDashboardLayout)
tags: [layer5, composables, nuxt, vue, auth, billing, orpc]
---

# Layer 5 — Core Composables

## 1. `useOrpc`

**Type:** Composable  
**File:** `apps/web/app/composables/useOrpc.ts`

Thin accessor. Returns `useNuxtApp().$orpc` (the `createTanstackQueryUtils`-wrapped oRPC client provided by `plugins/orpc.ts`).

### Incoming Dependents

| Consumer                             | Mechanism                                                 |
| ------------------------------------ | --------------------------------------------------------- |
| `useWorkspaceStore` (Pinia)          | calls `useOrpc()` for workspace queries/mutations         |
| `useAgencyTimeTrackingStore` (Pinia) | calls `useOrpc()` for agency mutations                    |
| `useBilling`                         | calls `useOrpc()` for billing state query                 |
| `useTeamSelection`                   | calls `useOrpc()` for team list/detail queries            |
| `useTeamManagement`                  | calls `useOrpc()` for team CRUD mutations                 |
| `useNodeSharing`                     | calls `useOrpc()` for share/unshare mutations             |
| `useWorkspaceNodeSharing`            | calls `useOrpc()` for share/unshare mutations + team list |
| `useDashboardAgentChat`              | calls `useOrpc()` for agent/conversation queries          |
| `pages/marketplace.vue`              | calls `orpc.workspace.marketplace.list.infiniteOptions`   |
| `pages/node/[id].vue`                | creates marketplace save + agent chat mutations           |

### Outgoing Dependencies

| Dependency        | Mechanism                           |
| ----------------- | ----------------------------------- |
| `plugins/orpc.ts` | reads `$orpc` from Nuxt app context |

**Standalone Status:** Not standalone — depends on Nuxt plugin system + oRPC plugin.

---

## 2. `useAuthClient` + `useAuthSession`

**Type:** Composable  
**File:** `apps/web/app/composables/useAuthClient.ts`

- `useAuthClient()` → returns `useNuxtApp().$authClient` (provided by `plugins/auth-client.ts`)
- `useAuthSession()` → calls `useAuthClient().useSession()` — returns reactive Better Auth session object

### Incoming Dependents

| Consumer                  | Mechanism                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `useBilling`              | calls `useAuthClient()` for `checkout` + `customer.portal()`, `useAuthSession()` for auth guard |
| `useWorkspaceStore`       | calls `useAuthSession()` for auth guard                                                         |
| `useTeamSelection`        | calls `useAuthSession()` for auth guard                                                         |
| `useTeamManagement`       | calls `useAuthSession()` for `currentUserId`                                                    |
| `useWorkspaceNodeSharing` | calls `useAuthSession()` for `currentUserId`                                                    |
| `useDashboardAgentChat`   | calls `useAuthSession()`                                                                        |
| `middleware/auth.ts`      | calls both for session guard                                                                    |
| `pages/login.vue`         | calls `useAuthSession()` to watch for redirect                                                  |
| `pages/pricing.vue`       | calls `useAuthSession()` for `isAuthenticated`                                                  |

### Outgoing Dependencies

| Dependency               | Mechanism                                 |
| ------------------------ | ----------------------------------------- |
| `plugins/auth-client.ts` | reads `$authClient` from Nuxt app context |

**Standalone Status:** Not standalone — depends on Nuxt plugin system + auth-client plugin.

---

## 3. `useBilling`

**Type:** Composable  
**File:** `apps/web/app/composables/useBilling.ts`

Manages billing state via `useQuery(orpc.billing.state)` (staleTime 5 min, auth-gated). Computes `tier`, `isPro`, `limits` (with free-tier fallback), `subscription`. Exposes:

- `checkout(slug)` → calls `authClient.checkout({ slug })`
- `openPortal()` → calls `authClient.customer.portal()`
- `refreshBillingState()` → `queryClient.invalidateQueries` on billing state query key

### Incoming Dependents

| Consumer                    | Mechanism                                                                |
| --------------------------- | ------------------------------------------------------------------------ |
| `pages/pricing.vue`         | reads `isPro`, calls `checkout`                                          |
| `pages/billing/index.vue`   | reads `isPro`, `subscription`, `limits`, calls `checkout` + `openPortal` |
| `pages/billing/success.vue` | calls `refreshBillingState()`                                            |

### Outgoing Dependencies

| Dependency                  | Mechanism                                                      |
| --------------------------- | -------------------------------------------------------------- |
| `@brainiac/workspace/tiers` | imports `TierLimits` type                                      |
| `@tanstack/vue-query`       | `useQuery`, `useQueryClient`                                   |
| `useOrpc()`                 | calls `orpc.billing.state.queryOptions()`                      |
| `useAuthClient()`           | calls `authClient.checkout()` + `authClient.customer.portal()` |
| `useAuthSession()`          | auth guard for query enabled state                             |

**Standalone Status:** Not standalone — depends on `useOrpc`, `useAuthClient`, `useAuthSession`, TanStack Vue Query, `@brainiac/workspace/tiers`.

---

## 4. `useDashboardLayout`

**Type:** Composable  
**File:** `apps/web/app/composables/useDashboardLayout.ts`

Manages two boolean layout state refs:

- `isChatVisible` (default: `options.chatVisibleByDefault ?? true`)
- `isTeamAsideCompact` (default: `true`)

### Incoming Dependents

| Consumer              | Mechanism                                                                           |
| --------------------- | ----------------------------------------------------------------------------------- |
| `pages/dashboard.vue` | calls `useDashboardLayout({ chatVisibleByDefault: false })`, destructures both refs |

**Standalone Status:** Standalone — only Vue `ref` import.
