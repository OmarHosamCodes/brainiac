import { PanelLeftClose } from "lucide-react";

import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskRailSummaryClass,
  agencyTaskRailSummaryDividerClass,
  agencyTaskRailSummaryLabelClass,
  agencyTaskRailSummaryMetricClass,
  agencyTaskRailSummaryValueClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskRailSummaryProps = {
  total: number | null;
  done: number | null;
  left: number | null;
  compact?: boolean;
  onCollapse?: () => void;
};

function SummaryMetric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number | null;
  valueClassName?: string;
}) {
  return (
    <div className={agencyTaskRailSummaryMetricClass}>
      <span className={agencyTaskRailSummaryLabelClass}>{label}</span>
      <span className={cn(agencyTaskRailSummaryValueClass, valueClassName)}>
        {value === null ? "—" : value}
      </span>
    </div>
  );
}

export function AgencyTaskRailSummary({
  total,
  done,
  left,
  compact = false,
  onCollapse,
}: AgencyTaskRailSummaryProps) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-0.5 text-center" aria-label="Task workload summary">
        <span className={cn(agencyMetricClass, "text-[10px] font-semibold text-highlighted")}>
          {done === null ? "—" : done}
        </span>
        <span className="text-[9px] text-muted">of {total === null ? "—" : total}</span>
      </div>
    );
  }

  return (
    <div className={agencyTaskRailSummaryClass} aria-label="Task workload summary">
      <h2 className="shrink-0 text-sm font-semibold text-highlighted">My tasks</h2>
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex shrink-0 items-center gap-2">
          <SummaryMetric label="Total" value={total} />
          <span className={agencyTaskRailSummaryDividerClass} aria-hidden />
          <SummaryMetric label="Done" value={done} valueClassName="text-success" />
          <span className={agencyTaskRailSummaryDividerClass} aria-hidden />
          <SummaryMetric label="Left" value={left} />
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
