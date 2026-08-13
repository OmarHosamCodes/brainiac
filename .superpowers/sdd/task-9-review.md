# Task 9 Review — Pro effort ModelSelector

**Reviewer:** task reviewer  
**BASE:** `8728469e`  
**HEAD:** `c13907a6`  
**Verdict:** Spec ✅ · Task quality **Ready**

---

## Spec ✅/❌

**Spec ✅**

| Requirement                                                                                         | Status |
| --------------------------------------------------------------------------------------------------- | ------ |
| `effortForOutboundPreset` keeps effort only on Pro (`pro` + effort → effort; non-Pro → `undefined`)   | ✅     |
| TDD unit test matches plan cases (`pro`/`medium`, `fast`/`medium`)                                  | ✅     |
| `TIER_MODELS` Pro has `efforts: true`; Fast/Balanced omit `efforts`                                 | ✅     |
| `<ModelSelector.Effort />` mounted inside Content after List                                        | ✅     |
| `ModelSelector.Root` wired with `effort` / `onEffortChange`                                         | ✅     |
| `modelPreset` memo includes `effort: effortForOutboundPreset(tier, effort)`                         | ✅     |
| Fast/Balanced outbound preset never leaks stale effort                                              | ✅     |
| `setTier`: switching to Pro defaults effort to `"medium"` when unset                                | ✅     |
| Persist `{ tier, auto, free, effort }` in `PRESET_STORAGE_KEY`                                      | ✅     |
| Prop plumbing: hook → `workspace-agent-view` → composer → model selector                            | ✅     |
| Views props-only; browser imports `@orch/agent/types` / `@orch/agent/model-routing` only (no barrel) | ✅     |
| `elements-reasoning-effort` not mounted (catalog entry only)                                        | ✅     |
| Trigger uses `selectedModelButtonLabel` (single-word); effort only in tooltip                       | ✅     |
| No `model-selector.tsx` changes (existing Root effort API sufficient)                                 | ✅     |
| Conventional commit `feat: show reasoning effort under Orch Pro`                                      | ✅     |
| Diff scope: 7 files, +73 / −7 (matches review package)                                              | ✅     |

---

## Strengths

1. **Wire-safe outbound preset** — `modelPreset` memo applies `effortForOutboundPreset` so Fast/Balanced turns never forward leftover Pro effort; Task 8 `resolveOpenRouterReasoning` gate remains effective.
2. **Pro-only UI surface** — `efforts: true` on Pro plus `<ModelSelector.Effort />` gives Low/Med/High inside the existing popover; Fast/Balanced models omit `efforts`, so the control null-renders off Pro.
3. **Single-word trigger preserved** — Button still renders `selectedModelButtonLabel` from `formatModelPresetButtonLabel`; effort appears only in tooltip (`labelWithEffort`), not flattened into the trigger.
4. **Golden-layer plumbing** — Hook owns state/persistence; views and composer pass props only; `use-workspace-agent.ts` forwards `modelEffort` / `setModelEffort` without UI logic.
5. **Scope discipline** — No plan/API/DB/`routeTree.gen.ts` edits; helper extracted with co-located `bun:test` per brief.

---

## Issues

### Critical

_None._

Outbound preset does not leak effort on Fast/Balanced. Pro effort UI is mounted and wired.

### Important

_None._

`ModelSelector.Effort` is present when Pro is selected. `effortForOutboundPreset` strips effort for non-Pro tiers in the `modelPreset` sent via `buildOrchTurnSendContext`.

### Minor

1. **Balanced tier not explicitly tested** — Plan cases cover `fast` only; `effortForOutboundPreset("balanced", "medium")` follows the same `tier === "pro"` gate but has no runtime assertion.
2. **Hook behavior untested** — `setTier` Pro default (`"medium"`), localStorage hydration, and `modelPreset` memo integration rely on code review; only the extracted helper has unit coverage.
3. **Hydrated Pro without stored effort** — `setTier` defaults effort on switch to Pro, not on initial hydrate; a user with `tier: "pro"` and no `effort` in storage sees the effort control with no selection until they re-select Pro or pick a level (outbound omits effort until then). Matches brief/report expectation but is a small UX edge.
4. **Pro-without-effort outbound case untested** — `effortForOutboundPreset("pro", undefined)` returns `undefined`; no explicit test (acceptable given Task 8 wire gate).

