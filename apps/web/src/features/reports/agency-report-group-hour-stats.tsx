import {
  AgencyHourBreakdownCompactStrip,
  compactHourCompositionItems,
} from "@/features/shared/agency-hour-breakdown-compact-strip";
import { agencyMetricClass } from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import type { ReportHourMetrics } from "./agency-report-hour-metrics";

export type AgencyReportGroupHourStatsProps = {
  metrics: ReportHourMetrics;
  showTotal?: boolean;
  showLabels?: boolean;
};

/** Total plus non-empty Paid / Waste / Internal dots. */
export function AgencyReportGroupHourStats({
  metrics,
  showTotal = false,
  showLabels = true,
}: AgencyReportGroupHourStatsProps) {
  const hasComposition = compactHourCompositionItems(metrics).length > 0;
  if (!showTotal && !hasComposition) return null;

  return (
    <div className="min-w-0 space-y-1.5">
      {showTotal && metrics.totalSeconds > 0 ? (
        <p className={cn(agencyMetricClass, "text-xs font-semibold")}>
          {formatDuration(metrics.totalSeconds, "clock")}
        </p>
      ) : null}
      {hasComposition ? (
        <AgencyHourBreakdownCompactStrip
          showLabels={showLabels}
          totalSeconds={metrics.totalSeconds}
          externalSeconds={metrics.externalSeconds}
          internalSeconds={metrics.internalSeconds}
          internalBillableSeconds={metrics.internalBillableSeconds}
          paidSeconds={metrics.paidSeconds}
        />
      ) : null}
    </div>
  );
}
