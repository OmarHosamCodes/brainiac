# Task 5 Review — `@` and `/` trigger parser

**Reviewer:** task reviewer  
**BASE:** `65448d21`  
**HEAD:** `d3e931f6`  
**Verdict:** Spec ✅ · Task quality **Ready**

---

## Spec ✅/❌

**Spec ✅**

| Requirement | Status |
| --- | --- |
| Modify `workspace-agent-mentions.ts`; create co-located `workspace-agent-mentions.test.ts` | ✅ |
| `WorkspaceAgentComposerTriggerKind`, `WorkspaceAgentComposerTrigger` types per brief | ✅ |
| `ACTIVE_TRIGGER_PATTERN` shared regex for `@` and `/` at end-of-draft | ✅ |
| `getActiveWorkspaceAgentTrigger` — `@` kind, query, start, end | ✅ |
| `getActiveWorkspaceAgentTrigger` — `/` kind, query, start, end | ✅ |
| Closed trigger (`see @launch now`) returns `null` | ✅ |
| `getActiveWorkspaceAgentMention` wrapper — `kind === "at"` only | ✅ |
| `stripActiveWorkspaceAgentTrigger` removes active token | ✅ |
| `stripActiveWorkspaceAgentMention` delegates to `stripActiveWorkspaceAgentTrigger` | ✅ |
| `getWorkspaceAgentMentionSuggestions` and scoring helpers preserved | ✅ |
| `WorkspaceAgentActiveMention` type retained | ✅ |
| `WorkspaceAgentSlashCandidate` + `getWorkspaceAgentSlashSuggestions` (substring match, skip selected, limit) | ✅ |
| Brief TDD cases: `@`, `/`, closed trigger, strip, slash skip-selected + open `t1` | ✅ |
| No hook / view / popover wiring (Task 6) | ✅ |
| No API / DB / plan edits | ✅ |
| Parser-only diff (2 files) | ✅ |
| Conventional commit `feat: parse @ and / composer triggers into scope tokens` | ✅ |
| Co-located `bun:test` only (no component render tests) | ✅ |

---

## Strengths

1. **Brief-faithful implementation** — Types, regex, trigger parser, wrappers, and slash suggestions match the plan Step 3 snippet; reviewer run: `5 pass, 0 fail`.
2. **Backward-compatible wrappers** — `getActiveWorkspaceAgentMention` / `stripActiveWorkspaceAgentMention` preserved so `use-workspace-agent.ts` compiles unchanged; node mention scoring untouched.
3. **Correct scope boundary** — Diff limited to parser module + tests; no Task 6 hook/view leakage.
4. **Slash suggestion contract** — Selected-id filter and label substring match behave as specified for Task 6 popover wiring.

---

## Issues

### Critical

_None._

### Important

_None._

### Minor

1. **Marker guard uses `if-not` instead of exhaustive switch** — Brief Step 3 notes “Exhaustive switch if you switch on `marker` / kind.” Implementation uses `if (marker !== "@" && marker !== "/") return null` plus ternary for `kind`. Functionally correct given the regex capture group; a `switch` with `never` default would satisfy the convention nit.

---

## Notes

### Acceptable deviations

- **`stripActiveWorkspaceAgentMention` strips any active trigger** — Delegates fully to `stripActiveWorkspaceAgentTrigger` per brief; current hook only calls it after `@` node pick, so no behavioral regression today.
- **Slash suggestions without scoring** — Brief specifies simple `includes` filter; richer ordering is explicitly deferred to Task 6 (report concern is informational, not a spec miss).

### Verified by reviewer

```
bun test apps/web/src/features/workspace-agent/workspace-agent-mentions.test.ts
→ 5 pass, 0 fail
```

```
git diff 65448d21 d3e931f6 --stat
→ 2 files, +118 / −9 (mentions module + tests only)
```

### Task 6 readiness

Parser exports (`getActiveWorkspaceAgentTrigger`, `stripActiveWorkspaceAgentTrigger`, `getWorkspaceAgentSlashSuggestions`) and tests are in place. Hook can wire slash popover and scope chips without further parser changes.

---

## Task quality

**Ready**

Task 5 deliverables match the brief. No Critical or Important spec violations. One Minor convention nit (marker exhaustive switch). Parser helpers, wrappers, and co-located tests are complete; approved for Task 6 wiring.