---

## Notes

### Acceptable deviations

- **`model-selector.tsx` unchanged** — Brief allowed modification only if needed; existing `effort` / `onEffortChange` on Root sufficed.
- **Effort stored in preference JSON on all tiers** — localStorage may retain effort while on Fast/Balanced; wire payload strips it via `effortForOutboundPreset`.
- **`setTier` uses `if (next === "pro")` not exhaustive switch** — Brief exhaustive-switch rule applies when switching on tier unions in a switch statement; this callback uses a single guard.

### Verified by reviewer

```
bun test apps/web/src/features/workspace-agent/model-preset-effort.test.ts
→ 1 pass, 0 fail (2 expect() calls)
```

```
bun run check-types
→ 8 successful, 8 total
```

```
git diff 8728469e c13907a6 --stat
→ 7 files, +73 / −7
```

### Wiring trace (reviewer)

**Helper:**

```3:8:apps/web/src/features/workspace-agent/model-preset-effort.ts
export function effortForOutboundPreset(
  tier: AgentModelTier,
  effort: AgentModelPreset["effort"],
): AgentModelPreset["effort"] {
  return tier === "pro" ? effort : undefined;
}
```

**Hook — persist, Pro default, outbound memo:**

```62:64:apps/web/src/features/workspace-agent/hooks/use-workspace-agent-model-preset.ts
  useEffect(() => {
    writeJson(PRESET_STORAGE_KEY, { tier, auto, free, effort } satisfies AgentModelPreset);
  }, [auto, effort, free, tier]);
```

```101:106:apps/web/src/features/workspace-agent/hooks/use-workspace-agent-model-preset.ts
  const setTier = useCallback((next: AgentModelTier) => {
    setTierState(next);
    if (next === "pro") {
      setEffortState((current) => current ?? "medium");
    }
  }, []);
```

```151:154:apps/web/src/features/workspace-agent/hooks/use-workspace-agent-model-preset.ts
  const modelPreset: AgentModelPreset = useMemo(
    () => ({ tier, auto, free, effort: effortForOutboundPreset(tier, effort) }),
    [auto, effort, free, tier],
  );
```

**Model selector — Pro efforts, Root wiring, Effort mount, single-word trigger:**

```8:12:apps/web/src/features/workspace-agent/workspace-agent-thread-model-selector.tsx
const TIER_MODELS: ModelOption[] = [
  { id: "fast", name: "Fast", description: "Snappy replies" },
  { id: "balanced", name: "Balanced", description: "Default quality" },
  { id: "pro", name: "Pro", description: "Harder problems", efforts: true },
];
```

```87:119:apps/web/src/features/workspace-agent/workspace-agent-thread-model-selector.tsx
    <ModelSelector.Root
      models={TIER_MODELS}
      value={modelTier}
      onValueChange={(value) => onModelTierChange(value as AgentModelTier)}
      effort={modelEffort}
      onEffortChange={(value) =>
        onModelEffortChange(value as NonNullable<AgentModelPreset["effort"]>)
      }
      ...
    >
      ...
        <ModelSelector.List />
        <ModelSelector.Effort />
```

```100:107:apps/web/src/features/workspace-agent/workspace-agent-thread-model-selector.tsx
          <ModelSelector.Trigger
            ...
          >
            {selectedModelButtonLabel}
          </ModelSelector.Trigger>
```

---

## Task quality

**Ready**

Task 9 meets all brief requirements. Pro shows Low/Med/High via `ModelSelector.Effort`; Fast/Balanced stay single-word with no effort on the wire. No Critical or Important defects. Residual Minor items (Balanced test, hook integration tests, hydrated-Pro edge) do not block Task 10 verification.
