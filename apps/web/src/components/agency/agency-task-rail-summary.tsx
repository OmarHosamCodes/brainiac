import { PanelLeftClose } from "lucide-react";

import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskRailSummaryClass,
  agencyTaskRailSummaryLabelClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskRailSummaryProps = {
  total: number | null;
  done: number | null;
  left: number | null;
  journeyCount?: number;
  standaloneTaskCount?: number;
  compact?: boolean;
  onCollapse?: () => void;
};

export function AgencyTaskRailSummary({
  total,
  done,
  left,
  journeyCount = 0,
  standaloneTaskCount = 0,
  compact = false,
  onCollapse,
}: AgencyTaskRailSummaryProps) {
  if (compact) {
    return (
      <div
        className="flex flex-col items-center gap-0.5 text-center"
        aria-label="Task workload summary"
      >
        <span className={cn(agencyMetricClass, "text-[11px] font-semibold")}>
          {done === null ? "—" : done}
        </span>
        <span className="text-[10px] text-muted">of {total === null ? "—" : total}</span>
      </div>
    );
  }

  const progressLabel =
    total === null || done === null ? "—" : total === 0 ? "No tasks" : `${done} of ${total} done`;

  return (
    <div className={agencyTaskRailSummaryClass} aria-label="Task workload summary">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="shrink-0 text-sm font-semibold text-highlighted">My tasks</h2>
        {journeyCount > 0 || standaloneTaskCount > 0 ? (
          <p className="text-[10px] text-muted">
            {journeyCount > 0
              ? `${journeyCount} ${journeyCount === 1 ? "journey" : "journeys"}`
              : null}
            {journeyCount > 0 && standaloneTaskCount > 0 ? " · " : null}
            {standaloneTaskCount > 0
              ? `${standaloneTaskCount} ${standaloneTaskCount === 1 ? "task" : "tasks"}`
              : null}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className={cn(agencyMetricClass, "text-[11px] font-semibold text-highlighted")}>
            {progressLabel}
          </span>
          {left !== null && total !== null && total > 0 ? (
            <span
              className={cn(
                agencyTaskRailSummaryLabelClass,
                "text-[10px] normal-case tracking-normal",
              )}
            >
              {left} open
            </span>
          ) : null}
        </div>
        {onCollapse ? (
          <button
            type="button"
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-default/70 hover:text-highlighted",
              agencyFocusRingClass,
              "motion-reduce:transition-none",
            )}
            aria-label="Collapse task list"
            onClick={onCollapse}
          >
            <PanelLeftClose className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
