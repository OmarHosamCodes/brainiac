import { AgencyTimeEntryRow } from "@/components/agency/agency-time-entry-row";
import { agencyMetricClass, agencyTimeDayHeaderClass } from "@/lib/utils/agency-ui";
import { formatAgencyDayLabel } from "@/lib/utils/format-agency-day-label";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import type { CollapsedEntryGroup, TimeEntryDayGroup } from "@/lib/utils/group-time-entries";
import type { TimeEntryDraft } from "@/lib/utils/time-entry-draft";

type Project = {
  id: string;
  clientName: string;
  name: string;
};

type Task = {
  id: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assigneeName?: string | null;
  dueDate?: string | null;
};

type AgencyTimeEntryDayGroupProps = {
  day: TimeEntryDayGroup;
  teamId: string;
  projects: Project[];
  tasks: Task[];
  expandedGroupKeys: Set<string>;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  onToggleGroupExpand: (collapseKey: string) => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  highlightedEntryId?: string | null;
};

export function AgencyTimeEntryDayGroup({
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
  highlightedEntryId = null,
}: AgencyTimeEntryDayGroupProps) {
  return (
    <section>
      <header className={agencyTimeDayHeaderClass}>
        <span className="font-medium text-muted">{formatAgencyDayLabel(day.dateKey)}</span>
        <span className="inline-flex items-baseline gap-1.5 text-muted">
          <span>Total:</span>
          <span className={cn("text-base font-semibold", agencyMetricClass)}>
            {formatDuration(day.totalSeconds, "clock")}
          </span>
        </span>
      </header>

      <ul>
        {day.groups.map((group) => {
          const groupExpandKey = `${day.dateKey}||${group.collapseKey}`;
          const primaryEntryId = group.entries[0]?.id ?? "";
          return (
            <li key={groupExpandKey}>
              <AgencyTimeEntryRow
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
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
