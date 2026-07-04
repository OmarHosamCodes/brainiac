import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { AgencyTaskComposerUploadHandler } from "@/lib/agency/work/hooks/use-agency-task-composer";
import { useAgencyTaskComposer } from "@/lib/agency/work/hooks/use-agency-task-composer";
import { useAgencyVoiceRecorder } from "@/lib/agency/work/hooks/use-agency-voice-recorder";
import type {
  AgencyTaskMessage,
  AgencyTaskProject,
  AgencyTaskThreadMember,
} from "@/lib/schemas/agency-work";
import {
  useAgencyTaskMessagesQuery,
  useAgencyTaskThreadContextQuery,
} from "@/lib/queries/agency";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  isOptimisticTaskMessage,
  resolveMessageAnimationKey,
} from "@/lib/utils/agency-thread-motion";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";
import { useAgencyOptimisticStore } from "@/stores/agency-optimistic";
import { useAgencyOpsStore } from "@/stores/agency-ops";
import { useAgencyTaskThreadStore } from "@/stores/agency-task-thread";

type UseAgencyTaskThreadOptions = {
  teamId: string;
  taskId: string;
  projects: AgencyTaskProject[];
  onBack: () => void;
};

export type AgencyTaskThreadMessageViewModel = {
  id: string;
  animationKey: string;
  isOptimistic: boolean;
  senderType: AgencyTaskMessage["senderType"];
  userName: string;
  createdAt: string;
  content: string | null;
  type: AgencyTaskMessage["type"];
  attachments: AgencyTaskMessage["attachments"];
  showDateDivider: boolean;
  dateLabel: string;
};

export type AgencyTaskThreadViewModel =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry: () => void }
  | {
      status: "ready";
      teamId: string;
      taskId: string;
      taskTitle: string;
      clientName: string;
      projectName: string;
      projectId: string | undefined;
      agentEnabled: boolean;
      agentToggleId: string;
      isDraggingFile: boolean;
      messages: AgencyTaskThreadMessageViewModel[];
      messagesEmpty: boolean;
      assignees: AgencyTaskThreadMember[];
      assignedToTeam: boolean;
      members: AgencyTaskThreadMember[];
      membersLoading: boolean;
      isAssigneesPending: boolean;
      onAssigneesChange: (assignedToTeam: boolean, assigneeUserIds: string[]) => void;
      onBack: () => void;
      onAgentEnabledChange: (enabled: boolean) => void;
      onDragOver: (event: React.DragEvent) => void;
      onDragLeave: (event: React.DragEvent) => void;
      onDrop: (event: React.DragEvent) => void;
      threadContainerRef: React.RefObject<HTMLDivElement | null>;
      composer: ReturnType<typeof useAgencyTaskComposer>;
      voice: ReturnType<typeof useAgencyVoiceRecorder>;
    };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function sameDay(left: string, right: string) {
  return new Date(left).toDateString() === new Date(right).toDateString();
}

function formatAssigneeName(assignedToTeam: boolean, assignees: AgencyTaskThreadMember[]) {
  if (assignedToTeam) return "Entire team";
  if (assignees.length === 0) return null;
  return assignees.map((assignee) => assignee.userName).join(", ");
}

