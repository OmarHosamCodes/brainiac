---
title: "@brainiac/config — Base TypeScript Config"
category: projects
tags: [config, typescript, primitives]
summary: "Shared TypeScript compiler options package extended by all workspace members."
provenance:
  extracted: 1.0
  inferred: 0.0
  ambiguous: 0.0
updated: 2026-04-23
layer: 1
---

# @brainiac/config — Base TypeScript Config

## Primary Entity

- **Name:** `@brainiac/config`
- **Type:** Config Package
- **Path:** `packages/config/`
- **Exports:** `tsconfig.base.json` (no JS exports — config-only)

## `tsconfig.base.json` Compiler Options

| Option | Value |
|---|---|
| `target` | `ESNext` |
| `module` | `ESNext` |
| `moduleResolution` | `bundler` |
| `lib` | `["ESNext"]` |
| `verbatimModuleSyntax` | `true` |
| `strict` | `true` |
| `skipLibCheck` | `true` |
| `resolveJsonModule` | `true` |
| `allowSyntheticDefaultImports` | `true` |
| `esModuleInterop` | `true` |
| `forceConsistentCasingInFileNames` | `true` |
| `isolatedModules` | `true` |
| `noUncheckedIndexedAccess` | `true` |
| `noUnusedLocals` | `true` |
| `noUnusedParameters` | `true` |
| `noFallthroughCasesInSwitch` | `true` |
| `types` | `["bun"]` |

## Relationships

| Role | Entity | Mechanism |
|---|---|---|
| **Incoming (Dependents)** | `tsconfig.json` (root) | `"extends": "@brainiac/config/tsconfig.base.json"` |
| **Incoming (Dependents)** | Every `packages/*/tsconfig.json` and `apps/*/tsconfig.json` | `"extends": "@brainiac/config/tsconfig.base.json"` |
| **Outgoing (Dependencies)** | None | — |

## Standalone Status

**Standalone** — zero runtime imports or external dependencies. Pure JSON config artifact.
