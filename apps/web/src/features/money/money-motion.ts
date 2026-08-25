import type { Transition, Variants } from "motion/react";

/** Matches `--motion-ease-out` in index.css (ease-out-quart). Twin of Tracker chooser tokens. */
export const MONEY_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

/** Seconds — align with `--motion-duration-fast|base|panel`. */
export const MONEY_MS = {
  fast: 0.12,
  base: 0.18,
  panel: 0.22,
} as const;

/** Nested invoice cards under a multi-line bill group. */
export const MONEY_NEST_STAGGER_CAP = 4;
export const MONEY_NEST_STAGGER_STEP = 0.04;

export const moneyFastTransition: Transition = {
  type: "tween",
  duration: MONEY_MS.fast,
  ease: MONEY_EASE,
};

export const moneyBaseTransition: Transition = {
  type: "tween",
  duration: MONEY_MS.base,
  ease: MONEY_EASE,
};

export const moneyCollapseTransition: Transition = {
  type: "tween",
  duration: MONEY_MS.base,
  ease: MONEY_EASE,
};

export const moneyNestItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...moneyBaseTransition,
      delay: 0.02 + moneyNestStaggerIndex(index) * MONEY_NEST_STAGGER_STEP,
    },
  }),
  exit: {
    opacity: 0,
    transition: { type: "tween", duration: MONEY_MS.fast * 0.75, ease: MONEY_EASE },
  },
};

export const moneyCollapseVariants: Variants = {
  collapsed: {
    opacity: 0,
    height: 0,
    transition: {
      type: "tween",
      duration: MONEY_MS.fast,
      ease: MONEY_EASE,
    },
  },
  expanded: {
    opacity: 1,
    height: "auto",
    transition: moneyCollapseTransition,
  },
};

export function moneyNestStaggerIndex(index: number): number {
  return Math.min(index, MONEY_NEST_STAGGER_CAP - 1);
}

/** Expense scoreboard strip rows (D4). */
export const MONEY_EXPENSE_STRIP_STAGGER_CAP = 8;
export const MONEY_EXPENSE_STRIP_STAGGER_STEP = 0.03;

export const moneyExpenseStripItemVariants: Variants = {
  hidden: { opacity: 0, y: 3 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...moneyBaseTransition,
      delay:
        Math.min(index, MONEY_EXPENSE_STRIP_STAGGER_CAP - 1) * MONEY_EXPENSE_STRIP_STAGGER_STEP,
    },
  }),
  exit: {
    opacity: 0,
    y: -2,
    transition: { type: "tween", duration: MONEY_MS.fast * 0.85, ease: MONEY_EASE },
  },
};
