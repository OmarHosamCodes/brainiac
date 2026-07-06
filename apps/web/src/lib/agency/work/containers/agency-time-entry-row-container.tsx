import { useMemo } from "react";

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
  onToggleWaste: (entryId: string) => Promise<void>;
  togglingWasteEntryIds: string[];
  highlighted?: boolean;
  /** Suppress the row's dashed bottom border (group wrapper supplies a solid one). */
  omitBottomBorder?: boolean;
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

export function AgencyTimeEntryRowContainer({
  omitBottomBorder = false,
  ...props
}: AgencyTimeEntryRowContainerProps) {
  const view = useAgencyTimeEntryRow(props);

  const expandedChildGroups = useMemo(
    () =>
      view.expanded
        ? props.group.entries.map((entry) => singleEntryGroup(props.group, entry))
        : [],
    [props.group, view.expanded],
  );

  if (!view.isMulti) {
    return (
      <AgencyTimeEntryRowView
        view={view}
        className={omitBottomBorder ? "border-b-0" : undefined}
      />
    );
  }

  return (
    <div className="ml-1 border-b-2 border-l-2 border-solid border-default border-l-primary/40 pl-1">
      <AgencyTimeEntryRowView
        view={view}
        className={view.expanded ? undefined : "border-b-0"}
      />
      {expandedChildGroups.map((childGroup, index) => (
        <AgencyTimeEntryRowContainer
          key={childGroup.entries[0]!.id}
          {...props}
          group={childGroup}
          expanded={false}
          highlighted={
            props.highlighted === true && childGroup.entries[0]?.id === props.group.entries[0]?.id
          }
          omitBottomBorder={index === expandedChildGroups.length - 1}
        />
      ))}
    </div>
  );
}
