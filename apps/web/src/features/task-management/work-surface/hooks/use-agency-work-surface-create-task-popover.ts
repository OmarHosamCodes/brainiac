import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useId, type FormEvent, type KeyboardEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import {
  buildDescriptionSuggestions,
  type AgencyDescriptionSuggestion,
} from "@/features/time-tracking/description-suggestions";
import { useAgencyTimeEntriesQuery } from "@/features/shared/agency-queries";
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
  const titleFieldId = useId();
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
  const [titleFocused, setTitleFocused] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
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
  const recentEntriesQuery = useAgencyTimeEntriesQuery(open ? teamId : "", 1, 50);
  const titleSuggestions = useMemo(
    () => buildDescriptionSuggestions(recentEntriesQuery.data?.items ?? [], title, { projectId }),
    [projectId, recentEntriesQuery.data?.items, title],
  );
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
  }, [currentUserId, lastUsedProjectIdForCreate, open, projects]);
  function applySuggestion(suggestion: AgencyDescriptionSuggestion) {
    setTitle(suggestion.description);
    if (suggestion.projectId) setProjectId(suggestion.projectId);
    setSuggestionsDismissed(true);
  }
  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!titleFocused || suggestionsDismissed || titleSuggestions.length === 0) return;
    if (event.key === "Escape") setSuggestionsDismissed(true);
    if (event.key === "Enter") {
      const suggestion = titleSuggestions[activeSuggestionIndex];
      if (suggestion) applySuggestion(suggestion);
    }
  }
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
  return {
    projects,
    formTitleId,
    titleFieldId,
    suggestionListboxId,
    open,
    setOpen,
    title,
    setTitle,
    projectId,
    setProjectId,
    assignedToTeam,
    setAssignedToTeam,
    assigneeUserIds,
    setAssigneeUserIds,
    titleFocused,
    setTitleFocused,
    suggestionsDismissed,
    setSuggestionsDismissed,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    members: membersQuery.data?.items ?? [],
    suggestions: titleSuggestions,
    handleTitleKeyDown,
    handleSubmit,
    applySuggestion,
    isCreatingTask,
    canSubmit: Boolean(title.trim() && projectId && !isCreatingTask),
  };
}

export type AgencyWorkSurfaceCreateTaskPopoverViewModel = ReturnType<
  typeof useAgencyWorkSurfaceCreateTaskPopover
>;
