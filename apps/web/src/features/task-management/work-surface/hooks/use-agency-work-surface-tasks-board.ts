import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import type {
  AgencyProjectTask,
  AgencyTaskProject,
  AgencyTaskThreadMember,
  TaskStatus,
} from "@/features/task-management/agency-work";
import { isTaskOverdue } from "@/features/task-management/agency-task-utils";
import {
  AGENCY_WORK_BOARD_COLUMNS,
  AGENCY_WORK_BOARD_DND_MIME,
  AGENCY_WORK_BOARD_SWIMLANES,
  type AgencyWorkBoardCard,
  type AgencyWorkBoardColumnId,
  type AgencyWorkBoardSwimlaneId,
  agencyWorkBoardCellKey,
  boardColumnLabel,
  boardSwimlaneLabel,
  buildAgencyWorkBoardCards,
  canCrossAgencyWorkBoardSwimlane,
  columnIdToTaskStatus,
  decodeAgencyWorkBoardDragPayload,
  encodeAgencyWorkBoardDragPayload,
  flattenAssignedClientGroupTasks,
  groupAgencyWorkBoardCards,
} from "@/features/task-management/work-surface/agency-work-surface-tasks-board";
import { useAgencyTaskList } from "@/features/task-management/hooks/use-agency-task-list";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { useTheme } from "@/stores/theme";
import { projectHueFor } from "@/features/shared/project-palette";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

const DONE_SETTLE_MS = 200;

export type AgencyWorkBoardDelegatePrompt = {
  taskId: string;
  taskTitle: string;
  targetColumn: AgencyWorkBoardColumnId;
};

export type AgencyWorkSurfaceTasksBoardCardViewModel = {
  taskId: string;
  title: string;
  clientName: string;
  projectName: string;
  projectHue: string;
  dueLabel: string;
  overdue: boolean;
  description: string;
  assigneeLabel: string;
  assigneeUserIds: string[];
  assignedToTeam: boolean;
  swimlane: AgencyWorkBoardSwimlaneId;
  column: AgencyWorkBoardColumnId;
  selected: boolean;
  pending: boolean;
  settled: boolean;
  canEditDescription: boolean;
  canDelegate: boolean;
};

export type AgencyWorkSurfaceTasksBoardViewModel =
  | { status: "unsigned" }
  | { status: "loading" }
  | {
      status: "error";
      message: string;
      onRetry: () => void;
    }
  | {
      status: "ready";
      columns: Array<{
        id: AgencyWorkBoardColumnId;
        label: string;
        count: number;
        swimlanes: Array<{
          id: AgencyWorkBoardSwimlaneId;
          label: string;
          cards: AgencyWorkSurfaceTasksBoardCardViewModel[];
          emptyLabel: string;
        }>;
      }>;
      totalCards: number;
      members: AgencyTaskThreadMember[];
      membersLoading: boolean;
      currentUserId: string;
      draggingTaskId: string | null;
      dragOverCellKey: string | null;
      statusAnnouncement: string;
      editingDescriptionTaskId: string | null;
      descriptionDraft: string;
      delegatePrompt: AgencyWorkBoardDelegatePrompt | null;
      delegateDraftAssignedToTeam: boolean;
      delegateDraftUserIds: string[];
      onSelectTask: (taskId: string) => void;
      onCardDragStart: (
        taskId: string,
        swimlane: AgencyWorkBoardSwimlaneId,
        event: DragEvent<HTMLElement>,
      ) => void;
      onCardDragEnd: () => void;
      onCellDragOver: (
        column: AgencyWorkBoardColumnId,
        swimlane: AgencyWorkBoardSwimlaneId,
        event: DragEvent<HTMLElement>,
      ) => void;
      onCellDragLeave: (
        column: AgencyWorkBoardColumnId,
        swimlane: AgencyWorkBoardSwimlaneId,
        event: DragEvent<HTMLElement>,
      ) => void;
      onCellDrop: (
        column: AgencyWorkBoardColumnId,
        swimlane: AgencyWorkBoardSwimlaneId,
        event: DragEvent<HTMLElement>,
      ) => void;
      onMoveTaskStatus: (taskId: string, column: AgencyWorkBoardColumnId) => void;
      onBeginDescriptionEdit: (taskId: string) => void;
      onDescriptionDraftChange: (value: string) => void;
      onCommitDescription: () => void;
      onCancelDescriptionEdit: () => void;
      onAssigneesChange: (
        taskId: string,
        assignedToTeam: boolean,
        assigneeUserIds: string[],
      ) => void;
      onRequestDelegate: (taskId: string) => void;
      onDelegateDraftAssignedToTeamChange: (assignedToTeam: boolean) => void;
      onDelegateDraftUserIdsChange: (userIds: string[]) => void;
      onConfirmDelegatePrompt: () => void;
      onDismissDelegatePrompt: () => void;
    };

