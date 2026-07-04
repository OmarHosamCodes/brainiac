import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useMemo } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { useAgencyProjectTasksInfiniteQuery, useAgencyProjectTasksQuery } from "@/lib/queries/agency";
import type {
  AgencyProjectTask,
  AgencyTaskProject,
  AgencyTaskThreadMember,
  TaskStatus,
} from "@/lib/schemas/agency-work";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";
import { findOpenTaskByExactTitle } from "@/lib/utils/agency-task-title-filter";
import { groupTasksByClient } from "@/lib/utils/agency-task-utils";
import { selectIsCreatingTask, useAgencyOpsStore } from "@/stores/agency-ops";
import {
  useAgencyTaskListStore,
} from "@/stores/agency-task-list";
import { useAgencyOptimisticStore } from "@/stores/agency-optimistic";
import { EMPTY_LIST_OVERLAY } from "@/lib/utils/agency-optimistic-merge";

const ACTIVE_TASK_STATUSES: TaskStatus[] = ["open", "in_progress"];
const DONE_TASK_STATUSES: TaskStatus[] = ["done"];

type UseAgencyTaskListOptions = {
  teamId: string;
  projects: AgencyTaskProject[];
  selectedTaskId: string;
  collapsed: boolean;
  onSelect: (taskId: string) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onSelectProject: (projectId: string) => void;
};

export type AgencyTaskListCreateViewModel = {
  expanded: boolean;
  skipProjectStep: boolean;
  members: AgencyTaskThreadMember[];
  titleDraft: string;
  selectedProjectId: string;
  assignedToTeam: boolean;
  selectedAssigneeIds: string[];
  createTasks: AgencyProjectTask[];
  createTasksLoading: boolean;
  /** Open/in-progress task that shares this title; create will reuse it. */
  existingOpenTask: AgencyProjectTask | null;
  disabled: boolean;
  membersLoading: boolean;
  isCreatingTask: boolean;
  zoneId: string;
  canSubmit: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onTitleChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onAssignedToTeamChange: (value: boolean) => void;
  onAssigneeIdsChange: (value: string[]) => void;
  onSubmit: () => void;
};

export type AgencyTaskListViewModel =
  | { status: "unsigned" }
  | {
      status: "collapsed";
      totalCount: number | null;
      doneCount: number | null;
      activeCount: number | null;
      onExpand: () => void;
    }
  | {
      status: "ready";
      teamId: string;
      currentUserId: string;
      projects: AgencyTaskProject[];
      selectedTaskId: string;
      donePanelId: string;
      activeCount: number | null;
      doneCount: number | null;
      totalCount: number | null;
      isLoading: boolean;
      activeTasksEmpty: boolean;
      activeTasksQueryError: boolean;
      activeTasksErrorMessage: string;
      onRetryActiveTasks: () => void;
      clientGroups: ReturnType<typeof groupTasksByClient>;
      collapsedClients: Set<string>;
      onClientExpandedChange: (clientId: string, expanded: boolean) => void;
      onSelect: (taskId: string) => void;
      onSelectProject: (projectId: string) => void;
      onStatusChange: (task: AgencyProjectTask, status: TaskStatus) => void;
      isRowPending: (taskId: string) => boolean;
      doneExpanded: boolean;
      onDoneExpandedChange: (expanded: boolean) => void;
      doneTasksLoading: boolean;
      doneTasksQueryError: boolean;
      doneTasksErrorMessage: string;
      onRetryDoneTasks: () => void;
      doneTasks: AgencyProjectTask[];
      recentlyCompletedTaskId: string;
      recentlyCreatedTaskId: string;
      hasMoreActiveTasks: boolean;
      isFetchingMoreActiveTasks: boolean;
      onFetchMoreActiveTasks: () => void;
      onCollapseRail: () => void;
      create: AgencyTaskListCreateViewModel;
    };

