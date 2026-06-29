import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { useAgencyProjectTasksQuery } from "@/lib/queries/agency";
import type {
  AgencyProjectTask,
  AgencyTaskProject,
  AgencyTaskThreadMember,
  TaskStatus,
} from "@/lib/schemas/agency-work";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";
import { groupTasksByClient } from "@/lib/utils/agency-task-utils";
import { projectHueFor } from "@/lib/utils/project-palette";
import { selectIsCreatingTask, useAgencyOpsStore } from "@/stores/agency-ops";
import {
  UNASSIGNED_ASSIGNEE_VALUE,
  useAgencyTaskListStore,
} from "@/stores/agency-task-list";
import { useTheme } from "@/stores/theme";

const ACTIVE_TASK_STATUSES: TaskStatus[] = ["open", "in_progress"];
const DONE_TASK_STATUSES: TaskStatus[] = ["done"];
const TASK_TITLE_SUGGESTION_LIMIT = 5;

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
  selectedAssigneeId: string;
  disabled: boolean;
  membersLoading: boolean;
  isCreatingTask: boolean;
  zoneId: string;
  titleSuggestionsListId: string;
  titleSuggestions: AgencyProjectTask[];
  showTitleSuggestions: boolean;
  activeTitleSuggestionIndex: number;
  activeTitleSuggestionOptionId: string | undefined;
  canSubmit: boolean;
  getProjectHueColor: (projectId: string) => string;
  onExpand: () => void;
  onCollapse: () => void;
  onTitleChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onSubmit: () => void;
  onTitleInputFocus: () => void;
  onTitleInputBlur: () => void;
  onActiveTitleSuggestionIndexChange: (index: number) => void;
  onSelectTitleSuggestion: (task: AgencyProjectTask) => void;
  onDismissTitleSuggestions: () => void;
  onTitleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
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
      onCollapseRail: () => void;
      create: AgencyTaskListCreateViewModel;
    };

function normalizeTaskTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function scoreTaskTitleSuggestion(normalizedTitle: string, normalizedQuery: string) {
  if (!normalizedQuery) return 0;
  if (normalizedTitle === normalizedQuery) return 100;
  if (normalizedTitle.startsWith(normalizedQuery)) return 90;
  if (normalizedTitle.split(" ").some((word) => word.startsWith(normalizedQuery))) return 75;
  if (normalizedTitle.includes(normalizedQuery)) return 55;
  return 0;
}

function getTaskTitleSuggestions(
  tasks: AgencyProjectTask[],
  titleDraft: string,
  selectedProjectId: string,
) {
  const normalizedQuery = normalizeTaskTitle(titleDraft);
  if (!normalizedQuery || !selectedProjectId) return [];

  const seenTitles = new Set<string>();

  return tasks
    .filter((task) => task.projectId === selectedProjectId)
    .map((task) => {
      const normalizedTitle = normalizeTaskTitle(task.title);
      return {
        task,
        normalizedTitle,
        score: scoreTaskTitleSuggestion(normalizedTitle, normalizedQuery),
        createdAtMs: new Date(task.createdAt).getTime(),
      };
    })
    .filter(({ normalizedTitle, score }) => {
      if (!normalizedTitle || score <= 0 || seenTitles.has(normalizedTitle)) return false;
      seenTitles.add(normalizedTitle);
      return true;
    })
    .sort((left, right) => {
      const rightCreatedAt = Number.isNaN(right.createdAtMs) ? 0 : right.createdAtMs;
      const leftCreatedAt = Number.isNaN(left.createdAtMs) ? 0 : left.createdAtMs;
      return (
        right.score - left.score ||
        rightCreatedAt - leftCreatedAt ||
        left.task.title.localeCompare(right.task.title)
      );
    })
    .slice(0, TASK_TITLE_SUGGESTION_LIMIT)
    .map(({ task }) => task);
}

