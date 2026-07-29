import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { Badge } from "@/ui/badge";
import { cn } from "@/lib/utils";

/** Matches `--motion-ease-out` (ease-out-quart). */
const WASTE_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

/** Outward tilt (deg) for the Reports corner pill — leans up-left. */
const WASTE_REPORT_PILL_ROTATE = -16;

export type AgencyWasteReportBorderSegment = "start" | "middle" | "end" | "only";

const agencyWasteReportBorderClass = "border-solid border-destructive/35";

/** Solid rectangle segment for Reports table cells from Task onward (excludes Project). */
export function agencyWasteReportCellBorderClass(
  segment: AgencyWasteReportBorderSegment | null,
): string | undefined {
  if (!segment) return undefined;
  switch (segment) {
    case "only":
      return cn(agencyWasteReportBorderClass, "border rounded-md");
    case "start":
      return cn(agencyWasteReportBorderClass, "border-l border-t border-b rounded-l-md");
    case "middle":
      return cn(agencyWasteReportBorderClass, "border-t border-b");
    case "end":
      return cn(agencyWasteReportBorderClass, "border-r border-t border-b rounded-r-md");
    default: {
      const _exhaustive: never = segment;
      return _exhaustive;
    }
  }
}

type AgencyWasteReportBorderColumn = "task" | "description" | "duration" | "assignee" | "actions";

/** Which bordered segment a Reports row column gets when waste-marked. */
export function resolveAgencyWasteReportBorderSegment(
  column: AgencyWasteReportBorderColumn,
  visible: Record<AgencyWasteReportBorderColumn, boolean>,
): AgencyWasteReportBorderSegment | null {
  const columns = (["task", "description", "duration", "assignee", "actions"] as const).filter(
    (key) => visible[key],
  );
  const index = columns.indexOf(column);
  if (index === -1) return null;
  if (columns.length === 1) return "only";
  if (index === 0) return "start";
  if (index === columns.length - 1) return "end";
  return "middle";
}

/** Host for the Reports corner pill (task cell). */
export const agencyWasteStampHostClass = "relative overflow-visible";

type AgencyWasteDismissibleProps = {
  className?: string;
  /** Clears waste when dismissed. Omit for display-only. */
  onDismiss?: () => void;
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
  onDismiss,
  tone = "soft",
}: {
  disabled: boolean;
  prefersReducedMotion: boolean;
  onDismiss: () => void;
  tone?: "soft" | "solid";
}) {
  return (
    <motion.button
      type="button"
      data-icon="inline-end"
      className={cn(
        "inline-flex size-3.5 shrink-0 items-center justify-center rounded-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:opacity-50",
        tone === "solid"
          ? "text-destructive-foreground/80 hover:bg-destructive-foreground/15 hover:text-destructive-foreground"
          : "text-destructive/70 hover:bg-destructive/10 hover:text-destructive",
      )}
      aria-label="Unmark as waste"
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
 * Reports corner pill — badge center sits on the Task cell top-left corner, slight outward tilt.
 * Parent must use `agencyWasteStampHostClass`.
 */
export function AgencyWasteBadge({
  className,
  onDismiss,
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
          key="agency-waste-report-pill"
          className={cn("pointer-events-auto absolute top-0 left-0 z-10", className)}
          initial={
            prefersReducedMotion
              ? { x: "-50%", y: "-50%" }
              : {
                  opacity: 0,
                  scale: 0.92,
                  x: "-50%",
                  y: "-50%",
                  rotate: WASTE_REPORT_PILL_ROTATE - 4,
                }
          }
          animate={{
            opacity: 1,
            scale: 1,
            x: "-50%",
            y: "-50%",
            rotate: WASTE_REPORT_PILL_ROTATE,
          }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  scale: 0.92,
                  x: "-50%",
                  y: "-50%",
                  rotate: WASTE_REPORT_PILL_ROTATE + 3,
                }
          }
          transition={{ duration: 0.18, ease: WASTE_EASE }}
        >
          <Badge
            variant="destructive"
            className={cn(
              "h-5 gap-0.5 rounded-full px-2 text-[10px] font-semibold tracking-wide shadow-sm",
              dismissible && "pr-1",
            )}
          >
            Waste
            {dismissible ? (
              <WasteDismissButton
                disabled={disabled}
                prefersReducedMotion={prefersReducedMotion}
                onDismiss={dismiss}
              />
            ) : null}
          </Badge>
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Tracker inline Waste tag — sits in the entry row flow with optional dismiss.
 * No corner positioning; no dotted waste frame.
 */
export function AgencyWasteTag({
  className,
  onDismiss,
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
                onDismiss={dismiss}
              />
            ) : null}
          </Badge>
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
