import { AgencyTimeEntryDayGroupView } from "@/features/time-tracking/entries/agency-time-entry-day-group-view";
import { agencyTimeWeekHeaderClass } from "@/features/shared/agency-ui";
import type {
  CollapsedEntryGroup,
  TimeEntryWeekGroup,
} from "@/features/time-tracking/group-time-entries";
import type { TimeEntryDraft } from "@/features/time-tracking/agency-time-entry";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";

type AgencyTimeEntryWeekGroupViewProps = {
  week: TimeEntryWeekGroup;
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

export function AgencyTimeEntryWeekGroupView({
  week,
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
}: AgencyTimeEntryWeekGroupViewProps) {
  return (
    <section>
      <h2 className={agencyTimeWeekHeaderClass}>{week.label}</h2>

      <div className="flex flex-col gap-4">
        {week.days.map((day) => (
          <AgencyTimeEntryDayGroupView
            key={day.dateKey}
            day={day}
            teamId={teamId}
            projects={projects}
            tasks={tasks}
            expandedGroupKeys={expandedGroupKeys}
            isTimerMutationPending={isTimerMutationPending}
            deletingEntryIds={deletingEntryIds}
            updatingEntryIds={updatingEntryIds}
            duplicatingEntryIds={duplicatingEntryIds}
            highlightedEntryId={highlightedEntryId}
            onToggleGroupExpand={onToggleGroupExpand}
            onRestart={onRestart}
            onDeleteGroup={onDeleteGroup}
            onDeleteEntry={onDeleteEntry}
            onDuplicate={onDuplicate}
            onSaveEdit={onSaveEdit}
            onToggleWaste={onToggleWaste}
            togglingWasteEntryIds={togglingWasteEntryIds}
          />
        ))}
      </div>
    </section>
  );
}
