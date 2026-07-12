import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState, type DragEvent } from "react";

import type { AgencyTaskProject, TaskStatus } from "@/features/task-management/agency-work";
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
  columnIdToTaskStatus,
  decodeAgencyWorkBoardDragPayload,
  encodeAgencyWorkBoardDragPayload,
  flattenAssignedClientGroupTasks,
  groupAgencyWorkBoardCards,
} from "@/features/task-management/work-surface/agency-work-surface-tasks-board";
import { useAgencyTaskList } from "@/features/task-management/hooks/use-agency-task-list";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export type AgencyWorkSurfaceTasksBoardCardViewModel = {
  taskId: string;
  title: string;
  projectName: string;
  dueLabel: string;
  assigneeLabel: string;
  swimlane: AgencyWorkBoardSwimlaneId;
  column: AgencyWorkBoardColumnId;
  selected: boolean;
  pending: boolean;
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
      draggingTaskId: string | null;
      dragOverCellKey: string | null;
      statusAnnouncement: string;
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

export function useAgencyWorkSurfaceTasksBoard({
  teamId,
  projects,
  selectedTaskId,
  onSelectTask,
  onSelectProject,
}: UseAgencyWorkSurfaceTasksBoardOptions): AgencyWorkSurfaceTasksBoardViewModel {
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
        listView.onStatusChange(card.task, "done");
        return;
      }

      if (card.column === "done") {
        if (card.swimlane === "mine") {
          // Member reopen recreates an active task (existing Done-tab semantics).
          listView.onReopenDoneTask(card.task);
          return;
        }
        listView.onStatusChange(card.task, nextStatus);
        return;
      }

      listView.onStatusChange(card.task, nextStatus);
    },
    [listView, taskById],
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
      if (!card || card.swimlane !== swimlane) return;
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
      if (!payload?.taskId || payload.swimlane !== swimlane) return;
      moveTaskToColumn(payload.taskId, column);
    },
    [clearDragState, draggingTaskId, moveTaskToColumn, taskById],
  );

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

  const columns = AGENCY_WORK_BOARD_COLUMNS.map((columnId) => {
    const swimlanes = AGENCY_WORK_BOARD_SWIMLANES.map((swimlaneId) => {
      const cellCards = cells[agencyWorkBoardCellKey(columnId, swimlaneId)] ?? [];
      return {
        id: swimlaneId,
        label: boardSwimlaneLabel(swimlaneId),
        emptyLabel:
          boardCards.length === 0 && columnId === "open" && swimlaneId === "mine"
            ? "Create a task to start the board."
            : "No tasks in this lane.",
        cards: cellCards.map((card) => ({
          taskId: card.task.id,
          title: card.task.title,
          projectName:
            listView.projects.find((project) => project.id === card.task.projectId)?.name ??
            "Project",
          dueLabel: formatDueLabel(card.task.dueDate),
          assigneeLabel: assigneeLabelForCard(card),
          swimlane: card.swimlane,
          column: card.column,
          selected: card.task.id === selectedTaskId,
          pending: listView.isRowPending(card.task.id),
        })),
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
    draggingTaskId,
    dragOverCellKey,
    statusAnnouncement,
    onSelectTask,
    onCardDragStart,
    onCardDragEnd: clearDragState,
    onCellDragOver,
    onCellDragLeave,
    onCellDrop,
    onMoveTaskStatus: moveTaskToColumn,
  };
}
