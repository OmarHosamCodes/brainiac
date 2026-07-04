import { Trash2 } from "lucide-react";
import { motion, useMotionValue, animate } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import {
  AGENCY_TASK_ROW_DELETE_ACTION_WIDTH,
  clampAgencyTaskRowSwipeOffset,
  snapAgencyTaskRowSwipeOffset,
} from "@/lib/utils/agency-task-row-swipe";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

const SWIPE_LOCK_PX = 8;
const CLICK_GUARD_PX = 6;

type AgencyTaskRowSwipeShellProps = {
  children: ReactNode;
  enabled: boolean;
  disabled?: boolean;
  deleteLabel: string;
  rowLabel?: string;
  surfaceClassName?: string;
  onDeleteRequest: () => void;
  onRowActivate?: () => void;
};

export function AgencyTaskRowSwipeShell({
  children,
  enabled,
  disabled = false,
  deleteLabel,
  rowLabel,
  surfaceClassName,
  onDeleteRequest,
  onRowActivate,
}: AgencyTaskRowSwipeShellProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffset: number;
    locked: "none" | "horizontal" | "vertical";
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const canInteract = enabled && !disabled;
  const actionWidth = AGENCY_TASK_ROW_DELETE_ACTION_WIDTH;

  const restingX = open ? -actionWidth : 0;

  useEffect(() => {
    if (!canInteract) {
      setOpen(false);
    }
  }, [canInteract]);

  useEffect(() => {
    if (dragRef.current) return;
    if (prefersReducedMotion) {
      x.set(restingX);
      return;
    }
    void animate(x, restingX, {
      type: "spring",
      stiffness: 520,
      damping: 38,
      mass: 0.75,
    });
  }, [prefersReducedMotion, restingX, x]);

  const settleOffset = useCallback(
    (offsetX: number) => {
      const snapped = snapAgencyTaskRowSwipeOffset(offsetX, actionWidth);
      setOpen(snapped.open);
      if (snapped.open && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(8);
      }
      if (prefersReducedMotion) {
        x.set(snapped.offset);
        return;
      }
      void animate(x, snapped.offset, {
        type: "spring",
        stiffness: 520,
        damping: 38,
        mass: 0.75,
      });
    },
    [actionWidth, prefersReducedMotion, x],
  );

  const resetDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canInteract || event.button !== 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest("button, a, input, textarea, select")) {
        return;
      }
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: x.get(),
        locked: "none",
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canInteract, x],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      if (drag.locked === "none") {
        if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return;
        drag.locked = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      }

      if (drag.locked === "vertical") return;

      drag.moved = Math.abs(dx) > CLICK_GUARD_PX || drag.moved;
      event.preventDefault();
      x.set(clampAgencyTaskRowSwipeOffset(drag.startOffset + dx, actionWidth));
    },
    [actionWidth, x],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (drag.locked === "horizontal") {
        if (drag.moved) {
          suppressClickRef.current = true;
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }
        settleOffset(x.get());
      } else if (!drag.moved && drag.locked !== "vertical") {
        onRowActivate?.();
      }

      resetDrag();
    },
    [onRowActivate, resetDrag, settleOffset, x],
  );

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      settleOffset(open ? -actionWidth : 0);
      resetDrag();
    },
    [actionWidth, open, resetDrag, settleOffset],
  );

  const guardClick = useCallback((event: React.MouseEvent) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    }
  }, []);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative isolate w-full overflow-hidden">
      <div
        className={cn(
          "absolute inset-y-0 right-0 z-0 flex items-stretch",
          !open && "pointer-events-none",
        )}
        style={{ width: actionWidth }}
        aria-hidden={!open}
      >
        <button
          type="button"
          disabled={disabled}
          tabIndex={open ? 0 : -1}
          aria-label={deleteLabel}
          className={cn(
            "flex h-full w-full flex-col items-center justify-center gap-0.5 bg-destructive text-white",
            "text-[10px] font-bold uppercase tracking-wide",
            agencyFocusRingClass,
            "motion-reduce:transition-none transition-opacity",
            open ? "opacity-100" : "opacity-0",
            disabled && "cursor-not-allowed opacity-50",
          )}
          onClick={(event) => {
            event.stopPropagation();
            if (disabled) return;
            onDeleteRequest();
            setOpen(false);
            x.set(0);
          }}
        >
          <Trash2 className="size-4" strokeWidth={2.25} aria-hidden />
          Delete
        </button>
      </div>

      <motion.div
        className={cn(
          "relative z-10 w-full touch-pan-y bg-[var(--background)]",
          surfaceClassName,
          onRowActivate && agencyFocusRingClass,
        )}
        style={{ x }}
        role={onRowActivate ? "button" : undefined}
        tabIndex={onRowActivate && canInteract ? 0 : undefined}
        aria-label={onRowActivate ? rowLabel : undefined}
        onKeyDown={(event) => {
          if (!onRowActivate || !canInteract) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onRowActivate();
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={guardClick}
      >
        {children}
      </motion.div>
    </div>
  );
}
