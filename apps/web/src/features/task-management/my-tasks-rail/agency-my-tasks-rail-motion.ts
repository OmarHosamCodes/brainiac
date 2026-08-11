import type { Transition, Variants } from "motion/react";

/** Matches `--motion-ease-out` in index.css. Twin of Tracker chooser tokens. */
export const RAIL_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

/** Seconds — align with `--motion-duration-fast|base|panel|rail`. */
export const RAIL_MS = {
  fast: 0.12,
  base: 0.18,
  panel: 0.22,
  rail: 0.32,
} as const;

export const RAIL_STAGGER_CAP = 8;
export const RAIL_STAGGER_STEP = 0.04;

export const railTapScale = { scale: 0.98 } as const;

export const railFastTransition: Transition = {
  type: "tween",
  duration: RAIL_MS.fast,
  ease: RAIL_EASE,
};

export const railBaseTransition: Transition = {
  type: "tween",
  duration: RAIL_MS.base,
  ease: RAIL_EASE,
};

export const railListContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0, delayChildren: 0 } },
};

export const railListItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...railBaseTransition,
      delay: railStaggerIndex(index) * RAIL_STAGGER_STEP,
    },
  }),
  exit: {
    opacity: 0,
    y: -2,
    transition: { type: "tween", duration: RAIL_MS.fast * 0.75, ease: RAIL_EASE },
  },
};

export const railEmptyVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: railBaseTransition },
  exit: {
    opacity: 0,
    transition: { type: "tween", duration: RAIL_MS.fast * 0.75, ease: RAIL_EASE },
  },
};

/** Collapse/expand: opacity + scaleX from the right edge — do not animate width. */
export const railCollapsePanelVariants: Variants = {
  collapsed: {
    opacity: 0,
    scaleX: 0.92,
    transition: { type: "tween", duration: RAIL_MS.fast, ease: RAIL_EASE },
  },
  expanded: {
    opacity: 1,
    scaleX: 1,
    transition: { type: "tween", duration: RAIL_MS.rail, ease: RAIL_EASE },
  },
};

export function railStaggerIndex(index: number): number {
  return Math.min(index, RAIL_STAGGER_CAP - 1);
}
