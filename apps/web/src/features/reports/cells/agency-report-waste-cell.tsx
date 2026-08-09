import { motion } from "motion/react";

import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

/** Matches `--motion-ease-out` (ease-out-quart). */
const WASTE_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

const wasteHitClass = cn(
  "-mx-4 -my-3 inline-flex min-h-10 w-[calc(100%+2rem)] items-center px-4 py-3",
  "rounded-none transition-colors hover:bg-muted/60",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

const wasteStateClass = cn(
  "inline-flex h-6 min-w-[3.25rem] items-center justify-center rounded-full px-2",
  "text-[10px] font-semibold uppercase tracking-wide",
);

export type AgencyReportWasteCellProps = {
  isWaste: boolean;
  entryCount?: number;
  disabled?: boolean;
  onToggle?: () => void;
};

export function AgencyReportWasteCell({
  isWaste,
  entryCount = 1,
  disabled = false,
  onToggle,
}: AgencyReportWasteCellProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const grouped = entryCount > 1;
  const actionLabel = isWaste
    ? grouped
      ? `Unmark ${entryCount} entries as waste`
      : "Unmark as waste"
    : grouped
      ? `Mark ${entryCount} entries as waste`
      : "Mark as waste";

  const state = (
    <motion.span
      key={isWaste ? "waste" : "mark"}
      className={cn(
        wasteStateClass,
        isWaste
          ? "bg-destructive text-destructive-foreground"
          : "border border-default/70 text-muted",
      )}
      initial={
        prefersReducedMotion ? false : isWaste ? { scale: 0.78, opacity: 0.55 } : { opacity: 0.55 }
      }
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.16, ease: WASTE_EASE }}
    >
      {isWaste ? "Waste" : "Mark"}
    </motion.span>
  );

  if (!onToggle) {
    return <span className="inline-flex min-h-10 items-center">{isWaste ? state : null}</span>;
  }

  return (
    <motion.button
      type="button"
      aria-pressed={isWaste}
      aria-label={actionLabel}
      disabled={disabled}
      className={cn(wasteHitClass, disabled && "pointer-events-none opacity-50")}
      whileTap={prefersReducedMotion || disabled ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.12, ease: WASTE_EASE }}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {state}
    </motion.button>
  );
}
