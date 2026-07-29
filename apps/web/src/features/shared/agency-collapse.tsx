import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

/** Matches `--motion-ease-out` (ease-out-quart). */
const COLLAPSE_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

type AgencyCollapseProps = {
  open: boolean;
  children: ReactNode;
  /** Defaults to 200ms within the product motion budget. */
  durationSec?: number;
};

/** Height + opacity reveal for product expand/collapse; respects reduced motion. */
export function AgencyCollapse({ open, children, durationSec = 0.2 }: AgencyCollapseProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return open ? <>{children}</> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="agency-collapse"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: durationSec, ease: COLLAPSE_EASE }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
