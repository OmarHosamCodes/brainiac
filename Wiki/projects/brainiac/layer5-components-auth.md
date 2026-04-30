---
title: Layer 5 — Auth Components (SignInForm, SignUpForm)
tags: [layer5, components, vue, auth, forms]
---

# Layer 5 — Auth Components

## 1. `SignInForm.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/SignInForm.vue`

Email/password sign-in form. Validates fields client-side. On submit calls `useAuthClient().signIn.email({ email, password })`. Emits `switch-to-sign-up` event when user wants to register.

### Incoming Dependents

| Consumer          | Mechanism                                                         |
| ----------------- | ----------------------------------------------------------------- |
| `pages/login.vue` | rendered when `showSignIn === true`, handles `@switch-to-sign-up` |

### Outgoing Dependencies

| Dependency                                      | Mechanism                         |
| ----------------------------------------------- | --------------------------------- |
| `useAuthClient()`                               | calls `authClient.signIn.email()` |
| Nuxt UI (`UForm`, `UInput`, `UButton`, `UIcon`) | form primitives                   |

**Standalone Status:** Not standalone — depends on `useAuthClient`, Nuxt UI.

---

## 2. `SignUpForm.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/SignUpForm.vue`

Email/password/confirm-password registration form. Validates matching passwords. On submit calls `useAuthClient().signUp.email({ email, password, name })`. Emits `switch-to-sign-in` event.

### Incoming Dependents

| Consumer          | Mechanism                                                          |
| ----------------- | ------------------------------------------------------------------ |
| `pages/login.vue` | rendered when `showSignIn === false`, handles `@switch-to-sign-in` |

### Outgoing Dependencies

| Dependency                                      | Mechanism                         |
| ----------------------------------------------- | --------------------------------- |
| `useAuthClient()`                               | calls `authClient.signUp.email()` |
| Nuxt UI (`UForm`, `UInput`, `UButton`, `UIcon`) | form primitives                   |

**Standalone Status:** Not standalone — depends on `useAuthClient`, Nuxt UI.
