import { useAgencyTimeEntryRow } from "@/lib/agency/work/hooks/use-agency-time-entry-row";
import type { AgencyProject, AgencyProjectTask } from "@/lib/schemas/agency-work";
import type { TimeEntryDraft } from "@/lib/schemas/agency-time-entry";
import type { CollapsedEntryGroup, TimeEntryRecord } from "@/lib/utils/group-time-entries";

import { AgencyTimeEntryRowView } from "@/components/agency/work/time-entries/agency-time-entry-row-view";

type AgencyTimeEntryRowContainerProps = {
  group: CollapsedEntryGroup;
  teamId: string;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  expanded: boolean;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  onToggleExpand: () => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  highlighted?: boolean;
};

function singleEntryGroup(group: CollapsedEntryGroup, entry: TimeEntryRecord): CollapsedEntryGroup {
  return {
    collapseKey: group.collapseKey,
    projectId: entry.projectId,
    taskId: entry.taskId,
    taskTitle: entry.taskTitle ?? group.taskTitle,
    projectName: entry.projectName,
    clientName: entry.clientName,
    description: entry.description,
    totalSeconds: entry.durationSeconds,
    entries: [entry],
  };
}

export function AgencyTimeEntryRowContainer(props: AgencyTimeEntryRowContainerProps) {
  const view = useAgencyTimeEntryRow(props);

  return (
    <>
      <AgencyTimeEntryRowView view={view} />
      {view.isMulti && view.expanded
        ? props.group.entries.map((entry) => (
            <AgencyTimeEntryRowContainer
              key={entry.id}
              {...props}
              group={singleEntryGroup(props.group, entry)}
              expanded={false}
              highlighted={props.highlighted === true && entry.id === props.group.entries[0]?.id}
            />
          ))
        : null}
    </>
  );
}
