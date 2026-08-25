# Expenses Strip — Colorize, Delight, Animate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the D4 Expenses scoreboard strip with semantic color, purposeful motion (React Bits / Money motion tokens), and quiet operate-mode delight—while fixing the narrow-column row layout regression.

**Architecture:** Keep golden-file split (strip logic in `money-expenses-strip.ts`, state in hook, presentation in view). Extend `money-motion.ts` with strip row variants matching Bills nest stagger. Views use `motion` without hooks (Bills precedent). Color lives on glyphs, amounts, and actions—not plate backgrounds.

**Tech Stack:** React 19, motion/react, Tailwind shadcn tokens, existing `MONEY_EASE` / `moneyNestItemVariants`.

## Global Constraints

- Operate mode: motion ≤220ms, respects `prefers-reduced-motion`
- No liquid glass, no violet wallpaper, no nested cards
- Semantic color on SVG/dots/amounts/actions only
- Views must not call React hooks (golden-view-no-hooks)
- Dialogs unchanged

---

### Task 1: Motion tokens for expense strip rows

**Files:**
- Modify: `apps/web/src/features/money/money-motion.ts`

**Interfaces:**
- Produces: `moneyExpenseStripItemVariants` (alias or copy of nest stagger caps)

- [ ] **Step 1:** Export `moneyExpenseStripItemVariants` reusing `moneyNestItemVariants` timing (cap 8 rows, 0.03s step)
- [ ] **Step 2:** Run `bun test apps/web/src/features/money/money-expenses-strip.test.ts`
- [ ] **Step 3:** Commit `feat(money): add expense strip motion variants`

---

### Task 2: Row layout fix + color roles

**Files:**
- Modify: `apps/web/src/features/money/agency-money-expenses-section-view.tsx`

**Interfaces:**
- Consumes: `ExpenseStripItem`, `expenseStripMeta`, `moneyExpenseStripItemVariants`

- [ ] **Step 1:** Replace fragile `grid` + `sm:contents` with flex row: dot | identity (flex-1) | amount + action (shrink-0)
- [ ] **Step 2:** Add `expenseStripAmountTone(item)` — warning when actionable, muted when paid
- [ ] **Step 3:** Type dot: subscription `bg-warning ring-2 ring-warning/20`, one-time muted ring
- [ ] **Step 4:** Period spend header: mono hero + uppercase micro-label (instrument-adjacent)
- [ ] **Step 5:** Run typecheck on web package

---

### Task 3: Animate filter + list

**Files:**
- Modify: `apps/web/src/features/money/agency-money-expenses-section-view.tsx`

- [ ] **Step 1:** Wrap filter pills in `LayoutGroup`; sliding `motion.span layoutId="expense-strip-filter-bg"` on selected pill
- [ ] **Step 2:** Key list `AnimatePresence` by `strip.filter`; `motion.li` with `moneyExpenseStripItemVariants`
- [ ] **Step 3:** Filter change crossfade: opacity-only on container, list remounts with stagger
- [ ] **Step 4:** Verify `motion-reduce:transition-none` on hover transitions

---

### Task 4: Delight touches

**Files:**
- Modify: `apps/web/src/features/money/agency-money-expenses-section-view.tsx`

- [ ] **Step 1:** Record/Pay action: rest `opacity-70`, `group-hover/row:opacity-100`, warning text color
- [ ] **Step 2:** Empty state: single quiet line (already present)—add subtle fade-in via motion paragraph
- [ ] **Step 3:** Run `node .claude/skills/impeccable/scripts/detect.mjs --json` on changed files

---

### Task 5: Definition of done

- [ ] `bun run check-types` passes for web
- [ ] Money feature passes `check:conventions`
- [ ] Browser: Expenses at ~550px width shows name left, amount+Record right; filter morph works; Arabic names truncate with title
