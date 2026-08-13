# Task 8 Review — Pro reasoning effort on the wire

**Reviewer:** task reviewer  
**BASE:** `bffc24c2`  
**HEAD:** `487bede6`  
**Verdict:** Spec ✅ · Task quality **Ready**

---

## Spec ✅/❌

**Spec ✅**

| Requirement | Status |
| --- | --- |
| `agentReasoningEffortSchema` + optional `effort` on `agentModelPresetSchema` | ✅ |
| `DEFAULT_AGENT_MODEL_PRESET` unchanged (no `effort`) | ✅ |
| `resolveOpenRouterReasoning` returns `{ effort }` only when `tier === "pro"` and `effort` set | ✅ |
| Fast/Balanced leftover `effort` ignored (`tier !== "pro"` gate) | ✅ |
| Reasoning spread into tool-pass `callModel` (~686) | ✅ |
| Reasoning spread into text-only-pass `callModel` (~853) | ✅ |
| `modelPreset?: AgentModelPreset` on `ToolPassArgs` and `streamTextOnlyPass` args | ✅ |
| `config.modelPreset` threaded to all 5 `streamDashboardAgent` call sites (4× tool, 1× text-only) | ✅ |
| Agency task-assistant `callModel` (~1331) unchanged — no `modelPreset` / no `reasoning` | ✅ |
| `resolveOpenRouterReasoning` imported at top of `index.ts` (no inline imports) | ✅ |
| No web UI / plan / `routeTree.gen.ts` changes | ✅ |
| `elements-reasoning-effort` not mounted (catalog entry only; no Task 8 web diff) | ✅ |
| TDD unit test matches plan cases | ✅ |
| Conventional commit `feat: pass Pro reasoning effort to OpenRouter` | ✅ |
| Diff scope: 4 files, +40 lines (matches review package) | ✅ |

---

## Strengths

1. **Pro-only wire contract** — `resolveOpenRouterReasoning` gates on `preset.tier === "pro"` and truthy `preset.effort`; non-Pro presets never produce a `reasoning` object for spread into `callModel`.
2. **Both Orch stream passes covered** — Tool pass and text-only fallback pass each call `resolveOpenRouterReasoning(args.modelPreset)` and conditionally spread `reasoning` into `createOpenRouterClient().callModel({...})`.
3. **Complete threading from dashboard config** — All four `streamToolEnabledPass` invocations (initial, inspection retry, question retry, ui_present retry) plus the `streamTextOnlyPass` soft-fallback pass pass `modelPreset: config.modelPreset`.
4. **Scope discipline** — Diff limited to `packages/agent`; agency task assistant left untouched; UI effort picker deferred to Task 9 as briefed.
5. **Types align with existing input schema** — `agentChatTurnInputSchema` already accepted optional `modelPreset`; schema now validates optional `effort` end-to-end.

---

## Issues

### Critical

_None._

Reasoning is not sent for non-Pro tiers. Both Orch dashboard `callModel` sites include the conditional `reasoning` spread.

### Important

_None._

`modelPreset` is threaded to every `streamToolEnabledPass` / `streamTextOnlyPass` call site under `streamDashboardAgent`. Agency task-assistant path excluded per brief.

### Minor

1. **Fast tier not explicitly tested** — Plan test cases cover Balanced-with-effort and Pro-without-effort; implementation’s `tier !== "pro"` gate also covers Fast, but no runtime assertion for `{ tier: "fast", effort: "high" }`.
2. **Helper-only unit coverage** — Tests assert `resolveOpenRouterReasoning` output only; no spy/integration test that `callModel` receives `reasoning` on Pro tool/text passes (acceptable for brief scope but wire regression would require helper + index review).
3. **Single effort value in tests** — Only `"high"` exercised; `"low"` / `"medium"` rely on schema typing.

---

## Notes

### Acceptable deviations

- **`reasoning-effort.ts` not re-exported from `@orch/agent` barrel** — Internal helper; brief did not require public export.
- **`resolveOpenRouterReasoning` uses tier equality checks, not a switch** — Brief exhaustive-switch rule applies when switching on tier unions; this helper uses early returns instead.

### Verified by reviewer

```
bun test packages/agent/src/reasoning-effort.test.ts
→ 1 pass, 0 fail (3 expect() calls)
```

```
bun run check-types
→ 8 successful, 8 total
```

```
git diff bffc24c2 487bede6 --stat
→ 4 files, +40 / −0
```

### Wiring trace (reviewer)

**Helper:**

```3:6:packages/agent/src/reasoning-effort.ts
export function resolveOpenRouterReasoning(preset: AgentModelPreset | null | undefined) {
  if (!preset || preset.tier !== "pro") return undefined;
  if (!preset.effort) return undefined;
  return { effort: preset.effort };
}
```

**Tool pass + text-only pass:**

```685:694:packages/agent/src/index.ts
  const reasoning = resolveOpenRouterReasoning(args.modelPreset);
  const result = createOpenRouterClient().callModel({
    model: args.model,
    instructions: args.instructions,
    input: args.normalizedMessages,
    tools,
    stopWhen: [stepCountIs(args.maxSteps)],
    ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
    ...(args.maxOutputTokens === undefined ? {} : { maxOutputTokens: args.maxOutputTokens }),
    ...(reasoning ? { reasoning } : {}),
  });
```

```852:859:packages/agent/src/index.ts
  const reasoning = resolveOpenRouterReasoning(args.modelPreset);
  const result = createOpenRouterClient().callModel({
    model: args.model,
    instructions: args.instructions,
    input: args.normalizedMessages,
    ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
    ...(args.maxOutputTokens === undefined ? {} : { maxOutputTokens: args.maxOutputTokens }),
    ...(reasoning ? { reasoning } : {}),
  });
```

**Agency task assistant (unchanged):**

```1331:1336:packages/agent/src/index.ts
  const result = client.callModel({
    model,
    instructions,
    input: normalizedMessages,
    ...(config.maxOutputTokens === undefined ? {} : { maxOutputTokens: config.maxOutputTokens }),
  });
```

**All `modelPreset` call sites:** lines 992, 1034, 1086, 1133, 1223 in `packages/agent/src/index.ts`.

---

## Task quality

**Ready**

Task 8 meets all brief requirements. Pro reasoning effort is optional on the preset schema, resolved only for Pro with effort set, and conditionally passed to OpenRouter on both dashboard agent stream passes while Fast/Balanced ignore leftover effort. No Critical or Important defects. Residual Minor items (Fast-tier test, callModel integration spy) do not block Task 9 UI work.
