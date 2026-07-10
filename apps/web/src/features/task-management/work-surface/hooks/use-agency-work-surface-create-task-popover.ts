import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useId, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { useAgencyProjectTasksForChooserQuery } from "@/features/shared/agency-queries";
import {
  resolveDefaultCreateProjectId,
  useAgencyTaskListStore,
} from "@/features/task-management/stores/agency-task-list";
import { selectIsCreatingTask, useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import type { AgencyProject } from "@/features/task-management/agency-work";

export function useAgencyWorkSurfaceCreateTaskPopover(
  teamId: string,
  projects: Array<Pick<AgencyProject, "id" | "clientName" | "name">>,
) {
  const formTitleId = useId();
  const taskContextId = useId();
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
  const [taskChooserOpen, setTaskChooserOpen] = useState(false);
  const [existingTaskConflict, setExistingTaskConflict] = useState<string | null>(null);
  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.taskThreads.members.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && open,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );
  const tasksQuery = useAgencyProjectTasksForChooserQuery(open ? teamId : "");
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projectId, projects],
  );
  const projectContextLabel = selectedProject
    ? `${selectedProject.clientName} · ${selectedProject.name}`
    : null;
  const preferredProjectId = useMemo(
    () =>
      resolveDefaultCreateProjectId({
        projects,
        lastUsedProjectId: lastUsedProjectIdForCreate,
      }),
    [lastUsedProjectIdForCreate, projects],
  );

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setProjectId("");
    setAssignedToTeam(false);
    setAssigneeUserIds(currentUserId ? [currentUserId] : []);
    setExistingTaskConflict(null);
    setTaskChooserOpen(false);
  }, [currentUserId, open, projects]);

  function handleTitleChange(value: string) {
    setTitle(value);
    setExistingTaskConflict(null);
  }

  function handleProjectChange(value: string) {
    setProjectId(value);
    setExistingTaskConflict(null);
  }

  function handleExistingTaskSelect(taskId: string) {
    setExistingTaskConflict(taskId);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !projectId || !teamId || isCreatingTask || existingTaskConflict) return;
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

  return {
    projects,
    tasks: tasksQuery.items ?? [],
    tasksLoading: tasksQuery.isLoading,
    formTitleId,
    taskContextId,
    open,
    setOpen,
    title,
    setTitle: handleTitleChange,
    projectId,
    setProjectId: handleProjectChange,
    assignedToTeam,
    setAssignedToTeam,
    assigneeUserIds,
    setAssigneeUserIds,
    taskChooserOpen,
    setTaskChooserOpen,
    existingTaskConflict,
    projectContextLabel,
    members: membersQuery.data?.items ?? [],
    handleSubmit,
    handleExistingTaskSelect,
    isCreatingTask,
    preferredProjectId,
    canSubmit: Boolean(title.trim() && projectId && !isCreatingTask && !existingTaskConflict),
  };
}

export type AgencyWorkSurfaceCreateTaskPopoverViewModel = ReturnType<
  typeof useAgencyWorkSurfaceCreateTaskPopover
>;
