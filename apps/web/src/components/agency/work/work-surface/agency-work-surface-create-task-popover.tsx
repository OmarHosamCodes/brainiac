import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import { AgencyMemberChooser } from "@/components/agency/agency-member-chooser";
import { AgencyProjectChooser } from "@/components/agency/agency-project-chooser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import type { AgencyProject } from "@/lib/schemas/agency-work";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";
import { selectIsCreatingTask, useAgencyOpsStore } from "@/stores/agency-ops";
import { resolveDefaultCreateProjectId, useAgencyTaskListStore } from "@/stores/agency-task-list";

type AgencyWorkSurfaceCreateTaskPopoverProps = {
  teamId: string;
  projects: Array<Pick<AgencyProject, "id" | "clientName" | "name">>;
};

/** Shared control chrome so project / title / assign read as one form. */
const createTaskControlClass = cn(
  "h-9 w-full max-w-none justify-between gap-1.5 rounded-xl border border-default bg-default px-3 text-sm font-medium shadow-none",
  "transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

const createTaskFieldLabelClass = "text-xs font-semibold text-muted";

export function AgencyWorkSurfaceCreateTaskPopover({
  teamId,
  projects,
}: AgencyWorkSurfaceCreateTaskPopoverProps) {
  const formTitleId = useId();
  const titleFieldId = useId();
  const session = authClient.useSession();
  const currentUserId = session.data?.user?.id ?? "";
  const agencyOps = useAgencyOpsStore();
  const isCreatingTask = useAgencyOpsStore(selectIsCreatingTask);
  const lastUsedProjectIdForCreate = useAgencyTaskListStore((s) => s.lastUsedProjectIdForCreate);
  const setLastUsedProjectIdForCreate = useAgencyTaskListStore(
    (s) => s.setLastUsedProjectIdForCreate,
  );

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignedToTeam, setAssignedToTeam] = useState(false);
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);

  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.taskThreads.members.list.queryOptions({
          input: { teamId },
        }),
        enabled: Boolean(teamId) && open,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );
  const members = membersQuery.data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    const defaultProjectId = resolveDefaultCreateProjectId({
      projects,
      lastUsedProjectId: lastUsedProjectIdForCreate,
    });
    setTitle("");
    setProjectId(defaultProjectId);
    setAssignedToTeam(false);
    setAssigneeUserIds(currentUserId ? [currentUserId] : []);
  }, [currentUserId, lastUsedProjectIdForCreate, open, projects]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !projectId || !teamId || isCreatingTask) return;

    const createdId = await agencyOps.createProjectTask({
      teamId,
      projectId,
      title: trimmedTitle,
      assignedToTeam,
      assigneeUserIds: assignedToTeam ? undefined : assigneeUserIds,
    });

    if (!createdId) return;
    setLastUsedProjectIdForCreate(projectId);
    setOpen(false);
  }

  const canSubmit = Boolean(title.trim() && projectId && !isCreatingTask);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button size="sm" className={cn("h-9 shrink-0 rounded-xl px-3", agencyFocusRingClass)}>
          <Plus className="size-4" aria-hidden />
          Add New Task
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-80 p-3" aria-labelledby={formTitleId}>
        <form className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
          <p id={formTitleId} className={agencyLabelClass}>
            New task
          </p>

          <div className={agencyFormFieldClass}>
            <Label className={createTaskFieldLabelClass}>Project</Label>
            <AgencyProjectChooser
              value={projectId}
              onValueChange={setProjectId}
              projects={projects}
              placeholder="Select project"
              searchPlaceholder="Search projects"
              disabled={isCreatingTask}
              className={createTaskControlClass}
              contentAlign="start"
            />
          </div>

          <div className={agencyFormFieldClass}>
            <Label htmlFor={titleFieldId} className={createTaskFieldLabelClass}>
              Task name
            </Label>
            <Input
              id={titleFieldId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs doing?"
              autoFocus
              disabled={isCreatingTask}
              className={cn(
                "h-9 rounded-xl border-default bg-default text-sm font-medium",
                agencyInputPlaceholderClass,
                agencyFocusRingClass,
              )}
            />
          </div>

          <div className={agencyFormFieldClass}>
            <Label className={createTaskFieldLabelClass}>Assign</Label>
            <AgencyMemberChooser
              mode="multiple"
              assignedToTeam={assignedToTeam}
              selectedUserIds={assigneeUserIds}
              onAssignedToTeamChange={setAssignedToTeam}
              onSelectedUserIdsChange={setAssigneeUserIds}
              members={members}
              loading={membersQuery.isPending}
              disabled={isCreatingTask}
              placeholder="Assign"
              className={createTaskControlClass}
              contentAlign="start"
            />
          </div>

          <div className="flex justify-end border-t border-default/60 pt-3">
            <Button
              type="submit"
              size="sm"
              className="font-bold"
              disabled={!canSubmit}
              aria-busy={isCreatingTask || undefined}
            >
              {isCreatingTask ? (
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
              ) : null}
              {isCreatingTask ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
