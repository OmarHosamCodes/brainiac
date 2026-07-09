import { AgencyTimeEntryRowContainer } from "@/features/time-tracking/containers/agency-time-entry-row-container";
import {
  agencyMetricClass,
  agencyTimeEntrySectionHeaderClass,
  agencyWorkTableListClass,
} from "@/features/shared/agency-ui";
import { formatAgencyDayLabel } from "@/features/time-tracking/format-agency-day-label";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import type { CollapsedEntryGroup, TimeEntryDayGroup } from "@/features/time-tracking/group-time-entries";
import type { TimeEntryDraft } from "@/features/time-tracking/agency-time-entry";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";

type AgencyTimeEntryDayGroupViewProps = {
  day: TimeEntryDayGroup;
  teamId: string;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  expandedGroupKeys: Set<string>;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  duplicatingEntryIds: string[];
  onToggleGroupExpand: (collapseKey: string) => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onDuplicate: (entryId: string) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  onToggleWaste: (entryId: string) => Promise<void>;
  togglingWasteEntryIds: string[];
  highlightedEntryId?: string | null;
};

export function AgencyTimeEntryDayGroupView({
  day,
  teamId,
  projects,
  tasks,
  expandedGroupKeys,
  isTimerMutationPending,
  deletingEntryIds,
  updatingEntryIds,
  duplicatingEntryIds,
  onToggleGroupExpand,
  onRestart,
  onDeleteGroup,
  onDeleteEntry,
  onDuplicate,
  onSaveEdit,
  onToggleWaste,
  togglingWasteEntryIds,
  highlightedEntryId = null,
}: AgencyTimeEntryDayGroupViewProps) {
  const visibleRowCount = day.groups.length;
  const lastGroupIndex = day.groups.length - 1;

  return (
    <section className={agencyWorkTableListClass}>
      <header className={agencyTimeEntrySectionHeaderClass}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-semibold text-highlighted">
            {formatAgencyDayLabel(day.dateKey)}
          </span>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
            {visibleRowCount}
          </span>
        </div>
        <span className="hidden sm:block" aria-hidden />
        <span className="inline-flex items-baseline gap-1.5 text-muted">
          <span>Total</span>
          <span className={cn("text-sm font-semibold", agencyMetricClass)}>
            {formatDuration(day.totalSeconds, "clock")}
          </span>
        </span>
        <span className="hidden sm:block" aria-hidden />
      </header>

      <ul className="flex min-w-0 flex-col">
        {day.groups.map((group, index) => {
          const groupExpandKey = `${day.dateKey}||${group.collapseKey}`;
          const primaryEntryId = group.entries[0]?.id ?? "";
          return (
            <li key={groupExpandKey}>
              <AgencyTimeEntryRowContainer
                group={group}
                teamId={teamId}
                projects={projects}
                tasks={tasks}
                expanded={expandedGroupKeys.has(groupExpandKey)}
                isTimerMutationPending={isTimerMutationPending}
                deletingEntryIds={deletingEntryIds}
                updatingEntryIds={updatingEntryIds}
                duplicatingEntryIds={duplicatingEntryIds}
                highlighted={highlightedEntryId === primaryEntryId}
                omitBottomBorder={index === lastGroupIndex}
                onToggleExpand={() => onToggleGroupExpand(groupExpandKey)}
                onRestart={onRestart}
                onDeleteGroup={onDeleteGroup}
                onDeleteEntry={onDeleteEntry}
                onDuplicate={onDuplicate}
                onSaveEdit={onSaveEdit}
                onToggleWaste={onToggleWaste}
                togglingWasteEntryIds={togglingWasteEntryIds}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
