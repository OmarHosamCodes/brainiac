import { useAgencyTimeEntryRow } from "@/features/time-tracking/hooks/use-agency-time-entry-row";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import type { TimeEntryDraft } from "@/features/time-tracking/agency-time-entry";
import type { CollapsedEntryGroup } from "@/features/time-tracking/group-time-entries";

import { AgencyTimeEntryRowView } from "@/features/time-tracking/entries/agency-time-entry-row-view";
import {
  agencyTimeEntryGroupBorderClass,
  agencyTimeEntryMultiChildClass,
} from "@/features/shared/agency-ui";
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
  /** Suppress the row bottom border (last row in a day group, or last child in a multi group). */
  omitBottomBorder?: boolean;
  /** Child row inside an expanded multi-entry group. */
  multiGroupChild?: boolean;
};

export function AgencyTimeEntryRowContainer({
  omitBottomBorder = false,
  multiGroupChild = false,
  ...props
}: AgencyTimeEntryRowContainerProps) {
  const view = useAgencyTimeEntryRow(props);

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
    <div className={cn(omitBottomBorder ? undefined : agencyTimeEntryGroupBorderClass)}>
      <AgencyTimeEntryRowView view={view} className="border-b-0" />
      {view.expandedChildGroups.map((childGroup, index) => (
        <AgencyTimeEntryRowContainer
          key={childGroup.entries[0]!.id}
          {...props}
          group={childGroup}
          expanded={false}
          multiGroupChild
          highlighted={
            props.highlighted === true && childGroup.entries[0]?.id === props.group.entries[0]?.id
          }
          omitBottomBorder={index === view.expandedChildGroups.length - 1}
        />
      ))}
    </div>
  );
}
