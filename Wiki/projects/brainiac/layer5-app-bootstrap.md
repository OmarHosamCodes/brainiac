---
title: Layer 5 — App Bootstrap (Entry, Layout, Plugins)
tags: [layer5, nuxt, vue, plugins, auth, orpc, vue-query, layout]
---

# Layer 5 — App Bootstrap (Entry, Layout, Plugins)

## 1. Root Entry — `app.vue`

**Type:** Vue Component (Root)  
**File:** `apps/web/app/app.vue`

Wraps the entire Nuxt application. Renders: `NuxtAnnouncer`, `NuxtRouteAnnouncer`, `NuxtLoadingIndicator`, `UApp` (Nuxt UI provider) → `NuxtLayout` → `NuxtPage`, and `VueQueryDevtools` (dev only).

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| Nuxt SSR/CSR runtime | Auto-loaded as root app component |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@tanstack/vue-query-devtools` | imports `VueQueryDevtools` for dev panel |
| Nuxt UI | uses `UApp` slot provider |

**Standalone Status:** Not standalone — depends on Nuxt framework, Nuxt UI, Vue Query devtools.

---

## 2. App Config — `app.config.ts`

**Type:** Nuxt App Config  
**File:** `apps/web/app/app.config.ts`

Configures Nuxt UI theme: `primary: "emerald"`, `neutral: "zinc"` color palette. No runtime logic.

**Standalone Status:** Standalone configuration — no external imports.

---

## 3. Default Layout — `layouts/default.vue`

**Type:** Nuxt Layout  
**File:** `apps/web/app/layouts/default.vue`

Full-height `h-screen overflow-hidden` container with light/dark background. Renders `<slot />` for page content.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `pages/pricing.vue` | `definePageMeta({ layout: "default" })` |
| `pages/billing/index.vue` | `definePageMeta({ layout: "default" })` |
| `pages/billing/success.vue` | `definePageMeta({ layout: "default" })` |
| All pages without `layout: false` | Nuxt auto-applies as default layout |

**Standalone Status:** Standalone — no external imports.

---

## 4. Plugin — `plugins/auth-client.ts`

**Type:** Nuxt Plugin  
**File:** `apps/web/app/plugins/auth-client.ts`

Creates a `better-auth` client with `polarClient()` plugin. Reads `config.public.serverUrl` from Nuxt runtime config. Provides `$authClient` globally via `useNuxtApp()`.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `composables/useAuthClient.ts` | calls `useNuxtApp().$authClient` |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `better-auth/vue` | imports `createAuthClient` |
| `@polar-sh/better-auth` | imports `polarClient` plugin |
| Nuxt runtime config | reads `config.public.serverUrl` |

**Standalone Status:** Not standalone — requires `better-auth`, `@polar-sh/better-auth`, Nuxt runtime config.

---

## 5. Plugin — `plugins/orpc.ts`

**Type:** Nuxt Plugin  
**File:** `apps/web/app/plugins/orpc.ts`

Creates an oRPC client targeting `${serverUrl}/rpc`. Uses `RPCLink` with `credentials: "include"` for cookie-based auth. Wraps client in `createTanstackQueryUtils` and provides `$orpc` globally.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `composables/useOrpc.ts` | calls `useNuxtApp().$orpc` |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/api/routers/index` | imports `AppRouterClient` type |
| `@orpc/client` | imports `createORPCClient` |
| `@orpc/client/fetch` | imports `RPCLink` |
| `@orpc/tanstack-query` | imports `createTanstackQueryUtils` |
| Nuxt runtime config | reads `config.public.serverUrl` |

**Standalone Status:** Not standalone — requires `@orpc/*`, `@brainiac/api`, Nuxt runtime config.

---

## 6. Plugin — `plugins/vue-query.ts`

**Type:** Nuxt Plugin  
**File:** `apps/web/app/plugins/vue-query.ts`

Instantiates a `QueryClient` with `staleTime: 5000ms`. Attaches a `QueryCache` with a global error handler that fires `useToast().add()` for all query failures. Handles SSR dehydration (server: `dehydrate → useState`) and client rehydration (`hydrate ← useState`).

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| All composables using `useQuery` / `useMutation` | TanStack Vue Query context provider |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@tanstack/vue-query` | imports `QueryClient`, `QueryCache`, `VueQueryPlugin`, `dehydrate`, `hydrate` |
| Nuxt `useToast` | shows error toasts on query failure |
| Nuxt `useState` | SSR state bridge (`vue-query` key) |

**Standalone Status:** Not standalone — requires TanStack Vue Query, Nuxt utilities.