type UseAgencyWorkSurfaceTasksBoardOptions = {
  teamId: string;
  projects: AgencyTaskProject[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  onSelectProject: (projectId: string) => void;
};

function formatDueLabel(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function assigneeLabelForCard(card: AgencyWorkBoardCard): string {
  if (card.swimlane !== "delegated") return "";
  if (card.task.assignedToTeam) return "Team";
  const names = card.task.assignees.map((entry) => entry.userName).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  return `${names[0]} +${names.length - 1}`;
}

function taskDescription(task: AgencyProjectTask): string {
  return task.viewerBlueprints?.[0]?.description.trim() ?? "";
}

export function useAgencyWorkSurfaceTasksBoard({
  teamId,
  projects,
  selectedTaskId,
  onSelectTask,
  onSelectProject,
}: UseAgencyWorkSurfaceTasksBoardOptions): AgencyWorkSurfaceTasksBoardViewModel {
  const { isDark } = useTheme();
  const updateProjectTask = useAgencyOpsStore((s) => s.updateProjectTask);
  const listView = useAgencyTaskList({
    teamId,
    projects,
    selectedTaskId,
    collapsed: false,
    onSelect: onSelectTask,
    onCollapsedChange: () => {},
    onSelectProject,
  });

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState("");
  const [settledTaskId, setSettledTaskId] = useState<string | null>(null);
  const [editingDescriptionTaskId, setEditingDescriptionTaskId] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [delegatePrompt, setDelegatePrompt] = useState<AgencyWorkBoardDelegatePrompt | null>(null);
  const [delegateDraftAssignedToTeam, setDelegateDraftAssignedToTeam] = useState(false);
  const [delegateDraftUserIds, setDelegateDraftUserIds] = useState<string[]>([]);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, []);

  const flashDoneSettle = useCallback((taskId: string) => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    setSettledTaskId(taskId);
    settleTimerRef.current = setTimeout(() => {
      setSettledTaskId(null);
      settleTimerRef.current = null;
    }, DONE_SETTLE_MS);
  }, []);

  const currentUserId = listView.status === "ready" ? listView.currentUserId : "";

  const doneDelegatedQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.projectTasks.list.queryOptions({
          input: {
            teamId,
            delegatedByUserId: currentUserId,
            statuses: ["done"],
            pageSize: 50,
          },
        }),
        enabled: Boolean(teamId && currentUserId),
      },
      "warm",
      { liveGated: true, teamId },
    ),
  );

  const boardCards = useMemo(() => {
    if (listView.status !== "ready") return [] as AgencyWorkBoardCard[];
    return buildAgencyWorkBoardCards({
      mineActiveTasks: listView.activeTableTasks,
      mineDoneTasks: listView.doneTasks,
      delegatedActiveTasks: flattenAssignedClientGroupTasks(listView.assignedClientGroups),
      delegatedDoneTasks: doneDelegatedQuery.data?.items ?? [],
    });
  }, [
    doneDelegatedQuery.data?.items,
    listView.status === "ready" ? listView.activeTableTasks : null,
    listView.status === "ready" ? listView.doneTasks : null,
    listView.status === "ready" ? listView.assignedClientGroups : null,
  ]);

  const cells = useMemo(() => groupAgencyWorkBoardCards(boardCards), [boardCards]);

  const taskById = useMemo(() => {
    const map = new Map<string, AgencyWorkBoardCard>();
    for (const card of boardCards) {
      map.set(card.task.id, card);
    }
    return map;
  }, [boardCards]);

  const moveTaskToColumn = useCallback(
    (taskId: string, column: AgencyWorkBoardColumnId) => {
      if (listView.status !== "ready") return;
      const card = taskById.get(taskId);
      if (!card || card.column === column) return;
      const nextStatus: TaskStatus = columnIdToTaskStatus(column);
      setStatusAnnouncement(`Moved to ${boardColumnLabel(column)}`);

      if (column === "done") {
        flashDoneSettle(taskId);
        listView.onStatusChange(card.task, "done");
        return;
      }

      if (card.column === "done") {
        if (card.swimlane === "mine") {
          listView.onReopenDoneTask(card.task);
          return;
        }
        listView.onStatusChange(card.task, nextStatus);
        return;
      }

      listView.onStatusChange(card.task, nextStatus);
    },
    [flashDoneSettle, listView, taskById],
  );

  const applyAssignees = useCallback(
    (
      task: AgencyProjectTask,
      assignedToTeam: boolean,
      assigneeUserIds: string[],
      status?: TaskStatus,
    ) => {
      void updateProjectTask({
        teamId,
        taskId: task.id,
        assignedToTeam,
        assigneeUserIds: assignedToTeam ? [] : assigneeUserIds,
        ...(status ? { status } : {}),
      });
    },
    [teamId, updateProjectTask],
  );

  const openDelegatePrompt = useCallback(
    (taskId: string, targetColumn: AgencyWorkBoardColumnId) => {
      const card = taskById.get(taskId);
      if (!card) return;
      setDelegatePrompt({
        taskId,
        taskTitle: card.task.title,
        targetColumn,
      });
      setDelegateDraftAssignedToTeam(false);
      setDelegateDraftUserIds(
        card.task.assignees
          .map((entry) => entry.userId)
          .filter((userId) => userId !== currentUserId),
      );
    },
    [currentUserId, taskById],
  );

  const claimTask = useCallback(
    (taskId: string, targetColumn: AgencyWorkBoardColumnId) => {
      const card = taskById.get(taskId);
      if (!card || !currentUserId) return;
      const nextStatus = columnIdToTaskStatus(targetColumn);
      setStatusAnnouncement("Moved to Mine");
      applyAssignees(
        card.task,
        false,
        [currentUserId],
        card.column === targetColumn ? undefined : nextStatus,
      );
      if (targetColumn === "done" && card.column !== "done") {
        flashDoneSettle(taskId);
      }
    },
    [applyAssignees, currentUserId, flashDoneSettle, taskById],
  );

  const onCardDragStart = useCallback(
    (taskId: string, swimlane: AgencyWorkBoardSwimlaneId, event: DragEvent<HTMLElement>) => {
      setDraggingTaskId(taskId);
      if (!event.dataTransfer) return;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        AGENCY_WORK_BOARD_DND_MIME,
        encodeAgencyWorkBoardDragPayload({ taskId, swimlane }),
      );
      event.dataTransfer.setData("text/plain", taskId);
    },
    [],
  );

  const clearDragState = useCallback(() => {
    setDraggingTaskId(null);
    setDragOverCellKey(null);
  }, []);

  const onCellDragOver = useCallback(
    (
      column: AgencyWorkBoardColumnId,
      swimlane: AgencyWorkBoardSwimlaneId,
      event: DragEvent<HTMLElement>,
    ) => {
      if (!draggingTaskId) return;
      const card = taskById.get(draggingTaskId);
      if (!card || !canCrossAgencyWorkBoardSwimlane(card.swimlane, swimlane)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
      setDragOverCellKey(agencyWorkBoardCellKey(column, swimlane));
    },
    [draggingTaskId, taskById],
  );

  const onCellDragLeave = useCallback(
    (
      column: AgencyWorkBoardColumnId,
      swimlane: AgencyWorkBoardSwimlaneId,
      event: DragEvent<HTMLElement>,
    ) => {
      const currentTarget = event.currentTarget;
      const nextTarget = event.relatedTarget;
      if (
        currentTarget instanceof HTMLElement &&
        nextTarget instanceof Node &&
        currentTarget.contains(nextTarget)
      ) {
        return;
      }
      const key = agencyWorkBoardCellKey(column, swimlane);
      if (dragOverCellKey === key) {
        setDragOverCellKey(null);
      }
    },
    [dragOverCellKey],
  );

  const onCellDrop = useCallback(
    (
      column: AgencyWorkBoardColumnId,
      swimlane: AgencyWorkBoardSwimlaneId,
      event: DragEvent<HTMLElement>,
    ) => {
      event.preventDefault();
      const raw = event.dataTransfer?.getData(AGENCY_WORK_BOARD_DND_MIME) ?? "";
      const payload =
        decodeAgencyWorkBoardDragPayload(raw) ??
        (draggingTaskId
          ? {
              taskId: draggingTaskId,
              swimlane: taskById.get(draggingTaskId)?.swimlane ?? swimlane,
            }
          : null);
      clearDragState();
      if (!payload?.taskId) return;

      if (payload.swimlane === swimlane) {
        moveTaskToColumn(payload.taskId, column);
        return;
      }

      if (payload.swimlane === "mine" && swimlane === "delegated") {
        openDelegatePrompt(payload.taskId, column);
        return;
      }

      if (payload.swimlane === "delegated" && swimlane === "mine") {
        claimTask(payload.taskId, column);
      }
    },
    [claimTask, clearDragState, draggingTaskId, moveTaskToColumn, openDelegatePrompt, taskById],
  );

  const onAssigneesChange = useCallback(
    (taskId: string, assignedToTeam: boolean, assigneeUserIds: string[]) => {
      const card = taskById.get(taskId);
      if (!card) return;
      applyAssignees(card.task, assignedToTeam, assigneeUserIds);
      const isDelegated =
        assignedToTeam ||
        assigneeUserIds.some((userId) => userId !== currentUserId) ||
        (assigneeUserIds.length === 1 && assigneeUserIds[0] !== currentUserId);
      setStatusAnnouncement(isDelegated ? "Delegated" : "Assigned to you");
    },
    [applyAssignees, currentUserId, taskById],
  );

  const onBeginDescriptionEdit = useCallback(
    (taskId: string) => {
      const card = taskById.get(taskId);
      if (!card) return;
      setEditingDescriptionTaskId(taskId);
      setDescriptionDraft(taskDescription(card.task));
    },
    [taskById],
  );

  const onCommitDescription = useCallback(() => {
    if (listView.status !== "ready" || !editingDescriptionTaskId) return;
    const card = taskById.get(editingDescriptionTaskId);
    if (!card) {
      setEditingDescriptionTaskId(null);
      return;
    }
    listView.onTaskDescriptionChange(card.task, descriptionDraft);
    setEditingDescriptionTaskId(null);
    setDescriptionDraft("");
  }, [descriptionDraft, editingDescriptionTaskId, listView, taskById]);

  const onCancelDescriptionEdit = useCallback(() => {
    setEditingDescriptionTaskId(null);
    setDescriptionDraft("");
  }, []);

  const onConfirmDelegatePrompt = useCallback(() => {
    if (!delegatePrompt) return;
    const card = taskById.get(delegatePrompt.taskId);
    if (!card) {
      setDelegatePrompt(null);
      return;
    }
    const hasDelegateTarget =
      delegateDraftAssignedToTeam ||
      delegateDraftUserIds.some((userId) => userId !== currentUserId);
    if (!hasDelegateTarget) return;

    const nextStatus = columnIdToTaskStatus(delegatePrompt.targetColumn);
    applyAssignees(
      card.task,
      delegateDraftAssignedToTeam,
      delegateDraftUserIds,
      card.column === delegatePrompt.targetColumn ? undefined : nextStatus,
    );
    if (delegatePrompt.targetColumn === "done" && card.column !== "done") {
      flashDoneSettle(delegatePrompt.taskId);
    }
    setStatusAnnouncement("Delegated");
    setDelegatePrompt(null);
  }, [
    applyAssignees,
    currentUserId,
    delegateDraftAssignedToTeam,
    delegateDraftUserIds,
    delegatePrompt,
    flashDoneSettle,
    taskById,
  ]);

  const onDismissDelegatePrompt = useCallback(() => {
    setDelegatePrompt(null);
  }, []);

  if (listView.status === "unsigned") {
    return { status: "unsigned" };
  }

  if (listView.status !== "ready") {
    return { status: "loading" };
  }

  const loading =
    listView.isLoading ||
    listView.doneTasksLoading ||
    listView.assignedTasksLoading ||
    (doneDelegatedQuery.isPending && boardCards.length === 0);

  const queryError =
    listView.activeTasksQueryError ||
    listView.doneTasksQueryError ||
    listView.assignedTasksQueryError ||
    doneDelegatedQuery.isError;

  if (queryError && boardCards.length === 0) {
    return {
      status: "error",
      message:
        listView.activeTasksErrorMessage ||
        listView.doneTasksErrorMessage ||
        listView.assignedTasksErrorMessage ||
        getErrorMessage(doneDelegatedQuery.error, "Could not load tasks."),
      onRetry: () => {
        listView.onRetryActiveTasks();
        listView.onRetryDoneTasks();
        listView.onRetryAssignedTasks();
        void doneDelegatedQuery.refetch();
      },
    };
  }

  if (loading && boardCards.length === 0) {
    return { status: "loading" };
  }

  const members = listView.create.members;
  const membersLoading = listView.create.membersLoading;

  const columns = AGENCY_WORK_BOARD_COLUMNS.map((columnId) => {
    const swimlanes = AGENCY_WORK_BOARD_SWIMLANES.map((swimlaneId) => {
      const cellCards = cells[agencyWorkBoardCellKey(columnId, swimlaneId)] ?? [];
      return {
        id: swimlaneId,
        label: boardSwimlaneLabel(swimlaneId),
        emptyLabel:
          boardCards.length === 0 && columnId === "open" && swimlaneId === "mine"
            ? "Create a task to start the board."
            : swimlaneId === "delegated"
              ? "Drop a task here to delegate."
              : "No tasks in this lane.",
        cards: cellCards.map((card) => {
          const project = listView.projects.find((entry) => entry.id === card.task.projectId);
          const hue = projectHueFor(card.task.projectId);
          return {
            taskId: card.task.id,
            title: card.task.title,
            clientName: project?.clientName ?? "General",
            projectName: project?.name ?? "Project",
            projectHue: isDark ? hue.dark : hue.light,
            dueLabel: formatDueLabel(card.task.dueDate),
            overdue: isTaskOverdue(card.task.dueDate),
            description: taskDescription(card.task),
            assigneeLabel: assigneeLabelForCard(card),
            assigneeUserIds: card.task.assignees.map((entry) => entry.userId),
            assignedToTeam: card.task.assignedToTeam,
            swimlane: card.swimlane,
            column: card.column,
            selected: card.task.id === selectedTaskId,
            pending: listView.isRowPending(card.task.id),
            settled: settledTaskId === card.task.id,
            canEditDescription: card.swimlane === "mine" && card.column !== "done",
            canDelegate: card.swimlane === "mine" && card.column !== "done",
          };
        }),
      };
    });
    return {
      id: columnId,
      label: boardColumnLabel(columnId),
      count: swimlanes.reduce((sum, lane) => sum + lane.cards.length, 0),
      swimlanes,
    };
  });

  return {
    status: "ready",
    columns,
    totalCards: boardCards.length,
    members,
    membersLoading,
    currentUserId,
    draggingTaskId,
    dragOverCellKey,
    statusAnnouncement,
    editingDescriptionTaskId,
    descriptionDraft,
    delegatePrompt,
    delegateDraftAssignedToTeam,
    delegateDraftUserIds,
    onSelectTask,
    onCardDragStart,
    onCardDragEnd: clearDragState,
    onCellDragOver,
    onCellDragLeave,
    onCellDrop,
    onMoveTaskStatus: moveTaskToColumn,
    onBeginDescriptionEdit,
    onDescriptionDraftChange: setDescriptionDraft,
    onCommitDescription,
    onCancelDescriptionEdit,
    onAssigneesChange,
    onRequestDelegate: (taskId: string) => {
      const card = taskById.get(taskId);
      openDelegatePrompt(taskId, card?.column ?? "open");
    },
    onDelegateDraftAssignedToTeamChange: setDelegateDraftAssignedToTeam,
    onDelegateDraftUserIdsChange: setDelegateDraftUserIds,
    onConfirmDelegatePrompt,
    onDismissDelegatePrompt,
  };
}
