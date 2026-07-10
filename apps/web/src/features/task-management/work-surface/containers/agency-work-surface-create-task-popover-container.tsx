import type { AgencyProject } from "@/features/task-management/agency-work";
import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import { AgencyTaskChooser } from "@/features/time-tracking/choosers/agency-task-chooser";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { AgencyWorkSurfaceCreateTaskPopoverView } from "../agency-work-surface-create-task-popover-view";
import { useAgencyWorkSurfaceCreateTaskPopover } from "../hooks/use-agency-work-surface-create-task-popover";
import { cn } from "@/lib/utils";

export function AgencyWorkSurfaceCreateTaskPopoverContainer({
  teamId,
  projects,
}: {
  teamId: string;
  projects: Array<Pick<AgencyProject, "id" | "clientName" | "name">>;
}) {
  const vm = useAgencyWorkSurfaceCreateTaskPopover(teamId, projects);

  return (
    <AgencyWorkSurfaceCreateTaskPopoverView
      {...vm}
      taskChooser={
        <AgencyTaskChooser
          mode="create"
          draftTitle={vm.title}
          onDraftTitleChange={vm.setTitle}
          projectId={vm.projectId}
          onProjectIdChange={vm.setProjectId}
          onExistingTaskSelect={vm.handleExistingTaskSelect}
          preferredProjectId={vm.preferredProjectId}
          projects={projects}
          tasks={vm.tasks}
          loading={vm.tasksLoading}
          placeholder="Search project or task"
          searchPlaceholder="Search projects or tasks"
          highlightSearch
          disabled={vm.isCreatingTask}
          open={vm.taskChooserOpen}
          onOpenChange={vm.setTaskChooserOpen}
          className={cn(
            "h-9 w-full max-w-none justify-between gap-1.5 rounded-xl border border-default bg-default px-3 text-sm font-medium shadow-none",
            "transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
          contentAlign="start"
        />
      }
      memberChooser={
        <AgencyMemberChooser
          mode="multiple"
          assignedToTeam={vm.assignedToTeam}
          selectedUserIds={vm.assigneeUserIds}
          onAssignedToTeamChange={vm.setAssignedToTeam}
          onSelectedUserIdsChange={vm.setAssigneeUserIds}
          members={vm.members}
          loading={false}
          disabled={vm.isCreatingTask}
          triggerVariant="stack"
        />
      }
    />
  );
}
