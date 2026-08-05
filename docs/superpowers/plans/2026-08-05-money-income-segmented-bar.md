# Money income segmented bar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conserved external billable Total income on Money scoreboard + Approach 02 segmented allocation on every client bill row.

**Architecture:** Pure scoreboard/row math first; scoreboard service loads external billable pool; period activity returns per-client billable/waste cents; web maps those into row allocation props and renders the Open Design segmented bar.

**Tech Stack:** Bun · oRPC · Drizzle · React 19 · existing Agency Money golden layers

**Spec:** [`docs/superpowers/specs/2026-08-05-money-income-segmented-bar-design.md`](../specs/2026-08-05-money-income-segmented-bar-design.md)

## Global Constraints

- Bun only; golden layers (no UI→DB skips)
- Waste excluded from Total and bar segments; Waste chip on rows only
- Remaining = invoiced unpaid (not total − received)
- External clients only in billable pool
- shadcn tokens; no liquid glass / purple glow
- Definition of done: `bun run check` · `check-types` · `check:conventions` · `check:golden` if new files

## File map

| File                                               | Role                                          |
| -------------------------------------------------- | --------------------------------------------- |
| `packages/api/.../period-scoreboard.ts`            | Conserved total + invoice remaining           |
| `packages/api/.../period-scoreboard.test.ts`       | TDD for new math                              |
| `packages/api/.../client-billable-income.ts` (new) | Pure cents from seconds×rate; aggregate rows  |
| `packages/api/.../money-scoreboard-service.ts`     | Load billable pool into scoreboard input      |
| `packages/api/.../period-bill-activity.ts`         | Client activity money fields                  |
| `packages/api/.../service.ts`                      | Query isWaste + rates; invoice exclude waste  |
| `packages/api/.../router.ts`                       | Zod for activity + scoreboard unchanged shape |
| `apps/web/.../money-bill-allocation.ts` (new)      | Segment widths + labels                       |
| `apps/web/.../money-bills-rows.ts`                 | Row allocation fields                         |
| `apps/web/.../agency-money-surface-view.tsx`       | Segmented bar UI                              |
| `apps/web/.../use-agency-money-surface.ts`         | Wire money fields                             |

---

### Task 1: Scoreboard conserved math

**Files:** `period-scoreboard.ts`, `period-scoreboard.test.ts`

- [ ] Extend input with `billablePoolCents` and `invoicedRemainingCents` (keep `billedCents` only if still needed for formulas — prefer replacing remaining source).
- [ ] `totalIncomeCents = max(billablePoolCents, receivedCents + invoicedRemainingCents)`
- [ ] `remainingCents = invoicedRemainingCents`
- [ ] Update tests (uninvoiced grows total; remaining stays invoiced unpaid; over-invoice clamps via max)
- [ ] Fix `money-formula-eval` / context callers if they break

### Task 2: Billable pool + period activity money

**Files:** new pure helper + `service.ts` listPeriodBillActivity + `money-scoreboard-service.ts` + router Zod

- [ ] Query time entries with `isWaste`, client category, user rates
- [ ] Aggregate external non-waste → billablePool; waste → waste cents (still priced for chip)
- [ ] Period activity clients: `durationSeconds` (billable preferred), `billableCents`, `wasteCents`, `currency`
- [ ] Scoreboard service passes pool + `invoiceSummary.remainingCents`
- [ ] Invoice create: skip `isWaste` entries when summing lines

### Task 3: Web allocation model + UI

**Files:** `money-bill-allocation.ts` (+test), `money-bills-rows.ts`, view, hook

- [ ] Pure `buildMoneyBillAllocation` → labels + segment percents
- [ ] Ready + invoice rows carry allocation; replace subtitle block in `BillListRow`
- [ ] Match Approach 02: labels, bar, total, waste chip; reduced-motion safe
- [ ] Wire client waste map for invoice rows from period activity

### Task 4: Verify

- [ ] Targeted bun tests
- [ ] `bun run check` · `check-types` · `check:conventions` · `check:golden` if needed