export function useAgencyTaskList({
  teamId,
  projects,
  selectedTaskId,
  collapsed,
  onSelect,
  onCollapsedChange,
  onSelectProject,
}: UseAgencyTaskListOptions): AgencyTaskListViewModel {
  const { isDark } = useTheme();
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
  const titleSuggestionsListId = useId();

  const createExpanded = useAgencyTaskListStore((s) => s.createExpanded);
  const doneExpanded = useAgencyTaskListStore((s) => s.doneExpanded);
  const recentlyCompletedTaskId = useAgencyTaskListStore((s) => s.recentlyCompletedTaskId);
  const titleDraft = useAgencyTaskListStore((s) => s.titleDraft);
  const selectedProjectIdForCreate = useAgencyTaskListStore((s) => s.selectedProjectIdForCreate);
  const selectedAssigneeIdForCreate = useAgencyTaskListStore((s) => s.selectedAssigneeIdForCreate);
  const collapsedClients = useAgencyTaskListStore((s) => s.collapsedClients);
  const setDoneExpanded = useAgencyTaskListStore((s) => s.setDoneExpanded);
  const setRecentlyCompletedTaskId = useAgencyTaskListStore((s) => s.setRecentlyCompletedTaskId);
  const setTitleDraft = useAgencyTaskListStore((s) => s.setTitleDraft);
  const setSelectedProjectIdForCreate = useAgencyTaskListStore((s) => s.setSelectedProjectIdForCreate);
  const setSelectedAssigneeIdForCreate = useAgencyTaskListStore((s) => s.setSelectedAssigneeIdForCreate);
  const setClientExpanded = useAgencyTaskListStore((s) => s.setClientExpanded);
  const expandCreateAction = useAgencyTaskListStore((s) => s.expandCreate);
  const collapseCreateAction = useAgencyTaskListStore((s) => s.collapseCreate);

  const skipProjectStep = projects.length === 1;
  const defaultProjectId = projects[0]?.id ?? "";

  const [titleInputFocused, setTitleInputFocused] = useState(false);
  const [activeTitleSuggestionIndex, setActiveTitleSuggestionIndex] = useState(-1);
  const [dismissedTitleSuggestionDraft, setDismissedTitleSuggestionDraft] = useState("");

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

  const activeTasksQuery = useAgencyProjectTasksQuery(teamId, {
    assigneeUserId: currentUserId,
    statuses: ACTIVE_TASK_STATUSES,
  });

  const doneTasksQuery = useAgencyProjectTasksQuery(teamId, {
    assigneeUserId: currentUserId,
    statuses: DONE_TASK_STATUSES,
  });

  const titleSuggestionTasksQuery = useAgencyProjectTasksQuery(teamId, {
    projectId: createExpanded ? selectedProjectIdForCreate : undefined,
  });

  const activeTasks = activeTasksQuery.data?.items ?? [];
  const doneTasks = doneTasksQuery.data?.items ?? [];
  const titleSuggestionTasks = useMemo(() => {
    if (!createExpanded || !selectedProjectIdForCreate) return [];
    return (titleSuggestionTasksQuery.data?.items ?? []).filter(
      (task) => task.projectId === selectedProjectIdForCreate,
    );
  }, [createExpanded, selectedProjectIdForCreate, titleSuggestionTasksQuery.data?.items]);

  const activeCount = activeTasksQuery.isPending ? null : activeTasks.length;
  const doneCount = doneTasksQuery.isPending ? null : doneTasks.length;
  const totalCount =
    activeCount === null || doneCount === null ? null : activeCount + doneCount;

  const clientGroups = useMemo(
    () => groupTasksByClient(activeTasks, projects),
    [activeTasks, projects],
  );

  const getProjectHueColor = useCallback(
    (projectId: string) => {
      const hue = projectHueFor(projectId);
      return isDark ? hue.dark : hue.light;
    },
    [isDark],
  );

  useEffect(() => {
    if (!recentlyCompletedTaskId) return;
    const clearHandle = setTimeout(() => setRecentlyCompletedTaskId(""), 900);
    return () => clearTimeout(clearHandle);
  }, [recentlyCompletedTaskId, setRecentlyCompletedTaskId]);

  const collapseCreate = useCallback(() => {
    collapseCreateAction({
      skipProjectStep,
      defaultProjectId,
      currentUserId,
    });
    setTitleInputFocused(false);
    setActiveTitleSuggestionIndex(-1);
    setDismissedTitleSuggestionDraft("");
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

    const assigneeUserId =
      selectedAssigneeIdForCreate === UNASSIGNED_ASSIGNEE_VALUE
        ? undefined
        : selectedAssigneeIdForCreate;

    const created = await agencyOps.createProjectTask({
      teamId,
      projectId,
      title,
      assigneeUserId,
    });

    if (created) {
      collapseCreate();
    }
  }, [
    agencyOps,
    collapseCreate,
    selectedAssigneeIdForCreate,
    selectedProjectIdForCreate,
    teamId,
    titleDraft,
  ]);

  const updateTaskStatus = useCallback(
    async (task: AgencyProjectTask, status: TaskStatus) => {
      if (status === "done") {
        setDoneExpanded(true);
        setRecentlyCompletedTaskId(task.id);
      }
      await agencyOps.updateProjectTask({
        teamId,
        taskId: task.id,
        status,
      });
    },
    [agencyOps, setDoneExpanded, setRecentlyCompletedTaskId, teamId],
  );

  const titleSuggestions = useMemo(
    () => getTaskTitleSuggestions(titleSuggestionTasks, titleDraft, selectedProjectIdForCreate),
    [selectedProjectIdForCreate, titleDraft, titleSuggestionTasks],
  );

  const titleSuggestionDismissed =
    normalizeTaskTitle(dismissedTitleSuggestionDraft) === normalizeTaskTitle(titleDraft);
  const showTitleSuggestions =
    titleInputFocused && titleSuggestions.length > 0 && !titleSuggestionDismissed;
  const activeTitleSuggestion =
    activeTitleSuggestionIndex >= 0 ? titleSuggestions[activeTitleSuggestionIndex] : undefined;
  const activeTitleSuggestionOptionId = activeTitleSuggestion
    ? `${titleSuggestionsListId}-option-${activeTitleSuggestionIndex}`
    : undefined;
  const canSubmit = Boolean(
    titleDraft.trim() && selectedProjectIdForCreate && teamId && !membersQuery.isPending && !isCreatingTask,
  );

  useEffect(() => {
    if (!createExpanded) {
      setTitleInputFocused(false);
      setActiveTitleSuggestionIndex(-1);
      setDismissedTitleSuggestionDraft("");
    }
  }, [createExpanded]);

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

  useEffect(() => {
    setActiveTitleSuggestionIndex(-1);
  }, [selectedProjectIdForCreate, titleDraft, titleSuggestions.length]);

  const onTitleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (showTitleSuggestions && event.key === "ArrowDown") {
        event.preventDefault();
        setActiveTitleSuggestionIndex((current) =>
          current < titleSuggestions.length - 1 ? current + 1 : 0,
        );
        return;
      }
      if (showTitleSuggestions && event.key === "ArrowUp") {
        event.preventDefault();
        setActiveTitleSuggestionIndex((current) =>
          current > 0 ? current - 1 : titleSuggestions.length - 1,
        );
        return;
      }
      if (showTitleSuggestions && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setDismissedTitleSuggestionDraft(titleDraft);
        setActiveTitleSuggestionIndex(-1);
        return;
      }
      if (event.key === "Enter" && canSubmit) {
        if (showTitleSuggestions && activeTitleSuggestion) {
          event.preventDefault();
          setDismissedTitleSuggestionDraft(activeTitleSuggestion.title);
          setActiveTitleSuggestionIndex(-1);
          setTitleDraft(activeTitleSuggestion.title);
          return;
        }
        event.preventDefault();
        void createTask();
      }
    },
    [
      activeTitleSuggestion,
      canSubmit,
      createTask,
      setTitleDraft,
      showTitleSuggestions,
      titleDraft,
      titleSuggestions.length,
    ],
  );

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
    projects,
    selectedTaskId,
    donePanelId,
    activeCount,
    doneCount,
    totalCount,
    isLoading: activeTasksQuery.isPending,
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
    doneTasksLoading: doneTasksQuery.isPending,
    doneTasksQueryError: doneTasksQuery.isError,
    doneTasksErrorMessage: doneTasksQuery.isError ? String(doneTasksQuery.error) : "",
    onRetryDoneTasks: () => void doneTasksQuery.refetch(),
    doneTasks,
    recentlyCompletedTaskId,
    onCollapseRail: () => onCollapsedChange(true),
    create: {
      expanded: createExpanded,
      skipProjectStep,
      members,
      titleDraft,
      selectedProjectId: selectedProjectIdForCreate,
      selectedAssigneeId: selectedAssigneeIdForCreate,
      disabled: !teamId || membersQuery.isPending,
      membersLoading: membersQuery.isPending,
      isCreatingTask,
      zoneId,
      titleSuggestionsListId,
      titleSuggestions,
      showTitleSuggestions,
      activeTitleSuggestionIndex,
      activeTitleSuggestionOptionId,
      canSubmit,
      getProjectHueColor,
      onExpand: expandCreate,
      onCollapse: collapseCreate,
      onTitleChange: setTitleDraft,
      onProjectChange: (value) => {
        setDismissedTitleSuggestionDraft("");
        setSelectedProjectIdForCreate(value);
      },
      onAssigneeChange: setSelectedAssigneeIdForCreate,
      onSubmit: () => void createTask(),
      onTitleInputFocus: () => setTitleInputFocused(true),
      onTitleInputBlur: () => {
        setTitleInputFocused(false);
        setActiveTitleSuggestionIndex(-1);
      },
      onActiveTitleSuggestionIndexChange: setActiveTitleSuggestionIndex,
      onSelectTitleSuggestion: (task) => {
        setDismissedTitleSuggestionDraft(task.title);
        setActiveTitleSuggestionIndex(-1);
        setTitleDraft(task.title);
      },
      onDismissTitleSuggestions: () => setDismissedTitleSuggestionDraft(titleDraft),
      onTitleKeyDown,
    },
  };
}
