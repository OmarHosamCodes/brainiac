import { Play, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAgencyActiveTimerQuery } from "@/hooks/use-agency-queries";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format-duration";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
} from "@/stores/agency-time-tracking";

type AgencyMiniTimerProps = {
  teamId: string;
  taskId: string;
  projectId?: string;
  taskTitle?: string;
  projectName?: string;
  variant?: "default" | "compact";
};

export function AgencyMiniTimer({
  teamId,
  taskId,
  projectId,
  taskTitle,
  projectName,
  variant = "default",
}: AgencyMiniTimerProps) {
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tickerHandle = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(tickerHandle);
  }, []);

  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);
  const activeTimer = activeTimerQuery.data?.timer ?? null;
  const isRunningForThisTask =
    activeTimer?.taskId === taskId && activeTimer.teamId === teamId;

  const elapsedSeconds = useMemo(() => {
    if (!activeTimer || !isRunningForThisTask) return 0;
    const startedAt = new Date(activeTimer.startedAt).getTime();
    if (Number.isNaN(startedAt)) return 0;
    return Math.max(0, Math.floor((now - startedAt) / 1_000));
  }, [activeTimer, isRunningForThisTask, now]);

  async function toggleTimer() {
    if (!teamId || !projectId || !taskId) return;

    if (isRunningForThisTask && activeTimer) {
      await agencyTimeTrackingStore.stopTimer({
        teamId,
        activeTimer,
        description: activeTimer.description,
      });
      return;
    }

    await agencyTimeTrackingStore.startTimer({
      teamId,
      project: { id: projectId, name: projectName ?? "" },
      task: { id: taskId, title: taskTitle ?? "" },
      description: "",
      successDescription: "Timer started for this task.",
    });
  }

  const disabled = !projectId || !taskId || isTimerMutationPending;

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
          aria-label={`Stop timer, ${formatDuration(elapsedSeconds)} elapsed`}
          onClick={() => void toggleTimer()}
        >
          {isTimerMutationPending ? (
            <Square className="size-3 animate-pulse" aria-hidden />
          ) : (
            <Square className="size-3" aria-hidden />
          )}
          {formatDuration(elapsedSeconds)}
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
        onClick={() => void toggleTimer()}
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
      onClick={() => void toggleTimer()}
    >
      {isTimerMutationPending ? (
        <Square className="animate-pulse" />
      ) : isRunningForThisTask ? (
        <Square />
      ) : (
        <Play />
      )}
      {isRunningForThisTask ? formatDuration(elapsedSeconds) : "Track"}
    </Button>
  );
}
