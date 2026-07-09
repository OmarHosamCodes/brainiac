import { AgencyTaskRailRingButton } from "@/features/task-management/task-list/agency-task-rail-ring-button";
import { agencyMetricClass, agencyTaskRailSummaryClass } from "@/features/shared/agency-ui";
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

function buildWorkloadAriaLabel(
  left: number | null,
  done: number | null,
  total: number | null,
): string {
  if (left === null || done === null || total === null) {
    return "Task workload summary";
  }
  if (total === 0) {
    return "My tasks, no tasks yet";
  }
  if (left === 0) {
    return `My tasks, all ${total} complete`;
  }
  return `My tasks, ${left} open, ${done} of ${total} complete`;
}

function buildTaskRailSubtitle(
  left: number | null,
  total: number | null,
  journeyCount: number,
): string {
  if (left === null || total === null) return "—";
  if (total === 0) return "No tasks yet";
  if (left === 0) return "All complete";

  const openLabel = `${left} open`;
  if (journeyCount > 0) {
    return `${openLabel} · ${journeyCount} ${journeyCount === 1 ? "journey" : "journeys"}`;
  }
  return openLabel;
}

function buildCollapseAriaLabel(left: number | null): string {
  if (left === null) return "Collapse task list";
  return `Collapse task list, ${left} open ${left === 1 ? "task" : "tasks"}`;
}

export function AgencyTaskRailSummary({
  total,
  done,
  left,
  journeyCount = 0,
  standaloneTaskCount: _standaloneTaskCount = 0,
  compact = false,
  onCollapse,
}: AgencyTaskRailSummaryProps) {
  if (compact) {
    return (
      <div
        className="flex flex-col items-center gap-0.5 text-center"
        aria-label={buildWorkloadAriaLabel(left, done, total)}
      >
        <span className={cn(agencyMetricClass, "text-[11px] font-semibold")}>
          {done === null ? "—" : done}
        </span>
        <span className="text-[10px] text-muted">of {total === null ? "—" : total}</span>
      </div>
    );
  }

  const subtitle = buildTaskRailSubtitle(left, total, journeyCount);
  const workloadAriaLabel = buildWorkloadAriaLabel(left, done, total);

  return (
    <header className={agencyTaskRailSummaryClass} aria-label={workloadAriaLabel}>
      {onCollapse ? (
        <AgencyTaskRailRingButton
          activeCount={left}
          doneCount={done}
          totalCount={total}
          ariaLabel={buildCollapseAriaLabel(left)}
          onClick={onCollapse}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-highlighted">My tasks</h2>
        <p className="truncate text-xs text-muted">{subtitle}</p>
      </div>
    </header>
  );
}
