---
title: Layer 3 — System & Billing Routers
tags: [layer3, api, orpc, router, system, billing]
---

# Layer 3 — System & Billing Routers

## 1. systemRouter

**Entity:** `systemRouter` — spread into `appRouter` root  
**Type:** ORPC Router (inline object)  
**File:** `packages/api/src/routers/system.ts`

### Procedures
| Procedure | Auth Level | Handler |
|---|---|---|
| `healthCheck` | `publicProcedure` | Returns the string `"OK"` — no DB or service calls |
| `privateData` | `protectedProcedure` | Returns `{ message: "This is private", user: context.session.user }` |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `../procedures` | imports `publicProcedure`, `protectedProcedure` |

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `routers/index.ts` | spread as `...systemRouter` into `appRouter` — procedures appear at the root namespace |

### Standalone Status
Not standalone — depends on `../procedures`.

---

## 2. billingRouter

**Entity:** `billingRouter`  
**Type:** ORPC Router (inline object)  
**File:** `packages/api/src/routers/billing/index.ts`

### Procedures
| Procedure | Auth Level | Handler |
|---|---|---|
| `billing.state` | `protectedProcedure` | Calls `getBillingStateForUser(context.session.user.id)` and returns the full `BillingState` object |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `../../billing-guard` | calls `getBillingStateForUser(userId)` — fetches Polar subscription + lifetime override from DB |
| `../../procedures` | imports `protectedProcedure` |

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `routers/index.ts` | mounted as `billing: billingRouter` on `appRouter` |
| `apps/web` | calls `orpc.billing.state.useQuery()` to display current plan and limits in the UI |

### Standalone Status
Not standalone — depends on `../../billing-guard` and `../../procedures`.
