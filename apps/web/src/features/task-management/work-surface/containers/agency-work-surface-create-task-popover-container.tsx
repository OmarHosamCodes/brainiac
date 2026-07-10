import type { AgencyProject } from "@/features/task-management/agency-work";
import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import { AgencyProjectChooser } from "@/features/shared/choosers/agency-project-chooser";
import { AgencyDescriptionSuggestionMenu } from "@/features/time-tracking/agency-description-suggestion-menu";
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
  const suggestionsOpen = !vm.suggestionsDismissed && vm.suggestions.length > 0 && vm.titleFocused;

  return (
    <AgencyWorkSurfaceCreateTaskPopoverView
      {...vm}
      projects={projects}
      suggestionsOpen={suggestionsOpen}
      projectChooser={
        <AgencyProjectChooser
          value={vm.projectId}
          onValueChange={vm.setProjectId}
          projects={projects}
          placeholder="Select project"
          searchPlaceholder="Search projects"
          disabled={vm.isCreatingTask}
          className={cn(
            "h-9 w-full max-w-none justify-between gap-1.5 rounded-xl border border-default bg-default px-3 text-sm font-medium shadow-none",
            "transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
          contentAlign="start"
        />
      }
      suggestionMenu={
        suggestionsOpen ? (
          <AgencyDescriptionSuggestionMenu
            listboxId={vm.suggestionListboxId}
            suggestions={vm.suggestions}
            activeIndex={vm.activeSuggestionIndex}
            ariaLabel="Recent task names"
            onActiveIndexChange={vm.setActiveSuggestionIndex}
            onSelect={vm.applySuggestion}
          />
        ) : null
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
