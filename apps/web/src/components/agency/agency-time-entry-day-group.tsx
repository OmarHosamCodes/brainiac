import { AgencyTimeEntryRow } from "@/components/agency/agency-time-entry-row";
import { agencyMetricClass, agencyTimeDayHeaderClass } from "@/lib/utils/agency-ui";
import { formatAgencyDayLabel } from "@/lib/utils/format-agency-day-label";
import { formatDuration } from "@/lib/utils/format-duration";
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
  editingEntryId: string | null;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  onToggleGroupExpand: (collapseKey: string) => void;
  onEditEntry: (entryId: string) => void;
  onCancelEdit: () => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
};

export function AgencyTimeEntryDayGroup({
  day,
  teamId,
  projects,
  tasks,
  expandedGroupKeys,
  editingEntryId,
  isTimerMutationPending,
  deletingEntryIds,
  updatingEntryIds,
  onToggleGroupExpand,
  onEditEntry,
  onCancelEdit,
  onRestart,
  onDeleteGroup,
  onDeleteEntry,
  onSaveEdit,
}: AgencyTimeEntryDayGroupProps) {
  return (
    <section>
      <header className={agencyTimeDayHeaderClass}>
        <span className="font-semibold text-highlighted">{formatAgencyDayLabel(day.dateKey)}</span>
        <span className={agencyMetricClass}>{formatDuration(day.totalSeconds, "short")}</span>
      </header>

      <ul>
        {day.groups.map((group) => {
          const primaryEntryId = group.entries[0]!.id;
          return (
            <li key={group.collapseKey}>
              <AgencyTimeEntryRow
                group={group}
                teamId={teamId}
                projects={projects}
                tasks={tasks}
                expanded={expandedGroupKeys.has(group.collapseKey)}
                editing={editingEntryId === primaryEntryId}
                isTimerMutationPending={isTimerMutationPending}
                deletingEntryIds={deletingEntryIds}
                updatingEntryIds={updatingEntryIds}
                onToggleExpand={() => onToggleGroupExpand(group.collapseKey)}
                onEdit={() => onEditEntry(primaryEntryId)}
                onCancelEdit={onCancelEdit}
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
