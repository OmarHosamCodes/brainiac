import { useQuery, useQueries } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useMemo, useRef, type RefObject } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import {
  useAgencyActiveTimerQuery,
  useAgencyProjectTasksInfiniteQuery,
  useAgencyProjectTasksQuery,
} from "@/features/shared/agency-queries";
import {
  resolveTaskTrackingState,
  type TaskTrackingState,
} from "@/features/time-tracking/task-tracking-state";
import type {
  AgencyProjectTask,
  AgencyTaskProject,
  AgencyTaskThreadMember,
  TaskStatus,
} from "@/features/task-management/agency-work";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import {
  buildTaskSuggestionQueryFilters,
  selectTaskSuggestions,
} from "@/features/task-management/agency-task-suggestion-query";
import { findOpenTaskByExactTitle } from "@/features/task-management/agency-task-title-filter";
import { collectTaskBlueprintsFromTasks } from "@/features/task-management/agency-task-blueprints";
import { isJourneyAnchorTask } from "@/features/projects/agency-task-journey";
import {
  buildAgencyTaskClientRailGroups,
  countClientRailDisplayRows,
  summarizeAgencyTaskRailGroups,
  type AgencyTaskClientDisplayGroup,
} from "@/features/task-management/agency-task-rail-grouping";
import { selectIsCreatingTask, useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import {
  resolveDefaultCreateProjectId,
  useAgencyTaskListStore,
  type AgencyTaskRailStatusFilter,
} from "@/features/task-management/stores/agency-task-list";
import { useAgencyOptimisticStore } from "@/features/shared/stores/agency-optimistic";
import { EMPTY_LIST_OVERLAY } from "@/features/shared/agency-optimistic-merge";
import { useAgencyTimeTrackingStore, useTrackerDraft } from "@/features/time-tracking/stores/agency-time-tracking";

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

export type { AgencyTaskClientDisplayGroup } from "@/features/task-management/agency-task-rail-grouping";

export type AgencyTaskListCreateViewModel = {
  members: AgencyTaskThreadMember[];
  titleDraft: string;
  descriptionDraft: string;
  createOptionsExpanded: boolean;
  quickAddFocused: boolean;
  selectedProjectId: string;
  projectNeedsChoice: boolean;
  assignedToTeam: boolean;
  selectedAssigneeIds: string[];
  createTasks: AgencyProjectTask[];
  createTasksLoading: boolean;
  /** Open/in-progress task that shares this title; create will reuse it. */
  existingOpenTask: AgencyProjectTask | null;
  disabled: boolean;
  noProjects: boolean;
  membersLoading: boolean;
  isCreatingTask: boolean;
  zoneId: string;
  quickAddInputRef: RefObject<HTMLInputElement | null>;
  canSubmit: boolean;
  onFocusQuickAdd: () => void;
  onQuickAddFocusChange: (focused: boolean) => void;
  onToggleCreateOptions: () => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onAssignedToTeamChange: (value: boolean) => void;
  onAssigneeIdsChange: (value: string[]) => void;
  onPickSuggestion: (task: AgencyProjectTask) => void;
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
      railStatusFilter: AgencyTaskRailStatusFilter;
      onRailStatusFilterChange: (filter: AgencyTaskRailStatusFilter) => void;
      activeCount: number | null;
      doneCount: number | null;
      assignedCount: number | null;
      newCount: number | null;
      totalCount: number | null;
      journeyCount: number;
      standaloneTaskCount: number;
      isLoading: boolean;
      activeTasksEmpty: boolean;
      activeTasksQueryError: boolean;
      activeTasksErrorMessage: string;
      onRetryActiveTasks: () => void;
      clientGroups: AgencyTaskClientDisplayGroup[];
      doneClientGroups: AgencyTaskClientDisplayGroup[];
      assignedClientGroups: AgencyTaskClientDisplayGroup[];
      newClientGroups: AgencyTaskClientDisplayGroup[];
      allListedTasks: AgencyProjectTask[];
      collapsedProjects: Set<string>;
      collapsedClients: Set<string>;
      onProjectExpandedChange: (projectId: string, expanded: boolean) => void;
      onClientExpandedChange: (clientId: string, expanded: boolean) => void;
      onSelect: (taskId: string, blueprintId?: string | null) => void;
      onSelectProject: (projectId: string) => void;
      onStatusChange: (task: AgencyProjectTask, status: TaskStatus) => void;
      onDueDateChange: (task: AgencyProjectTask, dueDate: string | null) => void;
      onTaskDescriptionChange: (task: AgencyProjectTask, description: string) => void;
      isRowPending: (taskId: string) => boolean;
      doneTasksLoading: boolean;
      doneTasksQueryError: boolean;
      doneTasksErrorMessage: string;
      onRetryDoneTasks: () => void;
      assignedTasksLoading: boolean;
      assignedTasksQueryError: boolean;
      assignedTasksErrorMessage: string;
      onRetryAssignedTasks: () => void;
      hasMoreAssignedTasks: boolean;
      isFetchingMoreAssignedTasks: boolean;
      onFetchMoreAssignedTasks: () => void;
      activeTasksTotal: number;
      doneTasksTotal: number;
      assignedTasksTotal: number;
      newJourneysLoading: boolean;
      newJourneysQueryError: boolean;
      newJourneysErrorMessage: string;
      onRetryNewJourneys: () => void;
      hasMoreNewJourneys: boolean;
      isFetchingMoreNewJourneys: boolean;
      onFetchMoreNewJourneys: () => void;
      doneTasks: AgencyProjectTask[];
      recentlyCompletedTaskId: string;
      recentlyCreatedTaskId: string;
      recentlyCreatedBlueprintId: string;
      onReopenDoneTask: (task: AgencyProjectTask) => void;
      hasMoreDoneTasks: boolean;
      isFetchingMoreDoneTasks: boolean;
      onFetchMoreDoneTasks: () => void;
      hasMoreActiveTasks: boolean;
      isFetchingMoreActiveTasks: boolean;
      onFetchMoreActiveTasks: () => void;
      onCollapseRail: () => void;
      getTaskTrackingState: (taskId: string, blueprintDescription?: string) => TaskTrackingState;
      onBlueprintDescriptionChange: (blueprintId: string, value: string) => void;
      onTrackerDescriptionChange: (value: string) => void;
      onAssociateTrackerForDescription: (task: AgencyProjectTask) => void;
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
  const zoneId = useId();

  const createExpanded = useAgencyTaskListStore((s) => s.quickAddFocused);
  const createOptionsExpanded = useAgencyTaskListStore((s) => s.createOptionsExpanded);
  const lastUsedProjectIdForCreate = useAgencyTaskListStore((s) => s.lastUsedProjectIdForCreate);
  const railStatusFilter = useAgencyTaskListStore((s) => s.railStatusFilter);
  const recentlyCompletedTaskId = useAgencyTaskListStore((s) => s.recentlyCompletedTaskId);
  const recentlyCreatedTaskId = useAgencyTaskListStore((s) => s.recentlyCreatedTaskId);
  const recentlyCreatedBlueprintId = useAgencyTaskListStore((s) => s.recentlyCreatedBlueprintId);
  const titleDraft = useAgencyTaskListStore((s) => s.titleDraft);
  const descriptionDraft = useAgencyTaskListStore((s) => s.descriptionDraft);
  const selectedProjectIdForCreate = useAgencyTaskListStore((s) => s.selectedProjectIdForCreate);
  const selectedAssigneeIdsForCreate = useAgencyTaskListStore(
    (s) => s.selectedAssigneeIdsForCreate,
  );
  const assignedToTeamForCreate = useAgencyTaskListStore((s) => s.assignedToTeamForCreate);
  const collapsedProjects = useAgencyTaskListStore((s) => s.collapsedProjects);
  const collapsedClients = useAgencyTaskListStore((s) => s.collapsedClients);
  const setRailStatusFilter = useAgencyTaskListStore((s) => s.setRailStatusFilter);
  const setRecentlyCompletedTaskId = useAgencyTaskListStore((s) => s.setRecentlyCompletedTaskId);
  const setRecentlyCreatedTaskId = useAgencyTaskListStore((s) => s.setRecentlyCreatedTaskId);
  const setRecentlyCreatedBlueprintId = useAgencyTaskListStore(
    (s) => s.setRecentlyCreatedBlueprintId,
  );
  const setTitleDraft = useAgencyTaskListStore((s) => s.setTitleDraft);
  const setDescriptionDraft = useAgencyTaskListStore((s) => s.setDescriptionDraft);
  const setSelectedProjectIdForCreate = useAgencyTaskListStore(
    (s) => s.setSelectedProjectIdForCreate,
  );
  const setSelectedAssigneeIdsForCreate = useAgencyTaskListStore(
    (s) => s.setSelectedAssigneeIdsForCreate,
  );
  const setAssignedToTeamForCreate = useAgencyTaskListStore((s) => s.setAssignedToTeamForCreate);
  const setProjectExpanded = useAgencyTaskListStore((s) => s.setProjectExpanded);
  const setClientExpanded = useAgencyTaskListStore((s) => s.setClientExpanded);
  const setQuickAddFocused = useAgencyTaskListStore((s) => s.setQuickAddFocused);
  const setCreateOptionsExpanded = useAgencyTaskListStore((s) => s.setCreateOptionsExpanded);
  const setLastUsedProjectIdForCreate = useAgencyTaskListStore(
    (s) => s.setLastUsedProjectIdForCreate,
  );
  const clearQuickAddAction = useAgencyTaskListStore((s) => s.clearQuickAdd);

  const quickAddInputRef = useRef<HTMLInputElement>(null);

  const setTrackerDescription = useAgencyTimeTrackingStore((s) => s.setTrackerDescription);
  const setTrackerProjectId = useAgencyTimeTrackingStore((s) => s.setTrackerProjectId);
  const setTrackerTaskId = useAgencyTimeTrackingStore((s) => s.setTrackerTaskId);
  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);
  const activeTimer = activeTimerQuery.data?.timer ?? null;
  const trackerDraft = useTrackerDraft(teamId);

  const trackingDraft = useMemo(
    () =>
      trackerDraft?.taskId
        ? { taskId: trackerDraft.taskId, description: trackerDraft.description }
        : null,
    [trackerDraft?.description, trackerDraft?.taskId],
  );

  const trackingTimer = useMemo(
    () => (activeTimer ? { taskId: activeTimer.taskId, projectId: activeTimer.projectId } : null),
    [activeTimer],
  );

  const getTaskTrackingState = useCallback(
    (taskId: string, blueprintDescription = "") =>
      resolveTaskTrackingState({
        taskId,
        activeTimer: trackingTimer,
        trackerDraft: trackingDraft,
        blueprintDescription,
      }),
    [trackingDraft, trackingTimer],
  );

  const defaultProjectId = resolveDefaultCreateProjectId({
    projects,
    lastUsedProjectId: lastUsedProjectIdForCreate,
  });
  const noProjects = projects.length === 0;
  const projectNeedsChoice = !noProjects && !selectedProjectIdForCreate;

  useEffect(() => {
    if (!selectedProjectIdForCreate && defaultProjectId) {
      setSelectedProjectIdForCreate(defaultProjectId);
    }
  }, [defaultProjectId, selectedProjectIdForCreate, setSelectedProjectIdForCreate]);

  useEffect(() => {
    if (!currentUserId) return;
    const { assignedToTeamForCreate, selectedAssigneeIdsForCreate } =
      useAgencyTaskListStore.getState();
    if (assignedToTeamForCreate || selectedAssigneeIdsForCreate.length > 0) return;
    setSelectedAssigneeIdsForCreate([currentUserId]);
  }, [currentUserId, setSelectedAssigneeIdsForCreate]);

  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.taskThreads.members.list.queryOptions({
          input: { teamId },
        }),
        enabled: Boolean(teamId),
      },
      "cold",
      { liveGated: true, teamId },
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

  const assignedTasksQuery = useAgencyProjectTasksInfiniteQuery(teamId, {
    delegatedByUserId: currentUserId,
    statuses: ACTIVE_TASK_STATUSES,
  });

  const newJourneysQuery = useAgencyProjectTasksInfiniteQuery(teamId, {
    journeyDiscoveryForUserId: currentUserId,
    statuses: ACTIVE_TASK_STATUSES,
  });

  const suggestionsActive = Boolean(titleDraft.trim());
  const titleSuggestionQuery = buildTaskSuggestionQueryFilters({
    suggestionsActive,
    selectedProjectId: selectedProjectIdForCreate,
  });
  const titleSuggestionTasksQuery = useAgencyProjectTasksQuery(
    teamId,
    titleSuggestionQuery.enabled
      ? { ...titleSuggestionQuery.filters, enabled: true }
      : { enabled: false },
  );

  const activeTasks = activeTasksQuery.items;
  const doneTasks = doneTasksQuery.items;
  const assignedTasks = assignedTasksQuery.items;
  const newJourneyTasks = newJourneysQuery.items;
  const allListedTasks = useMemo(
    () => [...activeTasks, ...doneTasks, ...assignedTasks, ...newJourneyTasks],
    [activeTasks, assignedTasks, doneTasks, newJourneyTasks],
  );
  const anchorProjectIds = useMemo(
    () => [
      ...new Set(
        [...activeTasks, ...newJourneyTasks]
          .filter((task) => isJourneyAnchorTask(task))
          .map((task) => task.projectId),
      ),
    ],
    [activeTasks, newJourneyTasks],
  );
  const journeyQueries = useQueries({
    queries: anchorProjectIds.map((projectId) =>
      withAgencySyncQueryOptions(
        {
          ...orpc.agencyOps.projects.journey.get.queryOptions({
            input: { teamId, projectId },
          }),
          enabled: Boolean(teamId && projectId),
        },
        "warm",
        { liveGated: true, teamId, noPoll: true },
      ),
    ),
  });
  const journeyProgressByProjectId = useMemo(() => {
    const map = new Map<string, { completedSteps: number; totalSteps: number }>();
    anchorProjectIds.forEach((projectId, index) => {
      const journey = journeyQueries[index]?.data;
      if (!journey) return;
      map.set(projectId, {
        completedSteps: journey.completedSteps,
        totalSteps: journey.totalSteps,
      });
    });
    return map;
  }, [anchorProjectIds, journeyQueries]);
  const blueprints = useMemo(
    () => collectTaskBlueprintsFromTasks([...activeTasks, ...doneTasks]),
    [activeTasks, doneTasks],
  );
  const blueprintUpdateTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const onBlueprintDescriptionChange = useCallback(
    (blueprintId: string, value: string) => {
      const entry = blueprints.find((blueprint) => blueprint.id === blueprintId);
      if (!entry) return;

      agencyOps.patchProjectTaskBlueprintDescription(teamId, entry.taskId, blueprintId, value);

      const existing = blueprintUpdateTimers.current.get(blueprintId);
      if (existing) clearTimeout(existing);
      blueprintUpdateTimers.current.set(
        blueprintId,
        setTimeout(() => {
          blueprintUpdateTimers.current.delete(blueprintId);
          void agencyOps.updateProjectTaskBlueprint({
            teamId,
            blueprintId,
            description: value,
          });
        }, 400),
      );
    },
    [agencyOps, blueprints, teamId],
  );

  const createTasks = useMemo(() => {
    if (!suggestionsActive) return [];
    const items = titleSuggestionTasksQuery.data?.items ?? [];
    return selectTaskSuggestions(items, titleDraft);
  }, [suggestionsActive, titleDraft, titleSuggestionTasksQuery.data?.items]);

  const existingOpenTask = useMemo(
    () => findOpenTaskByExactTitle(createTasks, titleDraft),
    [createTasks, titleDraft],
  );

  const handleSelect = useCallback(
    (taskId: string, blueprintId: string | null = null) => {
      onSelect(taskId);

      const task =
        activeTasks.find((entry) => entry.id === taskId) ??
        doneTasks.find((entry) => entry.id === taskId) ??
        assignedTasks.find((entry) => entry.id === taskId) ??
        newJourneyTasks.find((entry) => entry.id === taskId);
      const blueprint = blueprintId ? blueprints.find((entry) => entry.id === blueprintId) : null;

      if (activeTimer) {
        if (!activeTimer.taskId && task && task.projectId === activeTimer.projectId) {
          setTrackerTaskId(teamId, taskId);
          setTrackerProjectId(teamId, task.projectId);
        }
        if (blueprint?.description.trim()) {
          setTrackerDescription(teamId, blueprint.description.trim());
        }
        return;
      }

      if (!blueprint) return;

      setTrackerTaskId(teamId, taskId);
      if (task) setTrackerProjectId(teamId, task.projectId);
      setTrackerDescription(teamId, blueprint.description.trim());
    },
    [
      activeTasks,
      activeTimer,
      assignedTasks,
      blueprints,
      doneTasks,
      newJourneyTasks,
      onSelect,
      setTrackerDescription,
      setTrackerProjectId,
      setTrackerTaskId,
      teamId,
    ],
  );

  const clientGroups = useMemo(
    (): AgencyTaskClientDisplayGroup[] =>
      buildAgencyTaskClientRailGroups({
        tasks: activeTasks,
        projects,
        blueprints,
        expandOptions: {
          currentUserId,
          allTasks: allListedTasks,
          journeyProgressByProjectId,
        },
      }),
    [activeTasks, allListedTasks, blueprints, currentUserId, journeyProgressByProjectId, projects],
  );

  const doneClientGroups = useMemo(
    (): AgencyTaskClientDisplayGroup[] =>
      buildAgencyTaskClientRailGroups({
        tasks: doneTasks,
        projects,
        blueprints,
        expandOptions: {
          currentUserId,
          allTasks: allListedTasks,
          journeyProgressByProjectId,
        },
      }),
    [allListedTasks, blueprints, currentUserId, doneTasks, journeyProgressByProjectId, projects],
  );

  const assignedClientGroups = useMemo(
    (): AgencyTaskClientDisplayGroup[] =>
      buildAgencyTaskClientRailGroups({
        tasks: assignedTasks,
        projects,
        blueprints,
        expandOptions: {
          currentUserId,
          allTasks: allListedTasks,
          journeyProgressByProjectId,
        },
      }),
    [
      allListedTasks,
      assignedTasks,
      blueprints,
      currentUserId,
      journeyProgressByProjectId,
      projects,
    ],
  );

  const newClientGroups = useMemo(
    (): AgencyTaskClientDisplayGroup[] =>
      buildAgencyTaskClientRailGroups({
        tasks: newJourneyTasks,
        projects,
        blueprints,
        expandOptions: {
          currentUserId,
          allTasks: allListedTasks,
          journeyProgressByProjectId,
          journeyAnchorMode: "discovery",
        },
      }),
    [
      allListedTasks,
      blueprints,
      currentUserId,
      journeyProgressByProjectId,
      newJourneyTasks,
      projects,
    ],
  );

  const railSummaryCounts = useMemo(
    () => summarizeAgencyTaskRailGroups(clientGroups.flatMap((group) => group.projectGroups)),
    [clientGroups],
  );

  // Count visible rail rows (blueprint splits, milestones) — not raw API task totals.
  const activeCount =
    activeTasksQuery.isPending && activeTasks.length === 0
      ? null
      : countClientRailDisplayRows(clientGroups);
  const doneCount =
    doneTasksQuery.isPending && doneTasks.length === 0
      ? null
      : countClientRailDisplayRows(doneClientGroups);
  const assignedCount =
    assignedTasksQuery.isPending && assignedTasks.length === 0
      ? null
      : countClientRailDisplayRows(assignedClientGroups);
  const newCount =
    newJourneysQuery.isPending && newJourneyTasks.length === 0
      ? null
      : countClientRailDisplayRows(newClientGroups);
  const totalCount =
    activeCount === null && doneCount === null ? null : (activeCount ?? 0) + (doneCount ?? 0);

  const taskOverlay = useAgencyOptimisticStore(
    (state) => state.tasks[teamId] ?? EMPTY_LIST_OVERLAY,
  );
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

  useEffect(() => {
    if (!recentlyCreatedBlueprintId) return;
    const clearHandle = setTimeout(() => setRecentlyCreatedBlueprintId(""), 900);
    return () => clearTimeout(clearHandle);
  }, [recentlyCreatedBlueprintId, setRecentlyCreatedBlueprintId]);

  const clearQuickAdd = useCallback(() => {
    clearQuickAddAction({
      currentUserId,
      defaultProjectId: resolveDefaultCreateProjectId({
        projects,
        lastUsedProjectId: lastUsedProjectIdForCreate,
      }),
    });
    requestAnimationFrame(() => quickAddInputRef.current?.focus());
  }, [clearQuickAddAction, currentUserId, lastUsedProjectIdForCreate, projects]);

  const focusQuickAdd = useCallback(() => {
    quickAddInputRef.current?.focus();
  }, []);

  const handleProjectChange = useCallback(
    (projectId: string) => {
      setSelectedProjectIdForCreate(projectId);
      if (projectId) {
        setLastUsedProjectIdForCreate(projectId);
      }
    },
    [setLastUsedProjectIdForCreate, setSelectedProjectIdForCreate],
  );

  const handleSelectSuggestion = useCallback(
    (task: AgencyProjectTask) => {
      setTitleDraft(task.title);
      handleProjectChange(task.projectId);
      setCreateOptionsExpanded(true);
      requestAnimationFrame(() => quickAddInputRef.current?.focus());
    },
    [handleProjectChange, quickAddInputRef, setCreateOptionsExpanded, setTitleDraft],
  );

  const createTask = useCallback(async () => {
    const title = titleDraft.trim();
    const projectId = selectedProjectIdForCreate;
    if (!title || !projectId || !teamId) return;

    const existing = findOpenTaskByExactTitle(createTasks, title);

    const createdId = await agencyOps.createProjectTask({
      teamId,
      projectId,
      title,
      assignedToTeam: assignedToTeamForCreate,
      assigneeUserIds: assignedToTeamForCreate ? undefined : selectedAssigneeIdsForCreate,
      description: descriptionDraft.trim() || undefined,
      reusesExistingTitle: Boolean(existing),
      onOptimisticId: setRecentlyCreatedTaskId,
      onCreated: (task) => {
        const blueprint = task.viewerBlueprints?.at(-1);
        if (blueprint) setRecentlyCreatedBlueprintId(blueprint.id);
      },
    });

    if (createdId) {
      if (projectId) {
        setLastUsedProjectIdForCreate(projectId);
      }
      if (!activeTimer) {
        setTrackerTaskId(teamId, createdId);
        setTrackerProjectId(teamId, projectId);
        setTrackerDescription(teamId, descriptionDraft.trim());
      } else if (!activeTimer.taskId && projectId === activeTimer.projectId) {
        setTrackerTaskId(teamId, createdId);
      }
      setRecentlyCreatedTaskId(createdId);
      clearQuickAdd();
      return;
    }
    setRecentlyCreatedTaskId("");
  }, [
    activeTimer,
    agencyOps,
    clearQuickAdd,
    assignedToTeamForCreate,
    createTasks,
    descriptionDraft,
    selectedAssigneeIdsForCreate,
    selectedProjectIdForCreate,
    setLastUsedProjectIdForCreate,
    setRecentlyCreatedTaskId,
    setRecentlyCreatedBlueprintId,
    setTrackerDescription,
    setTrackerProjectId,
    setTrackerTaskId,
    teamId,
    titleDraft,
  ]);

  const updateTaskStatus = useCallback(
    async (task: AgencyProjectTask, status: TaskStatus) => {
      if (status === "done") {
        if (railStatusFilter === "active") {
          setRailStatusFilter("done");
        }
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
    [agencyOps, railStatusFilter, setRailStatusFilter, setRecentlyCompletedTaskId, teamId],
  );

  const updateTaskDueDate = useCallback(
    async (task: AgencyProjectTask, dueDate: string | null) => {
      await agencyOps.updateProjectTask({
        teamId,
        taskId: task.id,
        dueDate,
      });
    },
    [agencyOps, teamId],
  );

  const updateTaskDescription = useCallback(
    (task: AgencyProjectTask, description: string) => {
      const blueprint = task.viewerBlueprints?.[0];
      if (blueprint) {
        onBlueprintDescriptionChange(blueprint.id, description);
        return;
      }

      const trimmed = description.trim();
      if (!trimmed || isCreatingTask) return;
      // createProjectTask reuses the title and would reopen done tasks — only for active.
      if (task.status === "done" || task.viewerStatus === "done") return;

      void agencyOps.createProjectTask({
        teamId,
        projectId: task.projectId,
        title: task.title,
        description: trimmed,
        assignedToTeam: task.assignedToTeam,
        assigneeUserIds: task.assignees.map((assignee) => assignee.userId),
        reusesExistingTitle: true,
      });
    },
    [agencyOps, isCreatingTask, onBlueprintDescriptionChange, teamId],
  );

  const reopenDoneTask = useCallback(
    async (task: AgencyProjectTask) => {
      if (!teamId || isCreatingTask) return;

      setRecentlyCreatedTaskId(task.id);

      const createdId = await agencyOps.createProjectTask({
        teamId,
        projectId: task.projectId,
        title: task.title,
        assignedToTeam: task.assignedToTeam,
        assigneeUserIds: task.assignedToTeam
          ? undefined
          : [currentUserId, ...task.assignees.map((assignee) => assignee.userId)].filter(
              (userId, index, ids) => Boolean(userId) && ids.indexOf(userId) === index,
            ),
        reusesExistingTitle: true,
        onOptimisticId: setRecentlyCreatedTaskId,
      });

      if (createdId) {
        setRecentlyCreatedTaskId(createdId);
        return;
      }
      setRecentlyCreatedTaskId("");
    },
    [agencyOps, currentUserId, isCreatingTask, setRecentlyCreatedTaskId, teamId],
  );

  const associateTrackerForDescription = useCallback(
    (task: AgencyProjectTask) => {
      setTrackerTaskId(teamId, task.id);
      setTrackerProjectId(teamId, task.projectId);
    },
    [setTrackerProjectId, setTrackerTaskId, teamId],
  );

  const canSubmit = Boolean(
    titleDraft.trim() &&
    selectedProjectIdForCreate &&
    teamId &&
    !membersQuery.isPending &&
    !isCreatingTask,
  );

  useEffect(() => {
    if (!createExpanded) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setTitleDraft("");
        setDescriptionDraft("");
        setCreateOptionsExpanded(false);
        quickAddInputRef.current?.blur();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [createExpanded, setCreateOptionsExpanded, setDescriptionDraft, setTitleDraft]);

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
    railStatusFilter,
    onRailStatusFilterChange: setRailStatusFilter,
    activeCount,
    doneCount,
    assignedCount,
    newCount,
    totalCount,
    journeyCount: railSummaryCounts.journeyCount,
    standaloneTaskCount: railSummaryCounts.taskCount,
    isLoading: activeTasksQuery.isPending && activeTasks.length === 0,
    activeTasksEmpty: activeTasks.length === 0,
    activeTasksQueryError: activeTasksQuery.isError,
    activeTasksErrorMessage: activeTasksQuery.isError ? String(activeTasksQuery.error) : "",
    onRetryActiveTasks: () => void activeTasksQuery.refetch(),
    clientGroups,
    doneClientGroups,
    assignedClientGroups,
    newClientGroups,
    allListedTasks,
    collapsedProjects,
    collapsedClients,
    onProjectExpandedChange: setProjectExpanded,
    onClientExpandedChange: setClientExpanded,
    onSelect: handleSelect,
    onSelectProject,
    onStatusChange: (task, status) => void updateTaskStatus(task, status),
    onDueDateChange: (task, dueDate) => void updateTaskDueDate(task, dueDate),
    onTaskDescriptionChange: updateTaskDescription,
    isRowPending,
    doneTasksLoading: doneTasksQuery.isPending && doneTasks.length === 0,
    doneTasksQueryError: doneTasksQuery.isError,
    doneTasksErrorMessage: doneTasksQuery.isError ? String(doneTasksQuery.error) : "",
    onRetryDoneTasks: () => void doneTasksQuery.refetch(),
    assignedTasksLoading: assignedTasksQuery.isPending && assignedTasks.length === 0,
    assignedTasksQueryError: assignedTasksQuery.isError,
    assignedTasksErrorMessage: assignedTasksQuery.isError ? String(assignedTasksQuery.error) : "",
    onRetryAssignedTasks: () => void assignedTasksQuery.refetch(),
    hasMoreAssignedTasks: Boolean(assignedTasksQuery.hasNextPage),
    isFetchingMoreAssignedTasks: assignedTasksQuery.isFetchingNextPage,
    onFetchMoreAssignedTasks: () => void assignedTasksQuery.fetchNextPage(),
    newJourneysLoading: newJourneysQuery.isPending && newJourneyTasks.length === 0,
    newJourneysQueryError: newJourneysQuery.isError,
    newJourneysErrorMessage: newJourneysQuery.isError ? String(newJourneysQuery.error) : "",
    onRetryNewJourneys: () => void newJourneysQuery.refetch(),
    hasMoreNewJourneys: Boolean(newJourneysQuery.hasNextPage),
    isFetchingMoreNewJourneys: newJourneysQuery.isFetchingNextPage,
    onFetchMoreNewJourneys: () => void newJourneysQuery.fetchNextPage(),
    doneTasks,
    recentlyCompletedTaskId,
    recentlyCreatedTaskId: activeHighlightTaskId,
    recentlyCreatedBlueprintId,
    onReopenDoneTask: (task) => void reopenDoneTask(task),
    hasMoreDoneTasks: Boolean(doneTasksQuery.hasNextPage),
    isFetchingMoreDoneTasks: doneTasksQuery.isFetchingNextPage,
    onFetchMoreDoneTasks: () => void doneTasksQuery.fetchNextPage(),
    hasMoreActiveTasks: Boolean(activeTasksQuery.hasNextPage),
    isFetchingMoreActiveTasks: activeTasksQuery.isFetchingNextPage,
    onFetchMoreActiveTasks: () => void activeTasksQuery.fetchNextPage(),
    activeTasksTotal: activeTasksQuery.total,
    doneTasksTotal: doneTasksQuery.total,
    assignedTasksTotal: assignedTasksQuery.total,
    onCollapseRail: () => onCollapsedChange(true),
    getTaskTrackingState,
    onBlueprintDescriptionChange,
    onTrackerDescriptionChange: (value) => setTrackerDescription(teamId, value),
    onAssociateTrackerForDescription: associateTrackerForDescription,
    create: {
      members,
      titleDraft,
      descriptionDraft,
      createOptionsExpanded,
      quickAddFocused: createExpanded,
      selectedProjectId: selectedProjectIdForCreate,
      projectNeedsChoice,
      assignedToTeam: assignedToTeamForCreate,
      selectedAssigneeIds: selectedAssigneeIdsForCreate,
      createTasks,
      createTasksLoading: titleSuggestionTasksQuery.isPending,
      existingOpenTask,
      disabled: !teamId || membersQuery.isPending || noProjects,
      noProjects,
      membersLoading: membersQuery.isPending,
      isCreatingTask,
      zoneId,
      quickAddInputRef,
      canSubmit,
      onFocusQuickAdd: focusQuickAdd,
      onQuickAddFocusChange: setQuickAddFocused,
      onToggleCreateOptions: () => setCreateOptionsExpanded(!createOptionsExpanded),
      onTitleChange: setTitleDraft,
      onDescriptionChange: setDescriptionDraft,
      onProjectChange: handleProjectChange,
      onAssignedToTeamChange: setAssignedToTeamForCreate,
      onAssigneeIdsChange: setSelectedAssigneeIdsForCreate,
      onPickSuggestion: (task) => void handleSelectSuggestion(task),
      onSubmit: () => void createTask(),
    },
  };
}