export function useAgencyTaskList({
  teamId,
  projects,
  selectedTaskId,
  collapsed,
  onSelect,
  onCollapsedChange,
  onSelectProject,
}: UseAgencyTaskListOptions): AgencyTaskListViewModel {
  const agencyOps = useAgencyOpsStore();
  const isCreatingTask = useAgencyOpsStore(selectIsCreatingTask);
  const pendingTaskIds = useAgencyOpsStore((s) => s.pendingTaskIds);
  const isRowPending = useCallback(
    (taskId: string) => pendingTaskIds.includes(taskId),
    [pendingTaskIds],
  );

  const session = authClient.useSession();
  const currentUserId = session.data?.user?.id ?? "";
  const donePanelId = useId();
  const zoneId = useId();

  const createExpanded = useAgencyTaskListStore((s) => s.createExpanded);
  const doneExpanded = useAgencyTaskListStore((s) => s.doneExpanded);
  const recentlyCompletedTaskId = useAgencyTaskListStore((s) => s.recentlyCompletedTaskId);
  const recentlyCreatedTaskId = useAgencyTaskListStore((s) => s.recentlyCreatedTaskId);
  const titleDraft = useAgencyTaskListStore((s) => s.titleDraft);
  const selectedProjectIdForCreate = useAgencyTaskListStore((s) => s.selectedProjectIdForCreate);
  const selectedAssigneeIdsForCreate = useAgencyTaskListStore((s) => s.selectedAssigneeIdsForCreate);
  const assignedToTeamForCreate = useAgencyTaskListStore((s) => s.assignedToTeamForCreate);
  const collapsedClients = useAgencyTaskListStore((s) => s.collapsedClients);
  const setDoneExpanded = useAgencyTaskListStore((s) => s.setDoneExpanded);
  const setRecentlyCompletedTaskId = useAgencyTaskListStore((s) => s.setRecentlyCompletedTaskId);
  const setRecentlyCreatedTaskId = useAgencyTaskListStore((s) => s.setRecentlyCreatedTaskId);
  const setTitleDraft = useAgencyTaskListStore((s) => s.setTitleDraft);
  const setSelectedProjectIdForCreate = useAgencyTaskListStore((s) => s.setSelectedProjectIdForCreate);
  const setSelectedAssigneeIdsForCreate = useAgencyTaskListStore((s) => s.setSelectedAssigneeIdsForCreate);
  const setAssignedToTeamForCreate = useAgencyTaskListStore((s) => s.setAssignedToTeamForCreate);
  const setClientExpanded = useAgencyTaskListStore((s) => s.setClientExpanded);
  const expandCreateAction = useAgencyTaskListStore((s) => s.expandCreate);
  const collapseCreateAction = useAgencyTaskListStore((s) => s.collapseCreate);

  const skipProjectStep = projects.length === 1;
  const defaultProjectId = projects[0]?.id ?? "";

  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.taskThreads.members.list.queryOptions({
          input: { teamId },
        }),
        enabled: Boolean(teamId),
      },
      "warm",
    ),
  );

  const members = membersQuery.data?.items ?? [];

  const activeTasksQuery = useAgencyProjectTasksInfiniteQuery(teamId, {
    assigneeUserId: currentUserId,
    statuses: ACTIVE_TASK_STATUSES,
  });

  const doneTasksQuery = useAgencyProjectTasksInfiniteQuery(teamId, {
    assigneeUserId: currentUserId,
    statuses: DONE_TASK_STATUSES,
  });

  const titleSuggestionTasksQuery = useAgencyProjectTasksQuery(teamId, {
    projectId: createExpanded ? selectedProjectIdForCreate : undefined,
    pageSize: 50,
  });

  const activeTasks = activeTasksQuery.items;
  const doneTasks = doneTasksQuery.items;
  const createTasks = useMemo(() => {
    if (!createExpanded || !selectedProjectIdForCreate) return [];
    return (titleSuggestionTasksQuery.data?.items ?? []).filter(
      (task) => task.projectId === selectedProjectIdForCreate,
    );
  }, [createExpanded, selectedProjectIdForCreate, titleSuggestionTasksQuery.data?.items]);

  const existingOpenTask = useMemo(
    () => findOpenTaskByExactTitle(createTasks, titleDraft),
    [createTasks, titleDraft],
  );

  // Prefer live list length while a background refetch is pending so the rail
  // does not flash empty (infinite queries used to drop pages on invalidate).
  const activeCount =
    activeTasksQuery.isPending && activeTasks.length === 0 ? null : activeTasksQuery.total;
  const doneCount =
    doneTasksQuery.isPending && doneTasks.length === 0 ? null : doneTasksQuery.total;
  const totalCount =
    activeCount === null && doneCount === null
      ? null
      : (activeCount ?? 0) + (doneCount ?? 0);

  const clientGroups = useMemo(
    () => groupTasksByClient(activeTasks, projects),
    [activeTasks, projects],
  );

  const taskOverlay = useAgencyOptimisticStore((state) => state.tasks[teamId] ?? EMPTY_LIST_OVERLAY);
  // Keep create highlight across optimistic → real id reconcile.
  const activeHighlightTaskId =
    (recentlyCreatedTaskId && taskOverlay.idMap[recentlyCreatedTaskId]) || recentlyCreatedTaskId;

  useEffect(() => {
    if (!recentlyCompletedTaskId) return;
    const clearHandle = setTimeout(() => setRecentlyCompletedTaskId(""), 900);
    return () => clearTimeout(clearHandle);
  }, [recentlyCompletedTaskId, setRecentlyCompletedTaskId]);

  useEffect(() => {
    if (!recentlyCreatedTaskId) return;
    const clearHandle = setTimeout(() => setRecentlyCreatedTaskId(""), 900);
    return () => clearTimeout(clearHandle);
  }, [recentlyCreatedTaskId, setRecentlyCreatedTaskId]);

  const collapseCreate = useCallback(() => {
    collapseCreateAction({
      skipProjectStep,
      defaultProjectId,
      currentUserId,
    });
  }, [collapseCreateAction, currentUserId, defaultProjectId, skipProjectStep]);

  const expandCreate = useCallback(() => {
    expandCreateAction({
      skipProjectStep,
      defaultProjectId,
      currentUserId,
    });
  }, [currentUserId, defaultProjectId, expandCreateAction, skipProjectStep]);

  const createTask = useCallback(async () => {
    const title = titleDraft.trim();
    const projectId = selectedProjectIdForCreate;
    if (!title || !projectId || !teamId) return;

    const existing = findOpenTaskByExactTitle(createTasks, title);
    // Reuse: animate the existing Active row immediately (same id, no temp flash).
    if (existing) {
      setRecentlyCreatedTaskId(existing.id);
    }

    const createdId = await agencyOps.createProjectTask({
      teamId,
      projectId,
      title,
      assignedToTeam: assignedToTeamForCreate,
      assigneeUserIds: assignedToTeamForCreate ? undefined : selectedAssigneeIdsForCreate,
      reusesExistingTitle: Boolean(existing),
      onOptimisticId: setRecentlyCreatedTaskId,
    });

    if (createdId) {
      setRecentlyCreatedTaskId(createdId);
      collapseCreate();
      return;
    }
    setRecentlyCreatedTaskId("");
  }, [
    agencyOps,
    collapseCreate,
    assignedToTeamForCreate,
    createTasks,
    selectedAssigneeIdsForCreate,
    selectedProjectIdForCreate,
    setRecentlyCreatedTaskId,
    teamId,
    titleDraft,
  ]);

  const updateTaskStatus = useCallback(
    async (task: AgencyProjectTask, status: TaskStatus) => {
      if (status === "done") {
        setDoneExpanded(true);
        setRecentlyCompletedTaskId(task.id);
        await agencyOps.completeProjectTaskForMember({
          teamId,
          taskId: task.id,
        });
        return;
      }
      await agencyOps.updateProjectTask({
        teamId,
        taskId: task.id,
        status,
      });
    },
    [agencyOps, setDoneExpanded, setRecentlyCompletedTaskId, teamId],
  );

  const canSubmit = Boolean(
    titleDraft.trim() && selectedProjectIdForCreate && teamId && !membersQuery.isPending && !isCreatingTask,
  );

  useEffect(() => {
    if (!createExpanded) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        collapseCreate();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [collapseCreate, createExpanded]);

  if (!currentUserId) {
    return { status: "unsigned" };
  }

  if (collapsed) {
    return {
      status: "collapsed",
      totalCount,
      doneCount,
      activeCount,
      onExpand: () => onCollapsedChange(false),
    };
  }

  return {
    status: "ready",
    teamId,
    currentUserId,
    projects,
    selectedTaskId,
    donePanelId,
    activeCount,
    doneCount,
    totalCount,
    isLoading: activeTasksQuery.isPending && activeTasks.length === 0,
    activeTasksEmpty: activeTasks.length === 0,
    activeTasksQueryError: activeTasksQuery.isError,
    activeTasksErrorMessage: activeTasksQuery.isError ? String(activeTasksQuery.error) : "",
    onRetryActiveTasks: () => void activeTasksQuery.refetch(),
    clientGroups,
    collapsedClients,
    onClientExpandedChange: setClientExpanded,
    onSelect,
    onSelectProject,
    onStatusChange: (task, status) => void updateTaskStatus(task, status),
    isRowPending,
    doneExpanded,
    onDoneExpandedChange: setDoneExpanded,
    doneTasksLoading: doneTasksQuery.isPending && doneTasks.length === 0,
    doneTasksQueryError: doneTasksQuery.isError,
    doneTasksErrorMessage: doneTasksQuery.isError ? String(doneTasksQuery.error) : "",
    onRetryDoneTasks: () => void doneTasksQuery.refetch(),
    doneTasks,
    recentlyCompletedTaskId,
    recentlyCreatedTaskId: activeHighlightTaskId,
    hasMoreActiveTasks: Boolean(activeTasksQuery.hasNextPage),
    isFetchingMoreActiveTasks: activeTasksQuery.isFetchingNextPage,
    onFetchMoreActiveTasks: () => void activeTasksQuery.fetchNextPage(),
    onCollapseRail: () => onCollapsedChange(true),
    create: {
      expanded: createExpanded,
      skipProjectStep,
      members,
      titleDraft,
      selectedProjectId: selectedProjectIdForCreate,
      assignedToTeam: assignedToTeamForCreate,
      selectedAssigneeIds: selectedAssigneeIdsForCreate,
      createTasks,
      createTasksLoading: titleSuggestionTasksQuery.isPending,
      existingOpenTask,
      disabled: !teamId || membersQuery.isPending,
      membersLoading: membersQuery.isPending,
      isCreatingTask,
      zoneId,
      canSubmit,
      onExpand: expandCreate,
      onCollapse: collapseCreate,
      onTitleChange: setTitleDraft,
      onProjectChange: setSelectedProjectIdForCreate,
      onAssignedToTeamChange: setAssignedToTeamForCreate,
      onAssigneeIdsChange: setSelectedAssigneeIdsForCreate,
      onSubmit: () => void createTask(),
    },
  };
}
