import type { Transition, Variants } from "motion/react";

/** Matches `--motion-ease-out` in index.css (ease-out-quart). Twin of Tracker chooser tokens. */
export const MONEY_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

/** Seconds — align with `--motion-duration-fast|base|panel`. */
export const MONEY_MS = {
  fast: 0.12,
  base: 0.18,
  panel: 0.22,
} as const;

/** Page body sections: stats → payout → bills|expenses. */
export const MONEY_SECTION_STAGGER_CAP = 3;
export const MONEY_SECTION_STAGGER_STEP = 0.04;

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

export const moneySectionItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...moneyBaseTransition,
      delay: moneySectionStaggerIndex(index) * MONEY_SECTION_STAGGER_STEP,
    },
  }),
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

export function moneySectionStaggerIndex(index: number): number {
  return Math.min(index, MONEY_SECTION_STAGGER_CAP - 1);
}

export function moneyNestStaggerIndex(index: number): number {
  return Math.min(index, MONEY_NEST_STAGGER_CAP - 1);
}
