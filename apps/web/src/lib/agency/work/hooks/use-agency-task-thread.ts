import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { TaskThreadComposerUploadHandler } from "@/lib/agency/work/hooks/use-task-thread-messaging";
import { useTaskThreadMessaging } from "@/lib/agency/work/hooks/use-task-thread-messaging";
import type { AgencyVoiceRecorderViewModel } from "@/lib/agency/work/hooks/use-agency-voice-recorder";
import type {
  AgencyTaskProject,
  AgencyTaskThreadMember,
} from "@/lib/schemas/agency-work";
import { useAgencyTaskThreadContextQuery } from "@/lib/queries/agency";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";
import { useAgencyOpsStore } from "@/stores/agency-ops";
import { useAgencyTaskThreadStore } from "@/stores/agency-task-thread";

import type {
  TaskThreadComposerViewModel,
  TaskThreadMessageViewModel,
} from "@/lib/agency/work/hooks/use-task-thread-messaging";

type UseAgencyTaskThreadOptions = {
  teamId: string;
  taskId: string;
  projects: AgencyTaskProject[];
  onBack: () => void;
};

export type AgencyTaskThreadMessageViewModel = TaskThreadMessageViewModel;

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
      messages: TaskThreadMessageViewModel[];
      messagesEmpty: boolean;
      hasOlderMessages: boolean;
      isFetchingOlder: boolean;
      agentPending: boolean;
      lastError: string | null;
      onClearError: () => void;
      assignees: AgencyTaskThreadMember[];
      assignedToTeam: boolean;
      members: AgencyTaskThreadMember[];
      membersLoading: boolean;
      isAssigneesPending: boolean;
      onAssigneesChange: (assignedToTeam: boolean, assigneeUserIds: string[]) => void;
      onBack: () => void;
      onAgentEnabledChange: (enabled: boolean) => void;
      onThreadDrop: (event: React.DragEvent) => void;
      onThreadDragOver: (event: React.DragEvent) => void;
      onThreadDragLeave: (event: React.DragEvent) => void;
      threadContainerRef: React.RefObject<HTMLDivElement | null>;
      showJumpToLatest: boolean;
      onJumpToLatest: () => void;
      composer: TaskThreadComposerViewModel;
      voice: AgencyVoiceRecorderViewModel;
    };

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

  const uploadHandlerRef = useRef<TaskThreadComposerUploadHandler | null>(null);
  const agentToggleId = `agency-task-thread-agent-${taskId}`;

  const contextQuery = useAgencyTaskThreadContextQuery(teamId, taskId);
  const messaging = useTaskThreadMessaging({ teamId, taskId, agentEnabled });

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

  const context = contextQuery.data;
  const project = projects.find((entry) => entry.id === context?.projectId);
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

  useEffect(() => {
    uploadHandlerRef.current = messaging.uploadFiles;
  }, [messaging.uploadFiles]);

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

  const isThreadLoading = contextQuery.isPending || messaging.messagesLoading;
  const isThreadError = contextQuery.isError || Boolean(messaging.messagesError);

  function retryThread() {
    void contextQuery.refetch();
    void messaging.refetchMessages();
  }

  const onThreadDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer?.types.includes("Files")) {
        setIsDraggingFile(true);
      }
    },
    [setIsDraggingFile],
  );

  const onThreadDragLeave = useCallback(
    (event: React.DragEvent) => {
      if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
        setIsDraggingFile(false);
      }
    },
    [setIsDraggingFile],
  );

  const onThreadDrop = useCallback(
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
    const threadError = contextQuery.error ?? messaging.messagesError;
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
    messages: messaging.messages,
    messagesEmpty: messaging.messagesEmpty,
    hasOlderMessages: messaging.hasOlderMessages,
    isFetchingOlder: messaging.isFetchingOlder,
    agentPending: messaging.agentPending,
    lastError: messaging.lastError,
    onClearError: messaging.clearError,
    assignees: contextAssignees,
    assignedToTeam: context?.assignedToTeam ?? false,
    members,
    membersLoading: membersQuery.isPending,
    isAssigneesPending: pendingTaskIds.includes(taskId),
    onAssigneesChange,
    onBack,
    onAgentEnabledChange: setAgentEnabled,
    onThreadDrop,
    onThreadDragOver,
    onThreadDragLeave,
    threadContainerRef: messaging.scroll.containerRef,
    showJumpToLatest: messaging.scroll.showJumpToLatest,
    onJumpToLatest: () => messaging.scroll.scrollToBottom(),
    composer: messaging.composer,
    voice: messaging.voice,
  };
}
