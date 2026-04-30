---
title: Layer 5 — Public Pages (index, login, pricing, privacy, terms)
tags: [layer5, pages, nuxt, vue, auth, billing, legal]
---

# Layer 5 — Public Pages

## 1. Landing Page — `pages/index.vue`

**Type:** Nuxt Page (Route `/`)  
**File:** `apps/web/app/pages/index.vue`

Hero section with animated badge, title, body copy, CTA buttons, and a live system status bar. Performs an `orpc.healthCheck` query on mount (SSR-prefetched via `onServerPrefetch`). Status bar shows green pulse if `healthCheck.isSuccess`.

### Incoming Dependents

| Consumer    | Mechanism                |
| ----------- | ------------------------ |
| Root router | Nuxt auto-routing at `/` |

### Outgoing Dependencies

| Dependency                   | Mechanism                                                      |
| ---------------------------- | -------------------------------------------------------------- |
| `useOrpc()`                  | calls `orpc.healthCheck.queryOptions()` via TanStack Vue Query |
| `@tanstack/vue-query`        | `useQuery` for health check                                    |
| `Header` component           | rendered in template                                           |
| Nuxt UI (`UButton`, `UIcon`) | CTA buttons + icons                                            |

**Standalone Status:** Not standalone — depends on `useOrpc`, TanStack Vue Query, Header, Nuxt UI.

---

## 2. Auth Page — `pages/login.vue`

**Type:** Nuxt Page (Route `/login`)  
**File:** `apps/web/app/pages/login.vue`  
**Layout:** `false` (no layout wrapper)

Two-panel auth page. Left pane: branded hero with stats. Right pane: conditionally renders `SignInForm` or `SignUpForm` controlled by `showSignIn` ref. Watches `useAuthSession()` — redirects to `/dashboard` on successful auth.

### Incoming Dependents

| Consumer               | Mechanism                                       |
| ---------------------- | ----------------------------------------------- |
| `middleware/auth.ts`   | redirects unauthenticated users here            |
| `pages/login.vue` self | `navigateTo("/dashboard")` on session establish |

### Outgoing Dependencies

| Dependency                 | Mechanism                                           |
| -------------------------- | --------------------------------------------------- |
| `useAuthSession()`         | watches session, redirects on `session.data` truthy |
| `SignInForm` component     | rendered when `showSignIn === true`                 |
| `SignUpForm` component     | rendered when `showSignIn === false`                |
| Nuxt UI (`UIcon`, `ULink`) | icons + navigation links                            |

**Standalone Status:** Not standalone — depends on auth composables, two form components, Nuxt UI.

---

## 3. Pricing Page — `pages/pricing.vue`

**Type:** Nuxt Page (Route `/pricing`)  
**File:** `apps/web/app/pages/pricing.vue`  
**Layout:** `default`

Two-column pricing grid (Free vs Pro tiers). Lists 8 feature comparisons from a static `features` array. Calls `useBilling()` for `isPro` + `checkout`. `handleCheckout` navigates to `/login` if unauthenticated, `/billing` if already Pro, else calls `checkout("pro")`.

### Incoming Dependents

| Consumer          | Mechanism                       |
| ----------------- | ------------------------------- |
| Root router       | Nuxt auto-routing at `/pricing` |
| `pages/index.vue` | `UButton to="/pricing"`         |

### Outgoing Dependencies

| Dependency                                      | Mechanism                       |
| ----------------------------------------------- | ------------------------------- |
| `useAuthSession()`                              | computes `isAuthenticated`      |
| `useBilling()`                                  | calls `checkout`, reads `isPro` |
| `Header` component                              | rendered in template            |
| Nuxt UI (`UCard`, `UButton`, `UBadge`, `UIcon`) | UI primitives                   |

**Standalone Status:** Not standalone — depends on auth + billing composables, Header, Nuxt UI.

---

## 4. Privacy Policy — `pages/privacy.vue`

**Type:** Nuxt Page (Route `/privacy`)  
**File:** `apps/web/app/pages/privacy.vue`

Renders 10 privacy policy sections (scope, data collected, AI processing, sharing, retention, rights, security, international transfers, updates) via `LegalPageShell`. Uses `useSeoMeta` for page title/description.

### Incoming Dependents

| Consumer          | Mechanism                       |
| ----------------- | ------------------------------- |
| Root router       | Nuxt auto-routing at `/privacy` |
| `pages/login.vue` | `ULink to="/privacy"`           |

### Outgoing Dependencies

| Dependency                 | Mechanism                                                                   |
| -------------------------- | --------------------------------------------------------------------------- |
| `LegalPageShell` component | passes `title`, `summary`, `effectiveDate`, `lastUpdated`, `sections` props |
| Nuxt `useSeoMeta`          | sets `title` + `description` meta tags                                      |

**Standalone Status:** Not standalone — depends on `LegalPageShell`, Nuxt `useSeoMeta`.

---

## 5. Terms of Service — `pages/terms.vue`

**Type:** Nuxt Page (Route `/terms`)  
**File:** `apps/web/app/pages/terms.vue`

Structurally identical to `privacy.vue` — renders ToS sections via `LegalPageShell`.

### Outgoing Dependencies

| Dependency                 | Mechanism                      |
| -------------------------- | ------------------------------ |
| `LegalPageShell` component | passes legal sections as props |

**Standalone Status:** Not standalone — depends on `LegalPageShell`.
