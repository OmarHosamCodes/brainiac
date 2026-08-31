import {
  useAgencyReportEntryDetailsDialog,
  type UseAgencyReportEntryDetailsDialogOptions,
} from "@/features/reports/hooks/use-agency-report-entry-details-dialog";
import { AgencyTimeEntryRowContainer } from "@/features/time-tracking/containers/agency-time-entry-row-container";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";
import { AgencyReportEntryDetailsDialogView } from "@/features/reports/agency-report-entry-details-dialog-view";

export type AgencyReportEntryDetailsDialogProps = UseAgencyReportEntryDetailsDialogOptions;

export function AgencyReportEntryDetailsDialogContainer(
  props: AgencyReportEntryDetailsDialogProps,
) {
  const { open, onOpenChange } = props;
  const viewModel = useAgencyReportEntryDetailsDialog(props);

  const renderGroupRow: AgencyTimeEntryGroupRowRenderer = ({
    group,
    groupExpandKey,
    omitBottomBorder,
  }) => (
    <AgencyTimeEntryRowContainer
      group={group}
      teamId={viewModel.teamId}
      projects={viewModel.projects}
      tasks={viewModel.tasks}
      tags={viewModel.tags}
      tagCreatePending={viewModel.tagCreatePending}
      onCreateTag={viewModel.onCreateTag}
      expanded={viewModel.expandedGroupKeys.has(groupExpandKey)}
      isTimerMutationPending={viewModel.isTimerMutationPending}
      deletingEntryIds={viewModel.deletingEntryIds}
      updatingEntryIds={viewModel.updatingEntryIds}
      duplicatingEntryIds={viewModel.duplicatingEntryIds}
      omitBottomBorder={omitBottomBorder}
      onToggleExpand={() => viewModel.onToggleGroupExpand(groupExpandKey)}
      onRestart={viewModel.onRestart}
      onDeleteGroup={viewModel.onDeleteGroup}
      onDeleteEntry={viewModel.onDeleteEntry}
      onDuplicate={viewModel.onDuplicate}
      onToggleWaste={viewModel.onToggleWaste}
      onSaveEdit={viewModel.onSaveEdit}
      onSaveLinks={viewModel.onSaveLinks}
      onBulkPatch={viewModel.onBulkPatch}
    />
  );

  return (
    <AgencyReportEntryDetailsDialogView
      open={open}
      onOpenChange={onOpenChange}
      viewModel={viewModel}
      renderGroupRow={renderGroupRow}
    />
  );
}
