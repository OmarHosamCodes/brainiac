import { Copy } from "lucide-react";

import {
  agencyTimeEntryDayGroupClass,
  agencyTimeEntryIconButtonClass,
  agencyTimeEntryRailActionsClass,
  agencyTimeEntryRailDurationClass,
  agencyTimeEntryRailQuietClass,
  agencyTimeEntrySectionHeaderClass,
  agencyWorkMetricClass,
} from "@/features/shared/agency-ui";
import { formatAgencyDayLabel } from "@/features/time-tracking/format-agency-day-label";
import { formatDuration } from "@/lib/utils/format-duration";
import type { TimeEntryDayGroup } from "@/features/time-tracking/group-time-entries";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";

/** Kept for the entries-log hook bulk patch draft (UI toolbar removed). */
export type AgencyDayBulkDraft = {
  projectId: string;
  taskId: string;
  description: string;
  tagIds: string[];
  isBillable: boolean | null;
};

type AgencyTimeEntryDayGroupViewProps = {
  day: TimeEntryDayGroup;
  renderGroupRow: AgencyTimeEntryGroupRowRenderer;
  highlightedEntryId?: string | null;
  selectedEntryIds?: Set<string>;
  bulkEditActive?: boolean;
  onToggleEntrySelected?: (entryIds: string[]) => void;
  onToggleDayBulkEdit?: (dateKey: string) => void;
};

export function AgencyTimeEntryDayGroupView({
  day,
  renderGroupRow,
  highlightedEntryId = null,
  selectedEntryIds,
  bulkEditActive = false,
  onToggleEntrySelected,
  onToggleDayBulkEdit,
}: AgencyTimeEntryDayGroupViewProps) {
  const lastGroupIndex = day.groups.length - 1;
  const dayEntryIds = day.groups.flatMap((group) => group.entries.map((entry) => entry.id));
  const selectedCount = dayEntryIds.filter((id) => selectedEntryIds?.has(id)).length;
  const allSelected = dayEntryIds.length > 0 && selectedCount === dayEntryIds.length;

  return (
    <section className={agencyTimeEntryDayGroupClass}>
      <header className={agencyTimeEntrySectionHeaderClass}>
        <div className="flex min-w-0 flex-1 items-center px-5">
          {bulkEditActive && onToggleEntrySelected ? (
            <label className="mr-3 inline-flex shrink-0 items-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleEntrySelected(dayEntryIds)}
                aria-label="Select all entries for day"
                className="size-3.5"
              />
            </label>
          ) : null}
          <span className="text-sm font-semibold text-highlighted">
            {formatAgencyDayLabel(day.dateKey)}
          </span>
        </div>

        <div className={agencyTimeEntryRailQuietClass}>
          <div className={agencyTimeEntryRailDurationClass}>
            <span className="mr-2 text-xs text-muted">Total</span>
            <span className={agencyWorkMetricClass}>
              {formatDuration(day.totalSeconds, "clock")}
            </span>
          </div>
          <div className={agencyTimeEntryRailActionsClass}>
            {onToggleDayBulkEdit ? (
              <button
                type="button"
                className={agencyTimeEntryIconButtonClass}
                aria-label={bulkEditActive ? "Exit bulk edit" : "Bulk edit day"}
                aria-pressed={bulkEditActive}
                onClick={() => onToggleDayBulkEdit(day.dateKey)}
              >
                <Copy className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <ul className="flex min-w-0 flex-col">
        {day.groups.map((group, index) => {
          const primaryEntry = group.entries[0];
          if (!primaryEntry) return null;
          const groupExpandKey = `${day.dateKey}||${group.collapseKey}`;
          const groupEntryIds = group.entries.map((entry) => entry.id);
          const selected = groupEntryIds.every((entryId) => selectedEntryIds?.has(entryId));
          return (
            <li key={groupExpandKey} className={bulkEditActive ? "flex items-stretch" : undefined}>
              {bulkEditActive && onToggleEntrySelected ? (
                <label className="flex w-[34px] shrink-0 items-center pl-5">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleEntrySelected(groupEntryIds)}
                    aria-label={`Select ${group.entries.length === 1 ? "entry" : `${group.entries.length} entries`}`}
                    className="size-3.5"
                  />
                </label>
              ) : null}
              <div className="min-w-0 flex-1">
                {renderGroupRow({
                  group,
                  groupExpandKey,
                  highlighted: highlightedEntryId === primaryEntry.id,
                  omitBottomBorder: index === lastGroupIndex,
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
