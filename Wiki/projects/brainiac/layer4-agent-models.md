---
title: Layer 4 — Agent Package: OpenRouter Model Catalog & Account Status
tags: [layer4, agent, openrouter, models, catalog, cache, schemas]
---

# Layer 4 — Agent Package: OpenRouter Model Catalog & Account Status

**Entity:** `models.ts` (multiple exported functions + Zod schemas)  
**Type:** Service Module  
**File:** `packages/agent/src/models.ts`

## Exported Zod Schemas

| Schema                                 | Purpose                                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openRouterPricingSchema`              | Validates pricing fields: `prompt`, `completion`, optional `request`, `image`, `audio`, etc.                                                        |
| `openRouterCatalogModelSchema`         | Full catalog model: `id`, `name`, `description`, `creatorId`, `creatorLabel`, `contextLength`, `supportsTools`, `pricing`, `isFree`                 |
| `openRouterModelCatalogResponseSchema` | `{ defaultModel, models[] }` envelope for full model list                                                                                           |
| `openRouterAccountStatusSchema`        | `{ totalCredits, totalUsage, availableCredits, keyLabel, isFreeTier, limit, limitRemaining, usageDaily, usageMonthly }`                             |
| `openRouterFreeModelSchema`            | Reduced model shape for free-tier: `id`, `name`, `description`, `contextLength`, `provider`, `inputModalities`, `outputModalities`, `supportsTools` |
| `openRouterFreeModelsResponseSchema`   | `{ defaultModel, models[] }` envelope for free-only list                                                                                            |

## Exported TypeScript Types

`OpenRouterPricing`, `OpenRouterCatalogModel`, `OpenRouterModelCatalogResponse`, `OpenRouterAccountStatus`, `OpenRouterFreeModel`, `OpenRouterFreeModelsResponse`

## Exported Functions

| Function                     | Signature                                                              | Behaviour                                                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listOpenRouterModels`       | `(forceRefresh?: boolean) → Promise<OpenRouterModelCatalogResponse>`   | Fetches via `client.models.listForUser()` (falls back to `client.models.list()`), maps/filters/sorts to `OpenRouterCatalogModel[]`, TTL-cached 10 min, deduplicates concurrent requests. |
| `listOpenRouterFreeModels`   | `(forceRefresh?: boolean) → Promise<OpenRouterFreeModelsResponse>`     | Filters `listOpenRouterModels()` to `isFree === true`, maps to lighter `openRouterFreeModelSchema`.                                                                                      |
| `getOpenRouterAccountStatus` | `(forceRefresh?: boolean) → Promise<OpenRouterAccountStatus>`          | Fetches `client.apiKeys.getCurrentKeyMetadata()` + `client.credits.getCredits()` in parallel, computes `availableCredits`, TTL-cached 60 s.                                              |
| `getOpenRouterModel`         | `(modelId: string) → Promise<OpenRouterCatalogModel \| null>`          | Looks up a single model from the catalog by exact `id`.                                                                                                                                  |
| `getOpenRouterFreeModel`     | `(modelId: string) → Promise<OpenRouterFreeModel \| null>`             | Same but within the free-only list.                                                                                                                                                      |
| `resolveOpenRouterModel`     | `(modelId?: string \| null) → Promise<OpenRouterCatalogModel \| null>` | Returns the named model if found, else falls back to `catalog.defaultModel`, else `models[0]`, swallows errors.                                                                          |
| `resolveOpenRouterFreeModel` | `(modelId?: string \| null) → Promise<OpenRouterFreeModel \| null>`    | Same resolution logic within free-only list.                                                                                                                                             |

## Caching Strategy

- Module-level variables `modelCatalogCache`, `modelCatalogRequest`, `accountStatusCache`, `accountStatusRequest` implement a single-flight + TTL pattern.
- `getOrRefreshCachedValue` prevents duplicate in-flight requests; on error, returns stale cache if available.

## Model Sorting Logic (`sortCatalogModels`)

Priority order:

1. `DEFAULT_AGENT_MODEL` ("openai/gpt-5-nano") first
2. Free models before paid
3. Tool-supporting before non-tool
4. Higher `contextLength` first
5. Alpha by `creatorLabel`, then `name`

## Incoming Dependents

| Consumer                            | Mechanism                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `packages/agent/src/index.ts`       | calls `resolveOpenRouterModel(config.model)` to resolve the model before a chat turn                       |
| `packages/api/src/routers/agent.ts` | calls `listOpenRouterModels()`, `listOpenRouterFreeModels()`, `getOpenRouterAccountStatus()` in procedures |

## Outgoing Dependencies

| Dependency                                                | Mechanism                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| `packages/agent/src/client.ts` (`createOpenRouterClient`) | all fetch functions instantiate the client via this factory |
| `packages/agent/src/types.ts` (`DEFAULT_AGENT_MODEL`)     | used as the sentinel model ID in sorting and fallback       |
| `@openrouter/sdk` (`Model` type)                          | typed raw model returned by SDK list methods                |
| `@brainiac/env/server` (`env`)                            | reads `OPENROUTER_API_KEY` during `listForUser()` call      |
| `zod`                                                     | all schema definitions                                      |

## Standalone Status

Not standalone — depends on `client.ts`, `types.ts`, `@openrouter/sdk`, `@brainiac/env/server`, and `zod`.
