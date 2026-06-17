---
target: agency-task-list work sidebar
total_score: 31
p0_count: 0
p1_count: 2
timestamp: 2026-06-16T18-23-25Z
slug: pps-web-src-components-agency-agency-task-list-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Done count was hidden until expand; loading skeletons solid |
| 2 | Match System / Real World | 4 | Plain task language, Clockify-adjacent structure |
| 3 | User Control and Freedom | 3 | Create blur-dismiss was aggressive; fixed with Cancel |
| 4 | Consistency and Standards | 4 | Matches Agency dense register and shared tokens |
| 5 | Error Prevention | 3 | Project required before submit; single-project auto-select added |
| 6 | Recognition Rather Than Recall | 3 | Three zones clear; done history tucked away by design |
| 7 | Flexibility and Efficiency | 2 | No keyboard accelerators for new task or done toggle |
| 8 | Aesthetic and Minimalist Design | 4 | Focused queue; filters removed successfully |
| 9 | Error Recovery | 3 | Create collapsed before success check; fixed via boolean return |
| 10 | Help and Documentation | 2 | Empty active state lacked next-step hint; fixed |
| **Total** | | **31/40** | **Good** |

## Anti-Patterns Verdict

**LLM assessment:** Does not read as AI slop. Restrained Agency register, no filter wall, no card nesting. Reads as a deliberate execution rail.

**Deterministic scan:** Clean on `agency-task-list.tsx` (0 findings).

## Overall Impression

The three-zone layout succeeds at the brief's goal: personal queue, staged add, done tucked away. Biggest gaps were accessibility semantics (listbox + nested controls) and create-form ergonomics on failure.

## What's Working

1. **Information architecture** — My tasks / New task / Done is immediately scannable.
2. **Row density** — Status + timer only on active rows keeps the rail operational without Jira weight.
3. **Agency register fidelity** — Label scale, mono counts, hairline dividers match the execution surface dialect.

## Priority Issues

- **[P1] Nested interactives inside listbox options** — Screen readers and keyboard users hit invalid semantics when status select lives inside `role="option"`. **Fix:** Separate selection button from controls; use a plain list. **Status:** Fixed in polish.
- **[P1] Create form cleared on failed submit** — `collapseCreate()` ran before async success. **Fix:** Return boolean from store; collapse only on success. **Status:** Fixed in polish.
- **[P2] Done count showed em dash until expand** — Undermined status visibility. **Fix:** Prefetch done query for accurate count. **Status:** Fixed in polish.
- **[P2] Blur-dismiss on create zone** — Collapsed while tabbing to adjacent controls. **Fix:** Explicit Cancel; remove blur handler. **Status:** Fixed in polish.
- **[P3] Raw status in dot title** — `in_progress` leaked to tooltip. **Fix:** Human labels on done rows. **Status:** Fixed in polish.

## Persona Red Flags

**Alex (Power User):** No shortcut to expand New task; must click each time. Acceptable for v1.

**Morgan (Focused Operator — project persona):** Previously lost draft on failed create; fixed. Timer + status inline still supports flow.

**Sam (Accessibility):** Listbox pattern was the main blocker; fixed with button-based row selection and `aria-current`.

## Minor Observations

- Single-project teams now auto-select project on create expand.
- Chevron respects `prefers-reduced-motion` via `motion-safe:` prefixes.
- `agencyFocusRingClass` consolidated on interactive elements.

## Questions to Consider

- Should marking Done from the status select auto-collapse the done section open briefly so the user sees where the task went?
- Would a one-key shortcut (`n`) to open New task earn its keep on this surface?
