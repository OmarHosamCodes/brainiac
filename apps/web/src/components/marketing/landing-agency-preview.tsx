import { CalendarDays, MoreVertical, Play } from "lucide-react";

import { marketingAgencyRows } from "@/components/marketing/marketing-demo-data";
import { reportEntryWasteTextClass } from "@/features/reports/agency-report-grouping";
import {
  agencyTimeEntryClockTimeInputClass,
  agencyTimeEntryDayGroupClass,
  agencyTimeEntryIconButtonClass,
  agencyTimeEntryMainClass,
  agencyTimeEntryRailBillableClass,
  agencyTimeEntryRailCalendarClass,
  agencyTimeEntryRailClass,
  agencyTimeEntryRailDurationClass,
  agencyTimeEntryRailMoreClass,
  agencyTimeEntryRailPlayClass,
  agencyTimeEntryRailQuietClass,
  agencyTimeEntryRailTimeClass,
  agencyTimeEntryRowClass,
  agencyTimeEntrySectionHeaderClass,
  agencyTimeTrackerCardClass,
  agencyTimeTrackerIconActionClass,
  agencyTimeTrackerMetricClass,
  agencyTimeTrackerPrimaryActionClass,
  agencyTimeTrackerRailCellClass,
  agencyTimeTrackerRailClass,
  agencyTimeTrackerRailDividerClass,
  agencyTimeTrackerTaskChooserTriggerClass,
  agencyWorkMetricClass,
  agencyWorkTimeRangeClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { AgencyWasteTag } from "@/features/shared/agency-waste-badge";
import { AgencyTimeEntryProjectLabel } from "@/features/time-tracking/entries/agency-time-entry-project-label";
import { formatAgencyDayLabel } from "@/features/time-tracking/format-agency-day-label";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format-duration";

const timeRangeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function formatClock(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return timeRangeFormatter.format(date);
}

type LandingAgencyPreviewProps = {
  className?: string;
  rowLimit?: number;
};

export function LandingAgencyPreview({ className, rowLimit }: LandingAgencyPreviewProps) {
  const rows = rowLimit ? marketingAgencyRows.slice(0, rowLimit) : marketingAgencyRows;
  let totalSeconds = 0;
  for (const row of rows) {
    totalSeconds += row.durationSeconds;
  }
  const todayKey = rows[0]?.startedAt.slice(0, 10) ?? "2026-06-15";
  const showTracker = !rowLimit;

  return (
    <div className={cn("min-w-0 space-y-3", className)} aria-hidden>
      {showTracker ? (
        <div className={agencyTimeTrackerCardClass}>
          <span className="min-w-0 flex-1 truncate pr-2 text-sm text-muted">
            What are you working on?
          </span>
          <div className={agencyTimeTrackerRailClass}>
            <span className={agencyTimeTrackerRailDividerClass} />
            <div className={agencyTimeTrackerRailCellClass}>
              <span className={cn(agencyTimeTrackerTaskChooserTriggerClass, "text-muted")}>
                Choose task
              </span>
            </div>
            <span className={agencyTimeTrackerRailDividerClass} />
            <div className={agencyTimeTrackerRailCellClass}>
              <span className={cn(agencyTimeTrackerIconActionClass, "text-info")}>$</span>
            </div>
            <span className={agencyTimeTrackerRailDividerClass} />
            <div className={agencyTimeTrackerRailCellClass}>
              <span className={cn(agencyTimeTrackerMetricClass, "text-muted")}>00:00:00</span>
            </div>
            <span className={agencyTimeTrackerRailDividerClass} />
            <div className={agencyTimeTrackerRailCellClass}>
              <span className={agencyTimeTrackerPrimaryActionClass}>Start</span>
            </div>
          </div>
        </div>
      ) : null}

      <section className={cn(agencyTimeEntryDayGroupClass, "overflow-x-auto")}>
        <header className={cn(agencyTimeEntrySectionHeaderClass, "min-w-[52rem] justify-between")}>
          <span className="min-w-0 flex-1 truncate px-5 text-sm font-semibold text-highlighted">
            {formatAgencyDayLabel(todayKey)}
          </span>
          <div className={agencyTimeEntryRailQuietClass}>
            <div className={agencyTimeEntryRailBillableClass} />
            <div className={agencyTimeEntryRailTimeClass} />
            <div className={agencyTimeEntryRailCalendarClass} />
            <div className={agencyTimeEntryRailDurationClass}>
              <span className={cn("w-full text-center", agencyWorkMetricClass)}>
                {formatDuration(totalSeconds, "clock")}
              </span>
            </div>
            <div className={agencyTimeEntryRailPlayClass} />
            <div className={agencyTimeEntryRailMoreClass} />
          </div>
        </header>

        <ul className="flex min-w-[52rem] flex-col">
          {rows.map((row) => (
            <li key={row.id}>
              <div className={agencyTimeEntryRowClass}>
                <div className={cn(agencyTimeEntryMainClass, "gap-3 pr-2")}>
                  <span
                    className={cn(
                      agencyWorkTitleClass,
                      "h-8 max-w-[14rem] truncate leading-8 font-normal",
                      row.isWaste && reportEntryWasteTextClass,
                    )}
                  >
                    {row.description}
                  </span>
                  <span
                    className={cn(
                      "flex h-8 min-w-0 max-w-[min(100%,18rem)] items-center truncate",
                      row.isWaste && reportEntryWasteTextClass,
                    )}
                  >
                    <AgencyTimeEntryProjectLabel
                      projectId={row.projectId}
                      projectName={row.projectName}
                      clientName={row.clientName}
                      taskTitle={row.taskTitle}
                      format="task-client"
                      className="min-w-0"
                    />
                  </span>
                  {row.isWaste ? <AgencyWasteTag /> : null}
                  <span className="min-w-0 flex-1" />
                </div>

                <div className={agencyTimeEntryRailClass}>
                  <div className={agencyTimeEntryRailBillableClass}>
                    <span
                      className={cn(
                        agencyTimeTrackerIconActionClass,
                        "inline-flex size-8 items-center justify-center",
                        row.isBillable ? "text-info" : "text-muted",
                      )}
                    >
                      $
                    </span>
                  </div>
                  <div className={agencyTimeEntryRailTimeClass}>
                    <span
                      className={cn(
                        agencyTimeEntryClockTimeInputClass,
                        "inline-flex items-center justify-center",
                      )}
                    >
                      {formatClock(row.startedAt)}
                    </span>
                    <span className={cn("shrink-0", agencyWorkTimeRangeClass)}>-</span>
                    <span
                      className={cn(
                        agencyTimeEntryClockTimeInputClass,
                        "inline-flex items-center justify-center",
                      )}
                    >
                      {formatClock(row.endedAt)}
                    </span>
                  </div>
                  <div className={agencyTimeEntryRailCalendarClass}>
                    <span className={agencyTimeEntryIconButtonClass}>
                      <CalendarDays className="size-4" />
                    </span>
                  </div>
                  <div className={agencyTimeEntryRailDurationClass}>
                    <span className={cn("block w-full text-center", agencyWorkMetricClass)}>
                      {formatDuration(row.durationSeconds, "clock")}
                    </span>
                  </div>
                  <div className={agencyTimeEntryRailPlayClass}>
                    <span className={agencyTimeEntryIconButtonClass}>
                      <Play className="size-3.5" />
                    </span>
                  </div>
                  <div className={agencyTimeEntryRailMoreClass}>
                    <span className={agencyTimeEntryIconButtonClass}>
                      <MoreVertical className="size-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
