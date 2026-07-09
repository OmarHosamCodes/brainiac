import { Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgencyMiniTimerViewModel } from "@/lib/agency/work/hooks/use-agency-mini-timer";
import { agencyFocusRingClass, agencyWorkPlayButtonClass } from "@/lib/utils/agency-ui";
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
    if (isRunningForThisTask) {
      return (
        <button
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
        >
          {isTimerMutationPending ? (
            <Square className="size-3.5 animate-pulse" aria-hidden />
          ) : (
            <Square className="size-3.5" aria-hidden />
          )}
        </button>
      );
    }

    return (
      <button
        type="button"
        className={cn(
          agencyWorkPlayButtonClass,
          "motion-reduce:transition-none",
          disabled && "cursor-not-allowed opacity-50",
        )}
        disabled={disabled}
        aria-label="Track time"
        onClick={onToggle}
      >
        {isTimerMutationPending ? (
          <Square className="size-3.5 animate-pulse" aria-hidden />
        ) : (
          <Play className="size-3.5" aria-hidden />
        )}
      </button>
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
