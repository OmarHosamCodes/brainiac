import { Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgencyMiniTimerViewModel } from "@/lib/agency/work/hooks/use-agency-mini-timer";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyMiniTimerViewProps = {
  view: AgencyMiniTimerViewModel;
};

export function AgencyMiniTimerView({ view }: AgencyMiniTimerViewProps) {
  const { variant, isRunningForThisTask, elapsedLabel, disabled, isTimerMutationPending, onToggle } =
    view;

  if (variant === "compact") {
    if (isRunningForThisTask) {
      return (
        <button
          type="button"
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 font-mono text-[11px] font-medium tabular-nums text-primary",
            "transition-colors hover:bg-primary/15",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
            disabled && "cursor-not-allowed opacity-50",
          )}
          disabled={disabled}
          aria-label={`Stop timer, ${elapsedLabel} elapsed`}
          onClick={onToggle}
        >
          {isTimerMutationPending ? (
            <Square className="size-3 animate-pulse" aria-hidden />
          ) : (
            <Square className="size-3" aria-hidden />
          )}
          {elapsedLabel}
        </button>
      );
    }

    return (
      <button
        type="button"
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted",
          "transition-colors hover:bg-elevated hover:text-highlighted",
          agencyFocusRingClass,
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
