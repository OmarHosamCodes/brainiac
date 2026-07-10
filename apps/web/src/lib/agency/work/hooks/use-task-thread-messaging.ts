import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAgencyTaskMessagesInfiniteQuery } from "@/lib/queries/agency";
import { authClient } from "@/lib/auth-client";
import { getRpcBaseUrl, getServerUrl } from "@/lib/env";
import { orpcClient } from "@/lib/orpc";
import {
  normalizeAttachmentUrl,
  collectClipboardFiles,
  type AttachmentMetadataLike,
} from "@/lib/utils/agency-attachment-utils";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { getUserAvatarPublicUrl } from "@/lib/user-avatar-url";
import {
  isAgentPendingMessageId,
  isOptimisticTaskMessage,
  resolveMessageAnimationKey,
} from "@/lib/utils/agency-thread-motion";
import { useAgencyTaskMessagesStore } from "@/stores/agency-task-messages";
import { useAgencyOptimisticStore } from "@/stores/agency-optimistic";
import type { AgencyTaskMessage } from "@/lib/schemas/agency-work";

import { useAgencyVoiceRecorder } from "@/lib/agency/work/hooks/use-agency-voice-recorder";
import { useTaskThreadLiveSync } from "@/lib/agency/work/hooks/use-task-thread-live-sync";
import { useTaskThreadScroll } from "@/lib/agency/work/hooks/use-task-thread-scroll";

type PendingAttachment = {
  fileName: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
  url: string;
  uploadToken: string;
  durationSeconds: number | null;
  metadata?: AttachmentMetadataLike;
};

export type TaskThreadComposerUploadHandler = (
  files: File[],
  options?: { durationSeconds?: number | null },
) => Promise<void>;

export type TaskThreadMessageViewModel = {
  id: string;
  animationKey: string;
  isOptimistic: boolean;
  isAgentPending: boolean;
  senderType: AgencyTaskMessage["senderType"] | "system";
  userName: string;
  userAvatar: string | null;
  createdAt: string;
  content: string | null;
  type: AgencyTaskMessage["type"];
  attachments: AgencyTaskMessage["attachments"];
  showDateDivider: boolean;
  dateLabel: string;
};

export type TaskThreadComposerViewModel = {
  content: string;
  isDragging: boolean;
  isBusy: boolean;
  pendingAttachments: PendingAttachment[];
  agentEnabled: boolean;
  placeholder: string;
  attachmentCountLabel: string | null;
  micError: string | null;
  onContentChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onImageInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDocumentInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onAttachImageClick: () => void;
  onAttachDocumentClick: () => void;
  onRemoveAttachment: (index: number) => void;
  onVoiceRecorded: (file: File, durationSeconds: number) => void;
  onAddUrlAttachment: (url: string, label?: string) => Promise<void>;
  imageFileInputId: string;
  documentFileInputId: string;
};

type UseTaskThreadMessagingOptions = {
  teamId: string;
  taskId: string;
  agentEnabled: boolean;
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

function getComposerPlaceholder(agentEnabled: boolean, hasAttachments: boolean): string {
  if (hasAttachments) {
    return agentEnabled ? "Describe what you want to do with these files..." : "Add a message...";
  }
  return agentEnabled ? "Ask the agent about this task..." : "Write a message...";
}

async function captureFileMetadata(
  file: File,
): Promise<NonNullable<PendingAttachment["metadata"]>> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const meta: NonNullable<PendingAttachment["metadata"]> = {
    fileExtension: ext,
    lastModified: new Date(file.lastModified).toISOString(),
  };

  if (file.type.startsWith("image/")) {
    meta.mediaKind = "image";
    try {
      const data = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load image"));
        };
        img.src = url;
      });
      meta.imageWidth = data.width;
      meta.imageHeight = data.height;
    } catch {
      // metadata capture failed
    }
  } else if (file.type.startsWith("video/")) {
    meta.mediaKind = "video";
  } else if (file.type.startsWith("audio/")) {
    meta.mediaKind = "audio";
  } else if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) {
    meta.mediaKind = "archive";
  } else {
    meta.mediaKind = "document";
  }

  return meta;
}

function mapPendingAttachmentsForSend(attachments: PendingAttachment[]) {
  return attachments.map((attachment) => ({
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    storageKey: attachment.storageKey,
    sizeBytes: attachment.sizeBytes,
    durationSeconds: attachment.durationSeconds ?? undefined,
    uploadToken: attachment.uploadToken,
    metadata: attachment.metadata ?? undefined,
    url: attachment.url,
  }));
}

function inferMessageType(pendingAttachments: PendingAttachment[]) {
  if (
    pendingAttachments.length > 0 &&
    pendingAttachments.every((attachment) => attachment.durationSeconds !== null)
  ) {
    return "voice" as const;
  }
  if (pendingAttachments.length > 0) {
    return "attachment" as const;
  }
  return "text" as const;
}

