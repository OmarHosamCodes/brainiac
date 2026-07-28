---
target: agency timer bar polish
total_score: 26
p0_count: 1
p1_count: 3
timestamp: 2026-07-28T16-12-01Z
slug: eatures-time-tracking-agency-time-tracker-view-tsx
---

# Agency Tracker Timer Bar Polish Critique

Target: `apps/web/src/features/time-tracking/agency-time-tracker-view.tsx` (timer-bar UX polish)

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------ |
| 1         | Visibility of System Status     | 2         | Blocker visible; pending was mostly ellipsis / sr-only Saving            |
| 2         | Match System / Real World       | 3         | Plain copy; Stop gating stricter than Clockify migrants expect           |
| 3         | User Control and Freedom        | 3         | Discard exists; emergency exit in ⋮                                      |
| 4         | Consistency and Standards       | 3         | Warning tokens on-brand; absolute alert pattern mismatched hours surface |
| 5         | Error Prevention                | 3         | Queue + disabled Stop prevent silent drops                               |
| 6         | Recognition Rather Than Recall  | 2         | Warning lived on Stop, not on missing field                              |
| 7         | Flexibility and Efficiency      | 2         | Hard Stop gate; queue depth invisible                                    |
| 8         | Aesthetic and Minimalist Design | 3         | Sparse chrome; absolute alert broke calm composition                     |
| 9         | Error Recovery                  | 3         | Messages name the fix; layout collision undercut trust                   |
| 10        | Help and Documentation          | 2         | Inline alert is the help; title duplicate                                |
| **Total** |                                 | **26/40** | **Acceptable**                                                           |

## Anti-Patterns Verdict

**LLM assessment:** No AI slop for polish chrome — semantic warning tokens, plain copy, restrained pending. Not violet glow / gradient / side-stripe.

**Deterministic scan (CLI):** clean (`[]`) on tracker view + description datalist.

**Browser inject:** 22 page-level anti-patterns (mostly shell: nested cards ×10, positioned clipped ×9). Measured stop-blocker vs week-total overlap ~68×17px (P0 confirmed). Nested-card / flat-type / gradient / bounce treated as false positives or shell chrome.

## Overall Impression

Correctness intent is strong (queue, blockers, a11y). Presentation of the stop blocker as an absolute overlay over Totals was the single biggest failure — feedback that obscures hours-truth fails Agency.

## What's Working

1. Honest prevention over silent failure (queue + disabled Stop).
2. Token-correct warning chrome and calm PRODUCT voice.
3. Real a11y intent (`aria-busy`, `aria-describedby`, discard disabled while pending, suggestion flush).

## Priority Issues

**[P0] Absolute stop alert collides with entry-list Total**

- Why: Obscures hours truth; measured overlap ~1155px².
- Fix: In-flow status row under the tracker rail (reflow, no overlay).
- Suggested command: `$impeccable layout` / `$impeccable polish`

**[P1] Warning affordance points at Stop, not missing field**

- Why: User maps “Stop is wrong” instead of “fill description/task.”
- Fix: Ring/warn description or task trigger when that requirement blocks Stop.
- Suggested command: `$impeccable polish` / `$impeccable clarify`

**[P1] Sighted pending feedback too thin**

- Why: Ellipsis + sr-only Saving feels like freeze.
- Fix: Visible muted “Saving…” on status row while pending.
- Suggested command: `$impeccable polish`

**[P1] Clockify-parity drift on Stop gating**

- Why: Description+task required before Stop differs from stop-first habits.
- Fix: Product decision — keep Agency integrity rule or allow stop-then-fix.
- Suggested command: `$impeccable shape` (policy) then `$impeccable harden`

**[P2] Alert density / tooltip feel**

- Why: Small right-aligned absolute chip read as collision, not system status.
- Fix: Full-width status strip under bar.
- Suggested command: `$impeccable layout`

## Persona Red Flags

**Alex (Power User):** Hard-disabled Stop; discard in ⋮; forced metadata before stop.

**Clockify migrant:** Looks like Clockify until Stop refuses; overlay over Totals feels unfinished.

**Sam (a11y):** Better than silent disable; sighted/SR asymmetry on Saving; focus does not move to missing field.

## Minor Observations

- Manual errors use same absolute pattern elsewhere.
- `title` duplicates alert.
- Idle Start path stays clean.

## Questions to Consider

1. Should blocked Stop always reserve layout under the rail?
2. Is description+task-before-stop non-negotiable Agency policy?
3. Should warning light the missing field the moment Stop is invalid?
4. Is visible “Saving…” enough without queue depth UI?
5. Should Discard sit beside Stop when blocked?
