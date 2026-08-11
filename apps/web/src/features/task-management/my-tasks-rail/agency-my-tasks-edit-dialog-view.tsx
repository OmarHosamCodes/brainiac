import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import type { AgencyMyTasksEditDialogViewModel } from "@/features/task-management/hooks/use-agency-my-tasks-edit-dialog";
import { AgencyMyTasksEstimatePopover } from "@/features/task-management/my-tasks-rail/agency-my-tasks-estimate-popover";
import { cn } from "@/lib/utils";

type AgencyMyTasksEditDialogViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewModel: AgencyMyTasksEditDialogViewModel;
};

export function AgencyMyTasksEditDialogView({
  open,
  onOpenChange,
  viewModel,
}: AgencyMyTasksEditDialogViewProps) {
  const {
    formId,
    projectLabel,
    members,
    title,
    setTitle,
    assignedToTeam,
    setAssignedToTeam,
    assigneeUserIds,
    setAssigneeUserIds,
    estimateMinutes,
    setEstimateMinutes,
    canSubmit,
    pending,
    editError,
    handleSubmit,
    onCancel,
  } = viewModel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader className="space-y-1 border-b border-default px-5 py-4 text-left">
          <DialogTitle className="text-base font-bold text-highlighted">Edit task</DialogTitle>
        </DialogHeader>

        <form id={formId} onSubmit={(event) => void handleSubmit(event)}>
          <div className="flex flex-col gap-3 px-5 py-4">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task name"
              autoFocus
              disabled={pending}
              className={cn(
                "h-9 rounded-lg border-default bg-default text-sm",
                agencyInputPlaceholderClass,
              )}
            />

            <div className="flex flex-wrap items-center gap-2">
              <AgencyMemberChooser
                mode="multiple"
                assignedToTeam={assignedToTeam}
                selectedUserIds={assigneeUserIds}
                onAssignedToTeamChange={(nextAssignedToTeam) => {
                  setAssignedToTeam(nextAssignedToTeam);
                }}
                onSelectedUserIdsChange={(nextIds) => {
                  setAssigneeUserIds(nextIds);
                }}
                members={members}
                placeholder="Assignees"
                triggerVariant="stack"
                contentAlign="start"
                disabled={pending}
                className="shrink-0"
              />
              <p
                className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
                title={projectLabel}
              >
                {projectLabel}
              </p>
              <AgencyMyTasksEstimatePopover
                value={estimateMinutes}
                disabled={pending}
                onChange={setEstimateMinutes}
              />
            </div>

            {editError ? (
              <p className="text-xs text-destructive" role="alert">
                {editError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit} form={formId}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
