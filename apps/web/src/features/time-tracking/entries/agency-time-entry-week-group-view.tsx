import { AgencyTimeEntryDayGroupView } from "@/features/time-tracking/entries/agency-time-entry-day-group-view";
import {
  agencyTimeWeekGroupBodyClass,
  agencyTimeWeekGroupClass,
  agencyTimeWeekGroupHeaderClass,
  agencyWorkWeekLabelClass,
} from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import type { TimeEntryWeekGroup } from "@/features/time-tracking/group-time-entries";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";
import { cn } from "@/lib/utils";

type AgencyTimeEntryWeekGroupViewProps = {
  week: TimeEntryWeekGroup;
  renderGroupRow: AgencyTimeEntryGroupRowRenderer;
  highlightedEntryId?: string | null;
  selectedEntryIds?: Set<string>;
  bulkEditDayKey?: string | null;
  onToggleEntrySelected?: (entryIds: string[]) => void;
  onToggleDayBulkEdit?: (dateKey: string) => void;
};

export function AgencyTimeEntryWeekGroupView({
  week,
  renderGroupRow,
  highlightedEntryId = null,
  selectedEntryIds,
  bulkEditDayKey = null,
  onToggleEntrySelected,
  onToggleDayBulkEdit,
}: AgencyTimeEntryWeekGroupViewProps) {
  return (
    <section className={agencyTimeWeekGroupClass}>
      <header className={agencyTimeWeekGroupHeaderClass}>
        <h2 className={agencyWorkWeekLabelClass}>{week.label}</h2>
        <p className={cn("inline-flex items-baseline gap-2", agencyWorkWeekLabelClass)}>
          <span>Week total:</span>
          <span className={cn("font-mono tabular-nums", agencyWorkWeekLabelClass)}>
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
            selectedEntryIds={selectedEntryIds}
            bulkEditActive={bulkEditDayKey === day.dateKey}
            onToggleEntrySelected={onToggleEntrySelected}
            onToggleDayBulkEdit={onToggleDayBulkEdit}
          />
        ))}
      </div>
    </section>
  );
}
