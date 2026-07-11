import {
  agencyTimeEntryRailActionsClass,
  agencyTimeEntryRailDurationClass,
  agencyTimeEntryRailQuietClass,
  agencyTimeEntryRailTimeClass,
  agencyTimeEntrySectionHeaderClass,
  agencyTimeEntrySectionLabelClass,
  agencyWorkMetricClass,
} from "@/features/shared/agency-ui";
import { formatAgencyDayLabel } from "@/features/time-tracking/format-agency-day-label";
import { formatDuration } from "@/lib/utils/format-duration";
import type { TimeEntryDayGroup } from "@/features/time-tracking/group-time-entries";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";

type AgencyTimeEntryDayGroupViewProps = {
  day: TimeEntryDayGroup;
  renderGroupRow: AgencyTimeEntryGroupRowRenderer;
  highlightedEntryId?: string | null;
};

export function AgencyTimeEntryDayGroupView({
  day,
  renderGroupRow,
  highlightedEntryId = null,
}: AgencyTimeEntryDayGroupViewProps) {
  const lastGroupIndex = day.groups.length - 1;

  return (
    <section>
      <header className={agencyTimeEntrySectionHeaderClass}>
        <div className={agencyTimeEntrySectionLabelClass}>{formatAgencyDayLabel(day.dateKey)}</div>
        <div className={agencyTimeEntryRailQuietClass}>
          <div className={agencyTimeEntryRailTimeClass} aria-hidden />
          <div className={agencyTimeEntryRailDurationClass}>
            <span className="sr-only">Total</span>
            <span className={agencyWorkMetricClass}>
              {formatDuration(day.totalSeconds, "clock")}
            </span>
          </div>
          <div className={agencyTimeEntryRailActionsClass} aria-hidden />
        </div>
      </header>

      <ul className="flex min-w-0 flex-col">
        {day.groups.map((group, index) => {
          const primaryEntry = group.entries[0];
          if (!primaryEntry) return null;
          const groupExpandKey = `${day.dateKey}||${group.collapseKey}`;
          return (
            <li key={groupExpandKey}>
              {renderGroupRow({
                group,
                groupExpandKey,
                highlighted: highlightedEntryId === primaryEntry.id,
                omitBottomBorder: index === lastGroupIndex,
              })}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
