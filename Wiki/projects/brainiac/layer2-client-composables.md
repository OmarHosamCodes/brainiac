---
title: "Client Composables — useOrpc, useAuthClient, useAuthSession"
category: projects
tags: [composable, orpc, auth, nuxt-plugin, state]
summary: "Thin wrapper composables that expose Nuxt plugin-injected ORPC client and BetterAuth client to the Vue component tree."
provenance:
  extracted: 1.0
  inferred: 0.0
  ambiguous: 0.0
updated: 2026-04-23
layer: 2
---

# Client Composables — useOrpc, useAuthClient, useAuthSession

## Primary Entities

| Name | Type | File |
|---|---|---|
| `useOrpc` | Composable | `apps/web/app/composables/useOrpc.ts` |
| `useAuthClient` | Composable | `apps/web/app/composables/useAuthClient.ts` |
| `useAuthSession` | Composable | `apps/web/app/composables/useAuthClient.ts` |

---

## `useOrpc`

```ts
export function useOrpc() {
  return useNuxtApp().$orpc;
}
```

- **Mechanism:** Reads `$orpc` from Nuxt plugin context via `useNuxtApp()`
- **Returns:** The ORPC client instance (typed proxy to all API routers)
- **Used by:** `useWorkspaceStore`, `useAgencyTimeTrackingStore`, all composables that call API procedures

---

## `useAuthClient`

```ts
export function useAuthClient() {
  return useNuxtApp().$authClient;
}
```

- **Mechanism:** Reads `$authClient` from Nuxt plugin context via `useNuxtApp()`
- **Returns:** BetterAuth client instance

---

## `useAuthSession`

```ts
export function useAuthSession() {
  return useAuthClient().useSession();
}
```

- **Mechanism:** Calls `.useSession()` on the BetterAuth client — returns a Vue reactive session ref
- **Returns:** `Ref<{ data: { user, session } | null }>` (BetterAuth session shape)
- **Used by:** `useWorkspaceStore` (guards edits, watches user ID changes), `useAgencyTimeTrackingStore` (reads `user.id`)

---

## Relationships

| Role | Entity | Mechanism |
|---|---|---|
| **Incoming (Dependents)** | `useWorkspaceStore` | `useOrpc()`, `useAuthSession()` |
| **Incoming (Dependents)** | `useAgencyTimeTrackingStore` | `useOrpc()`, `useAuthSession()` (via `useAuthClient`) |
| **Incoming (Dependents)** | All composables calling ORPC procedures | `useOrpc()` |
| **Outgoing (Dependencies)** | Nuxt plugin `$orpc` | `useNuxtApp().$orpc` — ORPC client injected by web app plugin |
| **Outgoing (Dependencies)** | Nuxt plugin `$authClient` | `useNuxtApp().$authClient` — BetterAuth client injected by web app plugin |

## Standalone Status

**Not standalone** — both depend on Nuxt plugin injection (`useNuxtApp()`). `useAuthSession` additionally delegates to `useAuthClient().useSession()`.
