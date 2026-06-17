import { Play, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAgencyActiveTimerQuery } from "@/hooks/use-agency-queries";
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
};

export function AgencyMiniTimer({
  teamId,
  taskId,
  projectId,
  taskTitle,
  projectName,
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
        description: activeTimer.description,
        linkUrl: activeTimer.linkUrl ?? "",
        tagIds: activeTimer.tags.map((t) => t.id),
        selectedTags: activeTimer.tags,
      });
      return;
    }

    await agencyTimeTrackingStore.startTimer({
      teamId,
      project: { id: projectId, name: projectName ?? "" },
      task: { id: taskId, title: taskTitle ?? "" },
      description: "",
      linkUrl: "",
      tagIds: [],
      selectedTags: [],
      successDescription: "Timer started for this task.",
    });
  }

  return (
    <Button
      variant={isRunningForThisTask ? "secondary" : "default"}
      size="sm"
      className="tabular-nums"
      disabled={!projectId || !taskId || isTimerMutationPending}
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
