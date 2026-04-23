---
title: Layer 4 — Agent Package: OpenRouter Client Factory
tags: [layer4, agent, openrouter, client, factory]
---

# Layer 4 — Agent Package: OpenRouter Client Factory

**Entity:** `createOpenRouterClient`  
**Type:** Factory Function  
**File:** `packages/agent/src/client.ts`

## Purpose

Single factory for constructing an authenticated `OpenRouter` SDK client instance. Reads `OPENROUTER_API_KEY` from the server environment and throws if absent.

## Implementation

```ts
export function createOpenRouterClient() {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }
  return new OpenRouter({ apiKey: env.OPENROUTER_API_KEY });
}
```

## Incoming Dependents (Consumers)

| Consumer | Mechanism |
|---|---|
| `packages/agent/src/models.ts` | calls `createOpenRouterClient()` inside `fetchOpenRouterModelCatalog` and `fetchOpenRouterAccountStatus` |
| `packages/agent/src/index.ts` | calls `createOpenRouterClient()` in `runToolEnabledPass` and `runDashboardAgent` |

## Outgoing Dependencies

| Dependency | Mechanism |
|---|---|
| `@brainiac/env/server` (`env`) | reads `env.OPENROUTER_API_KEY` for auth key |
| `@openrouter/sdk` (`OpenRouter`) | instantiates `new OpenRouter({ apiKey })` |

## Standalone Status

Not standalone — depends on `@brainiac/env/server` and `@openrouter/sdk`.
