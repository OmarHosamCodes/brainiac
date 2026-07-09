import { AgencyTimeEntryProjectLabel } from "@/features/time-tracking/entries/agency-time-entry-project-label";
import {
  marketingAgencyDayTotalSeconds,
  marketingAgencyRows,
} from "@/components/marketing/marketing-demo-data";
import {
  agencyMetricClass,
  agencyTimeDayHeaderClass,
  agencyTimeEntryRowClass,
  agencyTimeLogPanelClass,
} from "@/features/shared/agency-ui";
import { formatAgencyDayLabel } from "@/features/time-tracking/format-agency-day-label";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

const timeRangeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function formatTimeRange(startedAt: string, endedAt: string) {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  return `${timeRangeFormatter.format(start)} - ${timeRangeFormatter.format(end)}`;
}

export function LandingAgencyPreview({ className }: { className?: string }) {
  const todayKey = marketingAgencyRows[0]?.startedAt.slice(0, 10) ?? "2026-06-15";

  return (
    <div className={cn(agencyTimeLogPanelClass, "min-w-0 max-w-full", className)}>
      <section className="border-b-[2.5px] border-x border-muted">
        <header className={agencyTimeDayHeaderClass}>
          <span className="font-medium text-muted">{formatAgencyDayLabel(todayKey)}</span>
          <span className="inline-flex items-baseline gap-1.5 text-muted">
            <span>Total:</span>
            <span className={cn("text-base font-semibold", agencyMetricClass)}>
              {formatDuration(marketingAgencyDayTotalSeconds, "short")}
            </span>
          </span>
        </header>

        <ul className="flex flex-col">
          {marketingAgencyRows.map((row) => (
            <li key={row.id}>
              <div className={cn(agencyTimeEntryRowClass, "px-4 py-2.5")}>
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-sm font-medium text-highlighted">
                    {row.description}
                  </span>
                  <span className={cn("shrink-0 text-sm font-semibold", agencyMetricClass)}>
                    {formatDuration(row.durationSeconds, "short")}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <AgencyTimeEntryProjectLabel
                    projectId={row.projectId}
                    projectName={row.projectName}
                    clientName={row.clientName}
                    className="min-w-0"
                  />
                  <span className="shrink-0 text-xs text-muted">
                    {formatTimeRange(row.startedAt, row.endedAt)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
