import { AgencyTimeEntryDayGroupView } from "@/features/time-tracking/entries/agency-time-entry-day-group-view";
import {
  agencyMetricClass,
  agencyTimeWeekGroupBodyClass,
  agencyTimeWeekGroupClass,
  agencyTimeWeekGroupHeaderClass,
} from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import type { TimeEntryWeekGroup } from "@/features/time-tracking/group-time-entries";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";
import { cn } from "@/lib/utils";

type AgencyTimeEntryWeekGroupViewProps = {
  week: TimeEntryWeekGroup;
  renderGroupRow: AgencyTimeEntryGroupRowRenderer;
  highlightedEntryId?: string | null;
};

export function AgencyTimeEntryWeekGroupView({
  week,
  renderGroupRow,
  highlightedEntryId = null,
}: AgencyTimeEntryWeekGroupViewProps) {
  return (
    <section className={agencyTimeWeekGroupClass}>
      <header className={agencyTimeWeekGroupHeaderClass}>
        <h2 className="text-xs font-medium text-muted">{week.label}</h2>
        <p className="inline-flex items-baseline gap-2 text-xs text-muted">
          <span>Week total</span>
          <span className={cn(agencyMetricClass, "text-xs font-medium text-muted")}>
            {formatDuration(week.totalSeconds, "clock")}
          </span>
        </p>
      </header>

      <div className={agencyTimeWeekGroupBodyClass}>
        {week.days.map((day) => (
          <AgencyTimeEntryDayGroupView
            key={day.dateKey}
            day={day}
            highlightedEntryId={highlightedEntryId}
            renderGroupRow={renderGroupRow}
          />
        ))}
      </div>
    </section>
  );
}
