---
title: Layer 3 — Dev Error Handling (dev-errors.ts)
tags: [layer3, api, errors, orpc, openrouter]
---

# Layer 3 — Dev Error Handling

**Entity:** `toProcedureError` / `toInternalServerError`  
**Type:** Error Utility Module  
**File:** `packages/api/src/dev-errors.ts`

## Exports
| Export | Description |
|---|---|
| `toProcedureError(procedure, error, context?)` | Converts any caught error into a typed `ORPCError`; handles OpenRouter HTTP errors specially |
| `toInternalServerError` | Alias for `toProcedureError` |

## Error Handling Logic

### `toProcedureError(procedure, error, context)`
1. If `error instanceof ORPCError` → re-throw as-is (pass-through).
2. Logs `console.error([procedure], error)`.
3. If `isOpenRouterHttpError(error)` → call `toOpenRouterProcedureError` which maps HTTP status codes to ORPC codes:
   - Guardrail/data-policy messages → `FORBIDDEN`
   - `401` → `UNAUTHORIZED`, `403` → `FORBIDDEN`, `404` → `NOT_FOUND`, `408` → `TIMEOUT`, `409` → `CONFLICT`, `413` → `PAYLOAD_TOO_LARGE`, `422` → `UNPROCESSABLE_CONTENT`, `429` → `TOO_MANY_REQUESTS`, `503` → `SERVICE_UNAVAILABLE`, `504` → `GATEWAY_TIMEOUT`, `5xx` → `BAD_GATEWAY`, default → `BAD_REQUEST`
4. In production (`NODE_ENV !== "development"`) → return generic `ORPCError("INTERNAL_SERVER_ERROR")`.
5. In development → return `ORPCError("INTERNAL_SERVER_ERROR")` with `data.debug` JSON containing: `procedure`, `errorName`, `message`, `cause`, `stack`, and if OpenRouter error: `upstreamStatus`, `upstreamContentType`, `upstreamBody`.

### OpenRouter HTTP Error Detection (`isOpenRouterHttpError`)
Checks that the error has `statusCode: number`, `body: string`, `contentType: string`, and `rawResponse: Response` properties via `Reflect.get`.

## Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/env/server` (`env`) | reads `env.NODE_ENV` to switch between dev debug payloads and production generic errors |
| `@orpc/server` (`ORPCError`) | constructs typed ORPC errors with codes, messages, and optional `data.debug` |

## Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `packages/api/src/procedures.ts` | `devErrorMiddleware` wraps every procedure call; catches all unhandled errors via `toProcedureError("rpc.procedure", error)` |
| `routers/agent.ts` | calls `toInternalServerError("agent.*", error, { ...context })` inside every `try/catch` block with procedure-specific debug context (conversationId, model, toolPreset, etc.) |

## Standalone Status
Not standalone — depends on `@brainiac/env/server` and `@orpc/server`.
