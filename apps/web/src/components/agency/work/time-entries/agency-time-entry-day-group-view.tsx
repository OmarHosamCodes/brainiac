import { AgencyTimeEntryRowContainer } from "@/lib/agency/work/containers/agency-time-entry-row-container";
import { agencyMetricClass, agencyTimeDayHeaderClass, agencyTimeEntryScrollClass } from "@/lib/utils/agency-ui";
import { formatAgencyDayLabel } from "@/lib/utils/format-agency-day-label";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import type { CollapsedEntryGroup, TimeEntryDayGroup } from "@/lib/utils/group-time-entries";
import type { TimeEntryDraft } from "@/lib/schemas/agency-time-entry";
import type { AgencyProject, AgencyProjectTask } from "@/lib/schemas/agency-work";

type AgencyTimeEntryDayGroupViewProps = {
  day: TimeEntryDayGroup;
  teamId: string;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  expandedGroupKeys: Set<string>;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  onToggleGroupExpand: (collapseKey: string) => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
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
  onToggleGroupExpand,
  onRestart,
  onDeleteGroup,
  onDeleteEntry,
  onSaveEdit,
  onToggleWaste,
  togglingWasteEntryIds,
  highlightedEntryId = null,
}: AgencyTimeEntryDayGroupViewProps) {
  return (
    <section className="border-b-[2.5px] border-x border-muted">
      <header className={agencyTimeDayHeaderClass}>
        <span className="font-medium text-muted">{formatAgencyDayLabel(day.dateKey)}</span>
        <span className="inline-flex items-baseline gap-1.5 text-muted">
          <span>Total:</span>
          <span className={cn("text-base font-semibold", agencyMetricClass)}>
            {formatDuration(day.totalSeconds, "clock")}
          </span>
        </span>
      </header>

      <ul className={cn(agencyTimeEntryScrollClass, "flex flex-col ")}>
        {day.groups.map((group) => {
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
                highlighted={highlightedEntryId === primaryEntryId}
                onToggleExpand={() => onToggleGroupExpand(groupExpandKey)}
                onRestart={onRestart}
                onDeleteGroup={onDeleteGroup}
                onDeleteEntry={onDeleteEntry}
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
