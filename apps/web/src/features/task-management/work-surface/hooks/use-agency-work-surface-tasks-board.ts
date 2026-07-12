import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

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
  isAgencyWorkBoardCardReadOnly,
  canDropOnAgencyWorkBoardCell,
} from "@/features/task-management/work-surface/agency-work-surface-tasks-board";
import { useAgencyTaskList } from "@/features/task-management/hooks/use-agency-task-list";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { useTheme } from "@/stores/theme";
import { projectHueFor } from "@/features/shared/project-palette";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

const DONE_SETTLE_MS = 200;
const ANNOUNCE_CLEAR_MS = 2500;
const DESCRIPTION_SAVED_MS = 1200;
const EMPTY_TODO_DESCRIPTION = "New todo";

export type AgencyWorkBoardDelegatePrompt = {
  taskId: string;
  taskTitle: string;
  targetColumn: AgencyWorkBoardColumnId;
};

export type AgencyWorkSurfaceTasksBoardCardViewModel = {
  cardKey: string;
  taskId: string;
  blueprintId: string | null;
  projectId: string;
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
  canClaim: boolean;
  canDuplicate: boolean;
  canDelete: boolean;
  canTrack: boolean;
  readOnly: boolean;
  descriptionSaveState: "idle" | "saving" | "saved";
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
      teamId: string;
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
      editingDescriptionCardKey: string | null;
      descriptionDraft: string;
      delegatePrompt: AgencyWorkBoardDelegatePrompt | null;
      delegateDraftAssignedToTeam: boolean;
      delegateDraftUserIds: string[];
      deleteTarget: AgencyProjectTask | null;
      deletePending: boolean;
      partialLoadWarning: string | null;
      onRetryPartialLoad: () => void;
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
      onBeginDescriptionEdit: (cardKey: string) => void;
      onDescriptionDraftChange: (value: string) => void;
      onCommitDescription: () => void;
      onCancelDescriptionEdit: () => void;
      onRequestDelegate: (taskId: string) => void;
      onClaimTask: (taskId: string) => void;
      onDuplicateTodo: (cardKey: string) => void;
      onRequestDelete: (taskId: string) => void;
      onDismissDelete: () => void;
      onConfirmDelete: () => void;
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

export function useAgencyWorkSurfaceTasksBoard({
  teamId,
  projects,
  selectedTaskId,
  onSelectTask,
  onSelectProject,
}: UseAgencyWorkSurfaceTasksBoardOptions): AgencyWorkSurfaceTasksBoardViewModel {
  const { isDark } = useTheme();
  const updateProjectTask = useAgencyOpsStore((s) => s.updateProjectTask);
  const completeProjectTaskForMember = useAgencyOpsStore((s) => s.completeProjectTaskForMember);
  const createProjectTask = useAgencyOpsStore((s) => s.createProjectTask);
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
  const [editingDescriptionCardKey, setEditingDescriptionCardKey] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionSaveCardKey, setDescriptionSaveCardKey] = useState<string | null>(null);
  const [descriptionSaveState, setDescriptionSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [delegatePrompt, setDelegatePrompt] = useState<AgencyWorkBoardDelegatePrompt | null>(null);
  const [delegateDraftAssignedToTeam, setDelegateDraftAssignedToTeam] = useState(false);
  const [delegateDraftUserIds, setDelegateDraftUserIds] = useState<string[]>([]);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descriptionSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
      if (descriptionSavedTimerRef.current) clearTimeout(descriptionSavedTimerRef.current);
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

  const announceSuccess = useCallback((message: string) => {
    setStatusAnnouncement(message);
    toast.success(message);
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => {
      setStatusAnnouncement("");
      announceTimerRef.current = null;
    }, ANNOUNCE_CLEAR_MS);
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

  const cardByKey = useMemo(() => {
    const map = new Map<string, AgencyWorkBoardCard>();
    for (const card of boardCards) {
      map.set(card.cardKey, card);
    }
    return map;
  }, [boardCards]);

  const taskById = useMemo(() => {
    const map = new Map<string, AgencyWorkBoardCard>();
    for (const card of boardCards) {
      if (!map.has(card.task.id)) {
        map.set(card.task.id, card);
      }
    }
    return map;
  }, [boardCards]);

  const moveTaskToColumn = useCallback(
    (taskId: string, column: AgencyWorkBoardColumnId) => {
      if (listView.status !== "ready") return;
      const card = taskById.get(taskId);
      if (!card || card.column === column) return;
      if (isAgencyWorkBoardCardReadOnly(card.swimlane, card.column)) return;
      const nextStatus: TaskStatus = columnIdToTaskStatus(column);
      const message = `Moved to ${boardColumnLabel(column)}`;

      void (async () => {
        try {
          if (column === "done") {
            await completeProjectTaskForMember({ teamId, taskId: card.task.id });
            flashDoneSettle(taskId);
            announceSuccess(message);
            return;
          }

          if (card.column === "done") {
            if (card.swimlane === "mine") {
              listView.onReopenDoneTask(card.task);
              announceSuccess(message);
              return;
            }
            await updateProjectTask({
              teamId,
              taskId: card.task.id,
              status: nextStatus,
            });
            announceSuccess(message);
            return;
          }

          await updateProjectTask({
            teamId,
            taskId: card.task.id,
            status: nextStatus,
          });
          announceSuccess(message);
        } catch {
          // Store already toasts the error.
        }
      })();
    },
    [
      announceSuccess,
      completeProjectTaskForMember,
      flashDoneSettle,
      listView,
      taskById,
      teamId,
      updateProjectTask,
    ],
  );

  const applyAssignees = useCallback(
    async (
      task: AgencyProjectTask,
      assignedToTeam: boolean,
      assigneeUserIds: string[],
      status?: TaskStatus,
    ) => {
      await updateProjectTask({
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
      if (isAgencyWorkBoardCardReadOnly(card.swimlane, card.column)) return;
      const nextStatus = columnIdToTaskStatus(targetColumn);
      void (async () => {
        try {
          await applyAssignees(
            card.task,
            false,
            [currentUserId],
            card.column === targetColumn ? undefined : nextStatus,
          );
          if (targetColumn === "done" && card.column !== "done") {
            flashDoneSettle(taskId);
          }
          announceSuccess("Moved to Mine");
        } catch {
          // Store already toasts the error.
        }
      })();
    },
    [announceSuccess, applyAssignees, currentUserId, flashDoneSettle, taskById],
  );

  const onCardDragStart = useCallback(
    (taskId: string, swimlane: AgencyWorkBoardSwimlaneId, event: DragEvent<HTMLElement>) => {
      const card = taskById.get(taskId);
      if (!card || isAgencyWorkBoardCardReadOnly(card.swimlane, card.column)) {
        event.preventDefault();
        return;
      }
      setDraggingTaskId(taskId);
      if (!event.dataTransfer) return;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        AGENCY_WORK_BOARD_DND_MIME,
        encodeAgencyWorkBoardDragPayload({ taskId, swimlane }),
      );
      event.dataTransfer.setData("text/plain", taskId);
    },
    [taskById],
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
      if (!canDropOnAgencyWorkBoardCell(swimlane, column)) return;
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
      if (!canDropOnAgencyWorkBoardCell(swimlane, column)) return;
      const source = taskById.get(payload.taskId);
      if (source && isAgencyWorkBoardCardReadOnly(source.swimlane, source.column)) return;

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

  const onBeginDescriptionEdit = useCallback(
    (cardKey: string) => {
      const card = cardByKey.get(cardKey);
      if (!card) return;
      setEditingDescriptionCardKey(cardKey);
      setDescriptionDraft(card.description);
      setDescriptionSaveState("idle");
      setDescriptionSaveCardKey(null);
    },
    [cardByKey],
  );

  const onCommitDescription = useCallback(() => {
    if (listView.status !== "ready" || !editingDescriptionCardKey) return;
    const card = cardByKey.get(editingDescriptionCardKey);
    if (!card) {
      setEditingDescriptionCardKey(null);
      return;
    }
    const next = descriptionDraft.trim();
    const previous = card.description;
    if (next === previous) {
      setEditingDescriptionCardKey(null);
      setDescriptionDraft("");
      return;
    }

    const cardKey = editingDescriptionCardKey;
    setDescriptionSaveCardKey(cardKey);
    setDescriptionSaveState("saving");
    listView.onTaskDescriptionChange(card.task, descriptionDraft, card.blueprintId ?? undefined);
    setEditingDescriptionCardKey(null);
    setDescriptionDraft("");

    if (descriptionSavedTimerRef.current) clearTimeout(descriptionSavedTimerRef.current);
    descriptionSavedTimerRef.current = setTimeout(() => {
      setDescriptionSaveState("saved");
      descriptionSavedTimerRef.current = setTimeout(() => {
        setDescriptionSaveState("idle");
        setDescriptionSaveCardKey(null);
        descriptionSavedTimerRef.current = null;
      }, DESCRIPTION_SAVED_MS);
    }, 450);
  }, [cardByKey, descriptionDraft, editingDescriptionCardKey, listView]);

  const onCancelDescriptionEdit = useCallback(() => {
    setEditingDescriptionCardKey(null);
    setDescriptionDraft("");
  }, []);

  const onDuplicateTodo = useCallback(
    (cardKey: string) => {
      const card = cardByKey.get(cardKey);
      if (!card || isAgencyWorkBoardCardReadOnly(card.swimlane, card.column)) return;
      if (card.swimlane !== "mine" || card.column === "done") return;

      const description = card.description.trim() || EMPTY_TODO_DESCRIPTION;
      const blueprints = card.task.viewerBlueprints ?? [];

      void (async () => {
        try {
          // Materialize a virtual (no-blueprint) card first so Duplicate yields two todos.
          if (blueprints.length === 0) {
            const materialized = await createProjectTask({
              teamId,
              projectId: card.task.projectId,
              title: card.task.title,
              assignedToTeam: card.task.assignedToTeam,
              assigneeUserIds: card.task.assignees.map((entry) => entry.userId),
              description: card.description.trim() || EMPTY_TODO_DESCRIPTION,
              reusesExistingTitle: true,
              successToast: false,
            });
            if (!materialized) return;
          }

          const created = await createProjectTask({
            teamId,
            projectId: card.task.projectId,
            title: card.task.title,
            assignedToTeam: card.task.assignedToTeam,
            assigneeUserIds: card.task.assignees.map((entry) => entry.userId),
            description,
            reusesExistingTitle: true,
            successToast: false,
          });
          if (created) {
            announceSuccess("Todo added");
          }
        } catch {
          // Store already toasts the error.
        }
      })();
    },
    [announceSuccess, cardByKey, createProjectTask, teamId],
  );

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
    const prompt = delegatePrompt;
    setDelegatePrompt(null);

    void (async () => {
      try {
        await applyAssignees(
          card.task,
          delegateDraftAssignedToTeam,
          delegateDraftUserIds,
          card.column === prompt.targetColumn ? undefined : nextStatus,
        );
        if (prompt.targetColumn === "done" && card.column !== "done") {
          flashDoneSettle(prompt.taskId);
        }
        announceSuccess("Delegated");
      } catch {
        // Store already toasts the error.
      }
    })();
  }, [
    announceSuccess,
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

  const retryBoardQueries = () => {
    listView.onRetryActiveTasks();
    listView.onRetryDoneTasks();
    listView.onRetryAssignedTasks();
    void doneDelegatedQuery.refetch();
  };

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
      onRetry: retryBoardQueries,
    };
  }

  if (loading && boardCards.length === 0) {
    return { status: "loading" };
  }

  const members = listView.create.members;
  const membersLoading = listView.create.membersLoading;
  const partialLoadWarning = queryError
    ? "Some tasks may be missing. Retry to refresh the board."
    : null;

  const columns = AGENCY_WORK_BOARD_COLUMNS.map((columnId) => {
    const swimlanes = AGENCY_WORK_BOARD_SWIMLANES.map((swimlaneId) => {
      const cellCards = cells[agencyWorkBoardCellKey(columnId, swimlaneId)] ?? [];
      return {
        id: swimlaneId,
        label: boardSwimlaneLabel(swimlaneId),
        emptyLabel:
          boardCards.length === 0 && columnId === "open" && swimlaneId === "mine"
            ? "Create a task to start the board."
            : swimlaneId === "delegated" && columnId === "open"
              ? "Drop a task here to delegate, or use Delegate… on a card."
              : "No tasks in this lane.",
        cards: cellCards.map((card) => {
          const project = listView.projects.find((entry) => entry.id === card.task.projectId);
          const hue = projectHueFor(card.task.projectId);
          const readOnly = isAgencyWorkBoardCardReadOnly(card.swimlane, card.column);
          const canMutate = !readOnly;
          return {
            cardKey: card.cardKey,
            taskId: card.task.id,
            blueprintId: card.blueprintId,
            projectId: card.task.projectId,
            title: card.task.title,
            clientName: project?.clientName ?? "General",
            projectName: project?.name ?? "Project",
            projectHue: isDark ? hue.dark : hue.light,
            dueLabel: formatDueLabel(card.task.dueDate),
            overdue: isTaskOverdue(card.task.dueDate),
            description: card.description,
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
            canClaim: card.swimlane === "delegated" && canMutate,
            canDuplicate: card.swimlane === "mine" && card.column !== "done",
            canDelete: canMutate && card.swimlane === "mine",
            canTrack:
              card.swimlane === "mine" &&
              card.column !== "done" &&
              !card.task.isWaste &&
              card.task.status !== "archived" &&
              Boolean(project),
            readOnly,
            descriptionSaveState:
              descriptionSaveCardKey === card.cardKey ? descriptionSaveState : "idle",
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
    teamId,
    columns,
    totalCards: boardCards.length,
    members,
    membersLoading,
    currentUserId,
    draggingTaskId,
    dragOverCellKey,
    statusAnnouncement,
    editingDescriptionCardKey,
    descriptionDraft,
    delegatePrompt,
    delegateDraftAssignedToTeam,
    delegateDraftUserIds,
    deleteTarget: listView.deleteTarget,
    deletePending: listView.deletePending,
    partialLoadWarning,
    onRetryPartialLoad: retryBoardQueries,
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
    onRequestDelegate: (taskId: string) => {
      const card = taskById.get(taskId);
      openDelegatePrompt(taskId, card?.column ?? "open");
    },
    onClaimTask: (taskId: string) => {
      const card = taskById.get(taskId);
      if (!card) return;
      claimTask(taskId, card.column);
    },
    onDuplicateTodo,
    onRequestDelete: (taskId: string) => {
      const card = taskById.get(taskId);
      if (!card) return;
      listView.onRequestDelete(card.task);
    },
    onDismissDelete: listView.onDismissDelete,
    onConfirmDelete: listView.onConfirmDelete,
    onDelegateDraftAssignedToTeamChange: setDelegateDraftAssignedToTeam,
    onDelegateDraftUserIdsChange: setDelegateDraftUserIds,
    onConfirmDelegatePrompt,
    onDismissDelegatePrompt,
  };
}