export function useTaskThreadMessaging({
  teamId,
  taskId,
  agentEnabled,
}: UseTaskThreadMessagingOptions) {
  const sendMessage = useAgencyTaskMessagesStore((state) => state.sendMessage);
  const askAgent = useAgencyTaskMessagesStore((state) => state.askAgent);
  const isSending = useAgencyTaskMessagesStore((state) => state.isSending);
  const agentPending = useAgencyTaskMessagesStore((state) => state.agentPending);
  const lastError = useAgencyTaskMessagesStore((state) => state.lastError);
  const clearError = useAgencyTaskMessagesStore((state) => state.clearError);

  const messagesQuery = useAgencyTaskMessagesInfiniteQuery(teamId, taskId);
  const session = authClient.useSession();
  const selfAvatarUrl = useMemo(() => {
    const user = session.data?.user;
    const serverUrl = getServerUrl();
    if (!user?.id || !user.image || !serverUrl) return null;
    return getUserAvatarPublicUrl({
      baseUrl: serverUrl,
      userId: user.id,
      storageKey: user.image,
    });
  }, [session.data?.user]);
  const { connectionState: liveConnectionState } = useTaskThreadLiveSync({ teamId, taskId });
  const messageOverlayKey = `${teamId}:${taskId}`;
  const messageOverlay = useAgencyOptimisticStore((state) => state.taskMessages[messageOverlayKey]);

  const [content, setContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  const imageFileInputId = `task-thread-composer-image-${teamId}-${taskId}`;
  const documentFileInputId = `task-thread-composer-document-${teamId}-${taskId}`;

  const serverItems = useMemo(
    () => messagesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [messagesQuery.data?.pages],
  );

  const totalMessages = messagesQuery.data?.pages[0]?.total ?? serverItems.length;
  const hasOlderMessages = serverItems.length < totalMessages;

  const fetchOlderMessages = useCallback(() => {
    if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
      void messagesQuery.fetchNextPage();
    }
  }, [messagesQuery]);

  const overlay = messageOverlay ?? { upserts: {}, deletedIds: {}, idMap: {} };
  const rawMessages = useMemo(() => [...serverItems].reverse(), [serverItems]);

  const messages: TaskThreadMessageViewModel[] = useMemo(
    () =>
      rawMessages.map((message, index) => {
        const isOptimistic = isOptimisticTaskMessage(message.id, overlay);
        return {
          id: message.id,
          animationKey: resolveMessageAnimationKey(message.id, overlay.idMap),
          isOptimistic,
          isAgentPending: isAgentPendingMessageId(message.id),
          senderType: message.senderType,
          userName: message.userName,
          userAvatar: message.userAvatar ?? (isOptimistic ? selfAvatarUrl : null),
          createdAt: message.createdAt,
          content: message.content,
          type: message.type,
          attachments: message.attachments,
          showDateDivider:
            index === 0 || !sameDay(message.createdAt, rawMessages[index - 1]?.createdAt ?? ""),
          dateLabel: formatDate(message.createdAt),
        };
      }),
    [rawMessages, overlay, selfAvatarUrl],
  );

  const scrollAnchorKey =
    messages.length > 0 ? messages[messages.length - 1]?.animationKey : "empty";

  const scroll = useTaskThreadScroll({
    messageCount: messages.length,
    scrollAnchorKey,
    hasOlderMessages,
    isFetchingOlder: messagesQuery.isFetchingNextPage,
    onLoadOlder: fetchOlderMessages,
    forceScrollToBottom: justSent,
  });

  useEffect(() => {
    if (!justSent) return;
    const timer = window.setTimeout(() => setJustSent(false), 100);
    return () => window.clearTimeout(timer);
  }, [justSent]);

  const uploadFiles = useCallback<TaskThreadComposerUploadHandler>(
    async (files, options = {}) => {
      for (const file of files) {
        try {
          const metadata = await captureFileMetadata(file);
          if (options.durationSeconds != null) {
            metadata.durationSeconds = options.durationSeconds;
            metadata.mediaKind = "audio";
          }

          const formData = new FormData();
          formData.set("teamId", teamId);
          formData.set("taskId", taskId);
          formData.set("file", file);

          const uploadResponse = await fetch(`${getRpcBaseUrl()}/uploads/task-attachments`, {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!uploadResponse.ok) {
            throw new Error("Upload failed");
          }

          const result = (await uploadResponse.json()) as {
            storageKey: string;
            publicUrl: string;
            uploadToken: string;
            fileName: string;
            mimeType: string;
            sizeBytes: number;
            imageWidth?: number;
            imageHeight?: number;
          };

          if (result.imageWidth != null && result.imageHeight != null) {
            metadata.imageWidth = result.imageWidth;
            metadata.imageHeight = result.imageHeight;
          }

          setPendingAttachments((current) => [
            ...current,
            {
              fileName: result.fileName,
              mimeType: result.mimeType,
              storageKey: result.storageKey,
              sizeBytes: result.sizeBytes,
              url: result.publicUrl,
              uploadToken: result.uploadToken,
              durationSeconds: options.durationSeconds ?? null,
              metadata,
            },
          ]);
        } catch (error) {
          toast.error("Upload failed", {
            description: getErrorMessage(error, "Try again."),
          });
        }
      }
    },
    [taskId, teamId],
  );

  const onAddUrlAttachment = useCallback(
    async (rawUrl: string, label?: string) => {
      const normalizedUrl = normalizeAttachmentUrl(rawUrl);
      if (!normalizedUrl) {
        toast.error("Invalid URL", { description: "Enter a valid HTTPS link." });
        return;
      }

      try {
        const result = await orpcClient.agencyOps.taskThreads.attachments.createLink({
          teamId,
          taskId,
          url: normalizedUrl,
          label,
        });

        setPendingAttachments((current) => [
          ...current,
          {
            fileName: result.fileName,
            mimeType: result.mimeType,
            storageKey: result.storageKey,
            sizeBytes: result.sizeBytes,
            url: result.publicUrl,
            uploadToken: result.uploadToken,
            durationSeconds: null,
            metadata: result.metadata ?? {
              mediaKind: "link",
              sourceUrl: normalizedUrl,
            },
          },
        ]);
      } catch (error) {
        toast.error("Couldn't add link", {
          description: getErrorMessage(error, "Try again."),
        });
      }
    },
    [taskId, teamId],
  );

  const onVoiceRecorded = useCallback(
    (file: File, durationSeconds: number) => {
      setMicError(null);
      void uploadFiles([file], { durationSeconds });
    },
    [uploadFiles],
  );

  const voice = useAgencyVoiceRecorder({
    disabled: isSending || agentPending,
    onRecorded: onVoiceRecorded,
    onMicDenied: () => setMicError("Microphone access was denied."),
  });

  const send = useCallback(async () => {
    const text = content.trim();
    if (!text && pendingAttachments.length === 0) return;

    clearError();
    const payload = {
      teamId,
      taskId,
      content: text || (agentEnabled ? "What do you think?" : ""),
      type: inferMessageType(pendingAttachments),
      attachments:
        pendingAttachments.length > 0
          ? mapPendingAttachmentsForSend(pendingAttachments)
          : undefined,
    };

    try {
      if (agentEnabled) {
        await askAgent(payload);
      } else {
        await sendMessage(payload);
      }
      setContent("");
      setPendingAttachments([]);
      setJustSent(true);
    } catch {
      // store sets lastError
    }
  }, [
    agentEnabled,
    askAgent,
    clearError,
    content,
    pendingAttachments,
    sendMessage,
    taskId,
    teamId,
  ]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void send();
      }
    },
    [send],
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        void uploadFiles(Array.from(files));
      }
      event.target.value = "";
    },
    [uploadFiles],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (isSending || agentPending) return;

      const files = collectClipboardFiles(event.clipboardData);
      if (files.length === 0) return;

      event.preventDefault();
      void uploadFiles(files);
    },
    [agentPending, isSending, uploadFiles],
  );

  const composer: TaskThreadComposerViewModel = {
    content,
    isDragging,
    isBusy: isSending || agentPending,
    pendingAttachments,
    agentEnabled,
    placeholder: getComposerPlaceholder(agentEnabled, pendingAttachments.length > 0),
    attachmentCountLabel:
      pendingAttachments.length > 0
        ? `${pendingAttachments.length} file${pendingAttachments.length === 1 ? "" : "s"}`
        : null,
    micError,
    onContentChange: setContent,
    onSend: () => void send(),
    onKeyDown,
    onPaste: handlePaste,
    onImageInputChange: handleFileInputChange,
    onDocumentInputChange: handleFileInputChange,
    onDrop: (event) => {
      event.preventDefault();
      setIsDragging(false);
      const files = event.dataTransfer?.files;
      if (files) {
        void uploadFiles(Array.from(files));
      }
    },
    onDragOver: (event) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: () => setIsDragging(false),
    onAttachImageClick: () => {
      document.getElementById(imageFileInputId)?.click();
    },
    onAttachDocumentClick: () => {
      document.getElementById(documentFileInputId)?.click();
    },
    onRemoveAttachment: (index) =>
      setPendingAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index)),
    onVoiceRecorded,
    onAddUrlAttachment,
    imageFileInputId,
    documentFileInputId,
  };

  return {
    messages,
    messagesEmpty: messages.length === 0,
    messagesLoading: messagesQuery.isPending,
    messagesError: messagesQuery.error,
    refetchMessages: messagesQuery.refetch,
    hasOlderMessages,
    isFetchingOlder: messagesQuery.isFetchingNextPage,
    fetchOlderMessages,
    composer,
    voice,
    uploadFiles,
    agentPending,
    isSending,
    lastError,
    clearError,
    scroll,
    liveConnectionState,
  };
}
