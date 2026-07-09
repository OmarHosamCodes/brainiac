import { useMemo } from "react";

import { useAgencyTimeEntryRow } from "@/lib/agency/work/hooks/use-agency-time-entry-row";
import type { AgencyProject, AgencyProjectTask } from "@/lib/schemas/agency-work";
import type { TimeEntryDraft } from "@/lib/schemas/agency-time-entry";
import type { CollapsedEntryGroup, TimeEntryRecord } from "@/lib/utils/group-time-entries";

import { AgencyTimeEntryRowView } from "@/components/agency/work/time-entries/agency-time-entry-row-view";
import { agencyTimeEntryMultiChildClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeEntryRowContainerProps = {
  group: CollapsedEntryGroup;
  teamId: string;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  expanded: boolean;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  duplicatingEntryIds: string[];
  onToggleExpand: () => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onDuplicate: (entryId: string) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  onToggleWaste: (entryId: string) => Promise<void>;
  togglingWasteEntryIds: string[];
  highlighted?: boolean;
  /** Suppress the row bottom border (last row in a day card, or last child in a multi group). */
  omitBottomBorder?: boolean;
  /** Child row inside an expanded multi-entry group. */
  multiGroupChild?: boolean;
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
  multiGroupChild = false,
  ...props
}: AgencyTimeEntryRowContainerProps) {
  const view = useAgencyTimeEntryRow(props);

  const expandedChildGroups = useMemo(
    () =>
      view.expanded ? props.group.entries.map((entry) => singleEntryGroup(props.group, entry)) : [],
    [props.group, view.expanded],
  );

  if (!view.isMulti) {
    return (
      <AgencyTimeEntryRowView
        view={view}
        className={cn(
          omitBottomBorder ? "border-b-0" : undefined,
          multiGroupChild && agencyTimeEntryMultiChildClass,
        )}
      />
    );
  }

  return (
    <div className={cn("bg-elevated/20", omitBottomBorder ? undefined : "border-b border-default")}>
      <AgencyTimeEntryRowView view={view} className="border-b-0" />
      {expandedChildGroups.map((childGroup, index) => (
        <AgencyTimeEntryRowContainer
          key={childGroup.entries[0]!.id}
          {...props}
          group={childGroup}
          expanded={false}
          multiGroupChild
          highlighted={
            props.highlighted === true && childGroup.entries[0]?.id === props.group.entries[0]?.id
          }
          omitBottomBorder={index === expandedChildGroups.length - 1}
        />
      ))}
    </div>
  );
}
