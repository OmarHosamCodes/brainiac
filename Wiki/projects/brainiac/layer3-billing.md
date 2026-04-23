---
title: Layer 3 — Billing State & Guard
tags: [layer3, api, billing, polar, middleware]
---

# Layer 3 — Billing State & Guard

## 1. billing.ts — State Normalizer

**Entity:** `billing.ts` — billing state types and normalizer  
**Type:** Pure Utility Module  
**File:** `packages/api/src/billing.ts`

### Exported Types
| Export | Description |
|---|---|
| `BillingSubscription` | `{ productId, status, currentPeriodEnd, source: "polar"\|"lifetime", isLifetime }` |
| `BillingState` | `{ tier: Tier, subscription: BillingSubscription\|null, limits: TIER_LIMITS[Tier] }` |

### Exported Functions
| Function | Signature | Description |
|---|---|---|
| `getFreeBillingState` | `() → BillingState` | Returns `{ tier: "free", subscription: null, limits: TIER_LIMITS.free }` |
| `getLifetimeBillingState` | `() → BillingState` | Returns pro tier with `source: "lifetime"`, no `currentPeriodEnd` |
| `normalizeBillingState` | `(customerState: CustomerState\|null, options) → BillingState` | Converts a Polar `CustomerState` to `BillingState`; matches against `env.POLAR_PRODUCT_PRO` CSV; falls back to any active subscription; falls back to lifetime/free |

### Normalization Logic
1. If `customerState.activeSubscriptions` is empty → return `lifetimePro ? getLifetimeBillingState() : getFreeBillingState()`
2. Match first subscription whose `productId` is in `env.POLAR_PRODUCT_PRO` (comma-separated)
3. Fallback: take `activeSubscriptions[0]` as Pro
4. Otherwise return lifetime/free fallback

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/env/server` (`env`) | reads `env.POLAR_PRODUCT_PRO` CSV string to build the list of recognised Pro product IDs |
| `@brainiac/workspace/tiers` (`Tier`, `TIER_LIMITS`) | reads tier constant limits for `free` and `pro` |
| `@polar-sh/sdk` (`CustomerState`) | type-annotates the raw Polar customer state input |

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `packages/api/src/billing-guard.ts` | imports `getFreeBillingState`, `normalizeBillingState` |

### Standalone Status
Not standalone — depends on `@brainiac/env/server`, `@brainiac/workspace/tiers`, `@polar-sh/sdk`.

---

## 2. billing-guard.ts — Guard Middleware & State Fetcher

**Entity:** `billing-guard.ts` — `getBillingStateForUser` + `requirePro` ORPC middleware  
**Type:** ORPC Middleware + Service Function  
**File:** `packages/api/src/billing-guard.ts`

### Exported Members
| Export | Description |
|---|---|
| `getBillingStateForUser(userId)` | async function; returns `BillingState` for a user |
| `requirePro` | ORPC middleware (`o.middleware`); gate for Pro-only procedures |

### `getBillingStateForUser` Logic
1. Queries `user.lifetimePro` column from Drizzle `user` table with `eq(user.id, userId)` — gets lifetime override flag.
2. Calls `polar.customers.getStateExternal({ externalId: userId })` via Polar SDK.
3. On success → `normalizeBillingState(customerState, { lifetimePro })`.
4. On catch (no Polar customer record) → `lifetimePro ? normalizeBillingState(null, { lifetimePro }) : getFreeBillingState()`.

### `requirePro` Middleware Logic
1. Throws `ORPCError("UNAUTHORIZED")` if `context.session?.user` is absent.
2. Calls `getBillingStateForUser(context.session.user.id)`.
3. Throws `ORPCError("FORBIDDEN", { data: { requiredTier: "pro", currentTier } })` if `billing.tier !== "pro"`.
4. Injects `{ billing }` into downstream context via `next({ context: { billing } })`.

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@orpc/server` (`ORPCError`, `os`) | constructs `o.middleware`, throws typed errors |
| `@brainiac/db` (`db`) | executes `db.select({ lifetimePro: user.lifetimePro }).from(user).where(eq(user.id, userId)).limit(1)` |
| `@brainiac/db/schema/auth` (`user`) | Drizzle `user` table schema for `lifetimePro` column |
| `@brainiac/env/server` (`env`) | reads `POLAR_ACCESS_TOKEN`, `POLAR_SERVER` to instantiate Polar SDK |
| `@polar-sh/sdk` (`Polar`) | instantiated once at module level; calls `polar.customers.getStateExternal` |
| `./context` (`Context`) | type-annotates `os.$context<Context>()` |
| `./billing` | imports `getFreeBillingState`, `normalizeBillingState` |

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `packages/api/src/procedures.ts` | imports `getBillingStateForUser` for use inside `requirePro` middleware of `protectedProProcedure` |
| `routers/billing/index.ts` | calls `getBillingStateForUser(context.session.user.id)` in the `billing.state` procedure handler |
| `routers/workspace/index.ts` | calls `getBillingStateForUser` inside `workspace.save` and `team.create` handlers for tier-limit enforcement |
| `routers/team/index.ts` | calls `getBillingStateForUser` inside `team.create` handler |
| `routers/agent.ts` | calls `getBillingStateForUser` inside `agent.chat.turn` to enforce `aiConversations` limit |

### Standalone Status
Not standalone — depends on `@brainiac/db`, Polar SDK, `@brainiac/env/server`, `./billing`.
