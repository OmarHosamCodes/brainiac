# Task 9 report — Pro effort ModelSelector

## Status

**Complete**

## Commit

`c13907a6` — feat: show reasoning effort under Orch Pro

## What changed

### New files

- `apps/web/src/features/workspace-agent/model-preset-effort.ts` — `effortForOutboundPreset(tier, effort)` strips effort from Fast/Balanced outbound presets.
- `apps/web/src/features/workspace-agent/model-preset-effort.test.ts` — TDD unit test for the helper.

### Hook (`use-workspace-agent-model-preset.ts`)

- Added `effort` state (`AgentModelPreset["effort"]`), hydrated from `PRESET_STORAGE_KEY`.
- Persists `{ tier, auto, free, effort }` to localStorage.
- `setTier`: when switching to Pro, defaults effort to `"medium"` if unset.
- `modelPreset` memo includes `effort: effortForOutboundPreset(tier, effort)`.
- Returns `effort` and `setEffort`.

### Model selector UI (`workspace-agent-thread-model-selector.tsx`)

- Pro tier: `efforts: true` on `TIER_MODELS`.
- `ModelSelector.Root` wired with `effort` / `onEffortChange`.
- `<ModelSelector.Effort />` rendered inside Content after List.
- Tooltip mentions effort on Pro (single-word button label unchanged).

### Prop plumbing

- `use-workspace-agent.ts` → `workspace-agent-view.tsx` → `workspace-agent-thread-composer-view.tsx` pass `modelEffort` / `setModelEffort`.

## Tests

```
bun test ./apps/web/src/features/workspace-agent/model-preset-effort.test.ts
```

Result: **1 pass, 0 fail**

```
bun run check-types
```

Result: **8/8 packages pass**

```
bun run check
```

Result: **pass**

## Concerns

- Effort is stored in localStorage preference JSON only; turn wire payload uses `effortForOutboundPreset` so Fast/Balanced never leak stale effort.
- Switching to Pro without prior effort sets `"medium"` in UI state; if user never opens the selector, outbound preset may still omit effort until Pro is selected (expected per plan).
- Task 10 verification (broader test suite + manual Pro effort UI) not run in this task.