export function useAgencyTaskThread({
  teamId,
  taskId,
  projects,
  onBack,
}: UseAgencyTaskThreadOptions): AgencyTaskThreadViewModel {
  const queryClient = useQueryClient();
  const updateProjectTask = useAgencyOpsStore((s) => s.updateProjectTask);
  const pendingTaskIds = useAgencyOpsStore((s) => s.pendingTaskIds);
  const agentEnabled = useAgencyTaskThreadStore((s) => s.agentEnabled);
  const isDraggingFile = useAgencyTaskThreadStore((s) => s.isDraggingFile);
  const setAgentEnabled = useAgencyTaskThreadStore((s) => s.setAgentEnabled);
  const setIsDraggingFile = useAgencyTaskThreadStore((s) => s.setIsDraggingFile);
  const resetThreadStore = useAgencyTaskThreadStore((s) => s.reset);

  const threadContainerRef = useRef<HTMLDivElement | null>(null);
  const uploadHandlerRef = useRef<AgencyTaskComposerUploadHandler | null>(null);
  const agentToggleId = `agency-task-thread-agent-${taskId}`;

  const contextQuery = useAgencyTaskThreadContextQuery(teamId, taskId);
  const messagesQuery = useAgencyTaskMessagesQuery(teamId, taskId);
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
  const messageOverlayKey = `${teamId}:${taskId}`;
  const messageOverlay = useAgencyOptimisticStore(
    (state) => state.taskMessages[messageOverlayKey],
  );

  const context = contextQuery.data;
  const project = projects.find((p) => p.id === context?.projectId);
  const contextAssignees = context?.assignees ?? [];
  const members = useMemo(() => {
    const byId = new Map<string, AgencyTaskThreadMember>();
    for (const member of membersQuery.data?.items ?? []) {
      byId.set(member.userId, member);
    }
    for (const assignee of contextAssignees) {
      if (!byId.has(assignee.userId)) byId.set(assignee.userId, assignee);
    }
    return [...byId.values()];
  }, [contextAssignees, membersQuery.data?.items]);

  const onRegisterUploadHandler = useCallback((handler: AgencyTaskComposerUploadHandler | null) => {
    uploadHandlerRef.current = handler;
  }, []);

  const composer = useAgencyTaskComposer({
    teamId,
    taskId,
    agentEnabled,
    onSent: () => {},
    onRegisterUploadHandler,
  });

  const voice = useAgencyVoiceRecorder({
    disabled: composer.isBusy,
    onRecorded: composer.onVoiceRecorded,
  });

  useEffect(() => {
    resetThreadStore();
  }, [taskId, resetThreadStore]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onBack();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onBack]);

  const overlay = messageOverlay ?? { upserts: {}, deletedIds: {}, idMap: {} };
  const rawMessages = [...(messagesQuery.data?.items ?? [])].reverse();
  const messages: AgencyTaskThreadMessageViewModel[] = rawMessages.map((message, index) => ({
    id: message.id,
    animationKey: resolveMessageAnimationKey(message.id, overlay.idMap),
    isOptimistic: isOptimisticTaskMessage(message.id, overlay),
    senderType: message.senderType,
    userName: message.userName,
    createdAt: message.createdAt,
    content: message.content,
    type: message.type,
    attachments: message.attachments,
    showDateDivider:
      index === 0 || !sameDay(message.createdAt, rawMessages[index - 1]?.createdAt ?? ""),
    dateLabel: formatDate(message.createdAt),
  }));

  const isThreadLoading = contextQuery.isPending || messagesQuery.isPending;
  const isThreadError = contextQuery.isError || messagesQuery.isError;

  function retryThread() {
    void contextQuery.refetch();
    void messagesQuery.refetch();
  }

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer?.types.includes("Files")) {
        setIsDraggingFile(true);
      }
    },
    [setIsDraggingFile],
  );

  const onDragLeave = useCallback(
    (event: React.DragEvent) => {
      if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
        setIsDraggingFile(false);
      }
    },
    [setIsDraggingFile],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDraggingFile(false);
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        void uploadHandlerRef.current?.(Array.from(files));
      }
    },
    [setIsDraggingFile],
  );

  const onAssigneesChange = useCallback(
    (assignedToTeam: boolean, assigneeUserIds: string[]) => {
      if (!teamId || !taskId) return;

      const contextQueryKey = orpc.agencyOps.taskThreads.context.get.queryOptions({
        input: { teamId, taskId },
      }).queryKey;
      const previousContext = queryClient.getQueryData(contextQueryKey);
      const nextAssignees = assignedToTeam
        ? []
        : assigneeUserIds.map((userId) => {
            const member =
              members.find((entry) => entry.userId === userId) ??
              contextAssignees.find((entry) => entry.userId === userId);
            return (
              member ?? {
                userId,
                userName: "Member",
                userAvatar: null,
              }
            );
          });

      queryClient.setQueryData(contextQueryKey, (current: typeof context) => {
        if (!current) return current;
        return {
          ...current,
          assignedToTeam,
          assignees: nextAssignees,
          assigneeName: formatAssigneeName(assignedToTeam, nextAssignees),
        };
      });

      void updateProjectTask({
        teamId,
        taskId,
        assignedToTeam,
        assigneeUserIds: assignedToTeam ? [] : assigneeUserIds,
      })
        .then(() => {
          void contextQuery.refetch();
        })
        .catch(() => {
          queryClient.setQueryData(contextQueryKey, previousContext);
        });
    },
    [contextAssignees, contextQuery, members, queryClient, taskId, teamId, updateProjectTask],
  );

  if (isThreadLoading) {
    return { status: "loading" };
  }

  if (isThreadError) {
    const threadError = contextQuery.error ?? messagesQuery.error;
    return {
      status: "error",
      message: getErrorMessage(threadError, "Try refreshing."),
      onRetry: retryThread,
    };
  }

  return {
    status: "ready",
    teamId,
    taskId,
    taskTitle: context?.taskTitle ?? "Task",
    clientName: project?.clientName ?? "Client",
    projectName: project?.name ?? "Project",
    projectId: context?.projectId,
    agentEnabled,
    agentToggleId,
    isDraggingFile,
    messages,
    messagesEmpty: messages.length === 0,
    assignees: contextAssignees,
    assignedToTeam: context?.assignedToTeam ?? false,
    members,
    membersLoading: membersQuery.isPending,
    isAssigneesPending: pendingTaskIds.includes(taskId),
    onAssigneesChange,
    onBack,
    onAgentEnabledChange: setAgentEnabled,
    onDragOver,
    onDragLeave,
    onDrop,
    threadContainerRef,
    composer,
    voice,
  };
}
