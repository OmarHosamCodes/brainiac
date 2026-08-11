import { Play, Square } from "lucide-react";
import { MotionConfig, motion } from "motion/react";

import { Button } from "@/ui/button";
import type { AgencyMiniTimerViewModel } from "@/features/time-tracking/hooks/use-agency-mini-timer";
import { agencyFocusRingClass, agencyWorkPlayButtonClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyMiniTimerViewProps = {
  view: AgencyMiniTimerViewModel;
};

export function AgencyMiniTimerView({ view }: AgencyMiniTimerViewProps) {
  const {
    variant,
    isRunningForThisTask,
    elapsedLabel,
    disabled,
    isTimerMutationPending,
    onToggle,
  } = view;

  if (variant === "compact") {
    const compactTap = { scale: 0.98 } as const;
    const compactTapTransition = { type: "tween" as const, duration: 0.12 };

    if (isRunningForThisTask) {
      return (
        <MotionConfig reducedMotion="user">
          <motion.button
            type="button"
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive",
              "transition-colors hover:bg-destructive/15",
              agencyFocusRingClass,
              "motion-reduce:transition-none",
              disabled && "cursor-not-allowed opacity-50",
            )}
            disabled={disabled}
            aria-label={`Stop timer, ${elapsedLabel} elapsed`}
            onClick={onToggle}
            whileTap={compactTap}
            transition={compactTapTransition}
          >
            {isTimerMutationPending ? (
              <Square className="size-3.5 animate-pulse" aria-hidden />
            ) : (
              <Square className="size-3.5" aria-hidden />
            )}
          </motion.button>
        </MotionConfig>
      );
    }

    return (
      <MotionConfig reducedMotion="user">
        <motion.button
          type="button"
          className={cn(
            agencyWorkPlayButtonClass,
            "motion-reduce:transition-none",
            disabled && "cursor-not-allowed opacity-50",
          )}
          disabled={disabled}
          aria-label="Track time"
          onClick={onToggle}
          whileTap={compactTap}
          transition={compactTapTransition}
        >
          {isTimerMutationPending ? (
            <Square className="size-3.5 animate-pulse" aria-hidden />
          ) : (
            <Play className="size-3.5" aria-hidden />
          )}
        </motion.button>
      </MotionConfig>
    );
  }

  return (
    <Button
      variant={isRunningForThisTask ? "secondary" : "default"}
      size="sm"
      className="tabular-nums"
      disabled={disabled}
      onClick={onToggle}
    >
      {isTimerMutationPending ? (
        <Square className="animate-pulse" />
      ) : isRunningForThisTask ? (
        <Square />
      ) : (
        <Play />
      )}
      {isRunningForThisTask ? elapsedLabel : "Track"}
    </Button>
  );
}
