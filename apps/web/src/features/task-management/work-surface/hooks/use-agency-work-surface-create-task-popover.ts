import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useId, type FormEvent, type KeyboardEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import {
  buildDescriptionSuggestions,
  type AgencyDescriptionSuggestion,
} from "@/features/time-tracking/description-suggestions";
import {
  useAgencyProjectTasksForChooserQuery,
  useAgencyTimeEntriesQuery,
} from "@/features/shared/agency-queries";
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
  const suggestionListboxId = useId();
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
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
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
  const recentEntriesQuery = useAgencyTimeEntriesQuery(open ? teamId : "", 1, 50);
  const titleSuggestions = useMemo(
    () => buildDescriptionSuggestions(recentEntriesQuery.data?.items ?? [], title, { projectId }),
    [projectId, recentEntriesQuery.data?.items, title],
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projectId, projects],
  );
  const projectContextLabel = selectedProject
    ? `${selectedProject.clientName} · ${selectedProject.name}`
    : null;

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
    setSuggestionsDismissed(false);
    setActiveSuggestionIndex(0);
    setExistingTaskConflict(null);
    setTaskChooserOpen(false);
  }, [currentUserId, lastUsedProjectIdForCreate, open, projects]);

  function applySuggestion(suggestion: AgencyDescriptionSuggestion) {
    setTitle(suggestion.description);
    if (suggestion.projectId) setProjectId(suggestion.projectId);
    setExistingTaskConflict(null);
    setSuggestionsDismissed(true);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const suggestionsOpen =
      taskChooserOpen && !suggestionsDismissed && titleSuggestions.length > 0;

    if (!suggestionsOpen) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveSuggestionIndex((current) => (current + 1) % titleSuggestions.length);
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveSuggestionIndex(
          (current) => (current - 1 + titleSuggestions.length) % titleSuggestions.length,
        );
        return;
      case "Escape":
        setSuggestionsDismissed(true);
        return;
      case "Enter":
        event.preventDefault();
        applySuggestion(titleSuggestions[activeSuggestionIndex]!);
        return;
      default:
        return;
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    setExistingTaskConflict(null);
    setSuggestionsDismissed(false);
    setActiveSuggestionIndex(0);
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

  const suggestionsOpen =
    taskChooserOpen && !suggestionsDismissed && titleSuggestions.length > 0;

  return {
    projects,
    tasks: tasksQuery.items ?? [],
    tasksLoading: tasksQuery.isLoading,
    formTitleId,
    taskContextId,
    suggestionListboxId,
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
    suggestionsDismissed,
    setSuggestionsDismissed,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    existingTaskConflict,
    projectContextLabel,
    members: membersQuery.data?.items ?? [],
    suggestions: titleSuggestions,
    suggestionsOpen,
    handleSearchKeyDown,
    handleSubmit,
    applySuggestion,
    handleExistingTaskSelect,
    isCreatingTask,
    canSubmit: Boolean(title.trim() && projectId && !isCreatingTask && !existingTaskConflict),
  };
}

export type AgencyWorkSurfaceCreateTaskPopoverViewModel = ReturnType<
  typeof useAgencyWorkSurfaceCreateTaskPopover
>;
