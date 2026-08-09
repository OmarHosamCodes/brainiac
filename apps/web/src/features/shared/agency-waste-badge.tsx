import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { Badge } from "@/ui/badge";
import { cn } from "@/lib/utils";

/** Matches `--motion-ease-out` (ease-out-quart). */
const WASTE_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

type AgencyWasteDismissibleProps = {
  className?: string;
  /** Clears waste when dismissed. Omit for display-only. */
  onDismiss?: () => void;
  /** Screen-reader label for the X. Defaults to "Unmark as waste". */
  dismissLabel?: string;
  disabled?: boolean;
};

function useWasteDismiss(onDismiss?: () => void, disabled = false) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(true);
  const pendingDismissRef = useRef(false);
  const dismissible = Boolean(onDismiss);

  function dismiss() {
    if (!dismissible || disabled || pendingDismissRef.current) return;
    if (prefersReducedMotion) {
      onDismiss?.();
      return;
    }
    pendingDismissRef.current = true;
    setVisible(false);
  }

  function onExitComplete() {
    if (!pendingDismissRef.current) return;
    pendingDismissRef.current = false;
    onDismiss?.();
  }

  return { dismissible, prefersReducedMotion, visible, dismiss, onExitComplete };
}

function WasteDismissButton({
  disabled,
  prefersReducedMotion,
  label,
  onDismiss,
}: {
  disabled: boolean;
  prefersReducedMotion: boolean;
  label: string;
  onDismiss: () => void;
}) {
  return (
    <motion.button
      type="button"
      data-icon="inline-end"
      className={cn(
        "inline-flex size-3.5 shrink-0 items-center justify-center rounded-full",
        "text-destructive/70 hover:bg-destructive/10 hover:text-destructive",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
      aria-label={label}
      disabled={disabled}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.86 }}
      transition={{ duration: 0.12, ease: WASTE_EASE }}
      onClick={(event) => {
        event.stopPropagation();
        onDismiss();
      }}
    >
      <X className="size-2.5" strokeWidth={2.5} aria-hidden />
    </motion.button>
  );
}

/**
 * Inline Waste tag — Tracker entry-log treatment, also used on Reports rows.
 * Dismissible with X when `onDismiss` is set (single or grouped bulk unmark).
 */
export function AgencyWasteTag({
  className,
  onDismiss,
  dismissLabel = "Unmark as waste",
  disabled = false,
}: AgencyWasteDismissibleProps) {
  const { dismissible, prefersReducedMotion, visible, dismiss, onExitComplete } = useWasteDismiss(
    onDismiss,
    disabled,
  );

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {visible ? (
        <motion.span
          key="agency-waste-tracker-tag"
          className={cn("inline-flex shrink-0 self-center", className)}
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.18, ease: WASTE_EASE }}
        >
          <Badge
            variant="destructive"
            className={cn(
              "shrink-0 gap-0.5 px-1.5 text-[10px] font-semibold uppercase tracking-wide",
              dismissible && "pr-0.5",
            )}
          >
            Waste
            {dismissible ? (
              <WasteDismissButton
                disabled={disabled}
                prefersReducedMotion={prefersReducedMotion}
                label={dismissLabel}
                onDismiss={dismiss}
              />
            ) : null}
          </Badge>
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
