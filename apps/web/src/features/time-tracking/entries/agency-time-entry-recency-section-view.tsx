import {
  agencyMetricClass,
  agencyTimeEntrySectionHeaderClass,
  agencyWorkTableListClass,
} from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import type { TimeEntryRecencySection } from "@/features/time-tracking/group-time-entries";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";
import { cn } from "@/lib/utils";

type AgencyTimeEntryRecencySectionViewProps = {
  section: TimeEntryRecencySection;
  renderGroupRow: AgencyTimeEntryGroupRowRenderer;
  highlightedEntryId?: string | null;
};

export function AgencyTimeEntryRecencySectionView({
  section,
  renderGroupRow,
  highlightedEntryId = null,
}: AgencyTimeEntryRecencySectionViewProps) {
  const lastGroupIndex = section.groups.length - 1;

  return (
    <section className={agencyWorkTableListClass}>
      <header className={agencyTimeEntrySectionHeaderClass}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-semibold text-highlighted">{section.label}</span>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
            {section.groups.length}
          </span>
        </div>
        <span className="hidden sm:block" aria-hidden />
        <span className="inline-flex items-baseline gap-1.5 text-muted">
          <span>Total</span>
          <span className={cn("text-sm font-semibold", agencyMetricClass)}>
            {formatDuration(section.totalSeconds, "clock")}
          </span>
        </span>
        <span className="hidden sm:block" aria-hidden />
      </header>

      <ul className="flex min-w-0 flex-col">
        {section.groups.map((group, index) => {
          const primaryEntry = group.entries[0];
          if (!primaryEntry) return null;
          const groupExpandKey = `${primaryEntry.startedAt.slice(0, 10)}||${group.collapseKey}`;
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
