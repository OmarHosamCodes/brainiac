import { AlertTriangle, Plus } from "lucide-react";

import { AgencyMemberChooser } from "@/components/agency/agency-member-chooser";
import { AgencyProjectChooser } from "@/components/agency/agency-project-chooser";
import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import { AgencyTaskTitleChooser } from "@/components/agency/agency-task-title-chooser";
import type { AgencyTaskListCreateViewModel } from "@/lib/agency/work/hooks/use-agency-task-list";
import type { AgencyTaskProject } from "@/lib/schemas/agency-work";
import { Button } from "@/components/ui/button";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskCreateInlineViewProps = {
  projects: AgencyTaskProject[];
  create: AgencyTaskListCreateViewModel;
};

export function AgencyTaskCreateInlineView({ projects, create }: AgencyTaskCreateInlineViewProps) {
  const {
    expanded,
    skipProjectStep,
    members,
    titleDraft,
    selectedProjectId,
    assignedToTeam,
    selectedAssigneeIds,
    createTasks,
    createTasksLoading,
    existingOpenTask,
    disabled,
    membersLoading,
    isCreatingTask,
    zoneId,
    canSubmit,
    onExpand,
    onCollapse,
    onTitleChange,
    onProjectChange,
    onAssignedToTeamChange,
    onAssigneeIdsChange,
    onSubmit,
  } = create;

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  if (!expanded) {
    return (
      <div className="shrink-0 border-y border-default">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground",
            "transition-colors hover:bg-primary/90",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
          onClick={onExpand}
          disabled={disabled}
          aria-controls={zoneId}
          aria-expanded={false}
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          New task
        </button>
      </div>
    );
  }

  return (
    <div
      id={zoneId}
      role="region"
      aria-label="New task"
      className="min-w-0 shrink-0 border-y border-default bg-default/55 px-3 py-3"
    >
      <div className="min-w-0 rounded-2xl border border-default bg-elevated p-2.5">
        <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
          {skipProjectStep && selectedProject ? (
            <span className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full bg-default px-2.5 text-[11px] font-semibold text-muted">
              <AgencyProjectHueDot projectId={selectedProject.id} />
              <span className="truncate">{selectedProject.name}</span>
            </span>
          ) : (
            <AgencyProjectChooser
              value={selectedProjectId}
              onValueChange={onProjectChange}
              projects={projects}
              disabled={disabled}
              autoFocus={!skipProjectStep}
            />
          )}

          <span className="shrink-0 text-[11px] font-semibold text-muted">New task</span>
        </div>

        <div className="mb-2 min-w-0">
          <AgencyTaskTitleChooser
            value={titleDraft}
            onValueChange={onTitleChange}
            tasks={createTasks}
            disabled={disabled || !selectedProjectId}
            loading={createTasksLoading}
            autoFocus={skipProjectStep}
          />
        </div>

        {existingOpenTask ? (
          <div
            role="status"
            className="mb-2 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-2 text-xs text-warning"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p className="min-w-0 leading-snug text-highlighted">
              <span className="font-semibold text-warning">This name is already open.</span>{" "}
              Submitting reuses that task and merges assignees; it does not create a second one.
            </p>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="min-w-0 flex-1 sm:max-w-[11rem]">
            <AgencyMemberChooser
              mode="multiple"
              assignedToTeam={assignedToTeam}
              selectedUserIds={selectedAssigneeIds}
              onAssignedToTeamChange={onAssignedToTeamChange}
              onSelectedUserIdsChange={onAssigneeIdsChange}
              members={members}
              disabled={disabled}
              loading={membersLoading}
            />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1 sm:ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-2.5 text-xs text-muted hover:text-highlighted"
              onClick={onCollapse}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              disabled={disabled || !canSubmit || isCreatingTask}
              onClick={onSubmit}
            >
              {isCreatingTask
                ? existingOpenTask
                  ? "Using…"
                  : "Adding…"
                : existingOpenTask
                  ? "Use existing"
                  : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
