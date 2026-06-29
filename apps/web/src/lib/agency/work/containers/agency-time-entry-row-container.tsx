import { useAgencyTimeEntryRow } from "@/lib/agency/work/hooks/use-agency-time-entry-row";
import type { AgencyProject, AgencyProjectTask } from "@/lib/schemas/agency-work";
import type { TimeEntryDraft } from "@/lib/schemas/agency-time-entry";
import type { CollapsedEntryGroup } from "@/lib/utils/group-time-entries";

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

export function AgencyTimeEntryRowContainer(props: AgencyTimeEntryRowContainerProps) {
  const view = useAgencyTimeEntryRow(props);
  return <AgencyTimeEntryRowView view={view} deletingEntryIds={props.deletingEntryIds} />;
}
