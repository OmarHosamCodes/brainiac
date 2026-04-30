---
title: "@brainiac/auth — BetterAuth Configuration"
category: projects
tags: [auth, better-auth, polar, drizzle, session]
summary: "Server-side authentication instance: BetterAuth with Drizzle adapter, email/password, and Polar billing plugins (checkout, portal, webhooks)."
provenance:
  extracted: 1.0
  inferred: 0.0
  ambiguous: 0.0
updated: 2026-04-23
layer: 2
---

# @brainiac/auth — BetterAuth Configuration

## Primary Entity

- **Name:** `auth`
- **Type:** Auth Instance (singleton)
- **File:** `packages/auth/src/index.ts`
- **Exported symbol:** `auth` (`betterAuth(...)` instance)

---

## Configuration

### Database Adapter

- **Adapter:** `drizzleAdapter(db, { provider: "pg", schema })`
- **Schema passed:** `@brainiac/db/schema/auth` — `user`, `session`, `account`, `verification` tables
- **DB instance:** `db` from `@brainiac/db`

### Authentication Methods

| Method           | Config          |
| ---------------- | --------------- |
| Email + Password | `enabled: true` |

### Cookie Security

| Attribute  | Value    |
| ---------- | -------- |
| `sameSite` | `"none"` |
| `secure`   | `true`   |
| `httpOnly` | `true`   |

### Plugins

#### `polar(...)` — Billing Integration

- **Polar SDK client:** `new Polar({ accessToken: env.POLAR_ACCESS_TOKEN, server: env.POLAR_SERVER })`
- **`createCustomerOnSignUp: true`** — creates Polar customer record on every new signup
- **Sub-plugins:**

| Sub-plugin | Config                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout` | `productId: env.POLAR_PRODUCT_PRO`, `slug: "pro"`, `successUrl: "/billing/success?checkout_id={CHECKOUT_ID}"`, `authenticatedUsersOnly: true`, `returnUrl: /pricing` |
| `portal`   | `returnUrl: /dashboard`                                                                                                                                              |
| `webhooks` | `secret: env.POLAR_WEBHOOK_SECRET`                                                                                                                                   |

---

## Relationships

| Role                        | Entity                        | Mechanism                                                                                                                                    |
| --------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Incoming (Dependents)**   | `packages/api/src/context.ts` | calls `auth.api.getSession({ headers })` to extract session from every ORPC request                                                          |
| **Outgoing (Dependencies)** | `@brainiac/db` (`db`)         | `drizzleAdapter(db, ...)` — reads/writes `user`, `session`, `account`, `verification` tables                                                 |
| **Outgoing (Dependencies)** | `@brainiac/db/schema/auth`    | schema map passed to `drizzleAdapter`                                                                                                        |
| **Outgoing (Dependencies)** | `@brainiac/env/server`        | `env.POLAR_ACCESS_TOKEN`, `env.POLAR_WEBHOOK_SECRET`, `env.POLAR_SERVER`, `env.BETTER_AUTH_SECRET`, `env.BETTER_AUTH_URL`, `env.CORS_ORIGIN` |
| **Outgoing (Dependencies)** | `@polar-sh/better-auth`       | `polar()`, `checkout()`, `portal()`, `webhooks()` plugin factories                                                                           |
| **Outgoing (Dependencies)** | `@polar-sh/sdk`               | `new Polar(...)` client                                                                                                                      |
| **Outgoing (Dependencies)** | `better-auth`                 | `betterAuth()` factory                                                                                                                       |

## Standalone Status

**Not standalone** — depends on `@brainiac/db`, `@brainiac/env/server`, `better-auth`, `@polar-sh/better-auth`, `@polar-sh/sdk`.
