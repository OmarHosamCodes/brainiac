import { AgencyTimeEntryDayGroupView } from "@/features/time-tracking/entries/agency-time-entry-day-group-view";
import {
  agencyTimeWeekGroupBodyClass,
  agencyTimeWeekGroupClass,
} from "@/features/shared/agency-ui";
import type { TimeEntryWeekGroup } from "@/features/time-tracking/group-time-entries";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";

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
    <section className={agencyTimeWeekGroupClass} aria-label={week.label}>
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
