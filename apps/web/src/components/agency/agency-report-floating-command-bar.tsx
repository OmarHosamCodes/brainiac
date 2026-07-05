import { Loader2, Pencil, Trash2, TrashIcon, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { ReportCommandBarAnchor } from "@/lib/agency/reports/use-agency-report-creator";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

const IDLE_DISMISS_MS = 3000;

const glassEnterTransition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 24,
  mass: 0.88,
};

const glassExitTransition = {
  duration: 0.32,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

type AgencyReportFloatingCommandBarProps = {
  visible: boolean;
  anchor: ReportCommandBarAnchor | null;
  canUndo: boolean;
  canMarkWaste: boolean;
  isWaste: boolean;
  wastePending?: boolean;
  onDelete: () => void;
  onToggleWaste: () => void;
  onEdit: () => void;
  onUndo: () => void;
  onDismiss: () => void;
};

function useClampedBarPosition(
  anchor: ReportCommandBarAnchor | null,
  barRef: RefObject<HTMLDivElement | null>,
) {
  const fallback = anchor ? { left: anchor.x, top: anchor.y + 12 } : null;
  const [position, setPosition] = useState<{ left: number; top: number } | null>(fallback);

  useLayoutEffect(() => {
    if (!anchor) {
      setPosition(null);
      return;
    }

    if (!barRef.current) {
      setPosition({ left: anchor.x, top: anchor.y + 12 });
      return;
    }

    const rect = barRef.current.getBoundingClientRect();
    const pad = 8;
    const offsetY = 12;
    let left = anchor.x;
    let top = anchor.y + offsetY;
    left = Math.max(pad + rect.width / 2, Math.min(window.innerWidth - pad - rect.width / 2, left));
    top = Math.max(pad, Math.min(window.innerHeight - pad - rect.height, top));
    setPosition({ left, top });
  }, [anchor, barRef]);

  return position;
}

function useAutoDismissCommandBar(
  active: boolean,
  barRef: RefObject<HTMLDivElement | null>,
  onDismiss: () => void,
) {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const scheduleIdleDismiss = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(onDismiss, IDLE_DISMISS_MS);
  }, [clearIdleTimer, onDismiss]);

  useEffect(() => {
    if (!active) {
      clearIdleTimer();
      return;
    }

    scheduleIdleDismiss();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (barRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-report-creator-row]")) return;
      onDismiss();
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      clearIdleTimer();
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [active, barRef, clearIdleTimer, onDismiss, scheduleIdleDismiss]);

  return { onBarMouseEnter: clearIdleTimer, onBarMouseLeave: scheduleIdleDismiss };
}

export function AgencyReportFloatingCommandBar({
  visible,
  anchor,
  canUndo,
  canMarkWaste,
  isWaste,
  wastePending = false,
  onDelete,
  onToggleWaste,
  onEdit,
  onUndo,
  onDismiss,
}: AgencyReportFloatingCommandBarProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const barRef = useRef<HTMLDivElement>(null);
  const position = useClampedBarPosition(visible ? anchor : null, barRef);
  const { onBarMouseEnter, onBarMouseLeave } = useAutoDismissCommandBar(visible, barRef, onDismiss);

  const glassVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        hidden: { opacity: 0, scale: 0.78, y: 10, filter: "blur(10px)" },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          filter: "blur(0px)",
          transition: glassEnterTransition,
        },
        exit: {
          opacity: 0,
          scale: 0.84,
          y: 8,
          filter: "blur(8px)",
          transition: glassExitTransition,
        },
      };

  return (
    <AnimatePresence>
      {visible && anchor && position ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2"
          style={{ left: position.left, top: position.top }}
        >
          <motion.div
            ref={barRef}
            key="report-command-bar"
            variants={glassVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ transformOrigin: "50% 0%" }}
            className="agency-report-command-bar pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1.5"
            onClick={(event) => event.stopPropagation()}
            onMouseEnter={onBarMouseEnter}
            onMouseLeave={onBarMouseLeave}
          >
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-9 w-9 rounded-full p-0 text-error", agencyFocusRingClass)}
            aria-label="Remove from report"
            title="Remove from report (Delete)"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 w-9 rounded-full p-0",
              isWaste && "text-warning",
              agencyFocusRingClass,
            )}
            aria-label={isWaste ? "Unmark waste" : "Mark as waste"}
            title={
              canMarkWaste
                ? isWaste
                  ? "Unmark waste (W)"
                  : "Mark as waste (W)"
                : "Link a task to mark as waste"
            }
            disabled={!canMarkWaste || wastePending}
            onClick={onToggleWaste}
          >
            {wastePending ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <TrashIcon className="size-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn("h-9 w-9 rounded-full p-0", agencyFocusRingClass)}
            aria-label="Edit entry"
            title="Edit (E)"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>

          <span className="mx-0.5 h-5 w-px bg-default" aria-hidden />

          <Button
            variant="ghost"
            size="sm"
            className={cn("h-9 w-9 rounded-full p-0", agencyFocusRingClass)}
            aria-label="Undo remove"
            title="Undo remove (Ctrl+Z)"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 className="size-4" />
          </Button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
