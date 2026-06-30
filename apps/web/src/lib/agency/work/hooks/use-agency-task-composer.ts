import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getRpcBaseUrl } from "@/lib/env";
import { orpcClient } from "@/lib/orpc";
import {
  normalizeAttachmentUrl,
  type AttachmentMetadataLike,
} from "@/lib/utils/agency-attachment-utils";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useAgencyOpsStore } from "@/stores/agency-ops";

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

export type AgencyTaskComposerUploadHandler = (
  files: File[],
  options?: { durationSeconds?: number | null },
) => Promise<void>;

type UseAgencyTaskComposerOptions = {
  teamId: string;
  taskId: string;
  agentEnabled: boolean;
  onSent: () => void;
  onRegisterUploadHandler: (handler: AgencyTaskComposerUploadHandler | null) => void;
};

export type AgencyTaskComposerViewModel = {
  content: string;
  isDragging: boolean;
  isBusy: boolean;
  pendingAttachments: PendingAttachment[];
  agentEnabled: boolean;
  placeholder: string;
  attachmentCountLabel: string | null;
  onContentChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
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

function getComposerPlaceholder(agentEnabled: boolean, hasAttachments: boolean): string {
  if (hasAttachments) {
    return agentEnabled
      ? "Describe what you want to do with these files..."
      : "Add a message...";
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
    try {
      const data = await new Promise<{
        width: number;
        height: number;
        duration: number;
      }>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        const url = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration,
          });
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load video metadata"));
        };
        video.src = url;
      });
      meta.videoWidth = data.width;
      meta.videoHeight = data.height;
      meta.durationSeconds = data.duration;
    } catch {
      // metadata capture failed
    }
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
  return attachments.map((a) => ({
    fileName: a.fileName,
    mimeType: a.mimeType,
    storageKey: a.storageKey,
    sizeBytes: a.sizeBytes,
    durationSeconds: a.durationSeconds ?? undefined,
    uploadToken: a.uploadToken,
    metadata: a.metadata ?? undefined,
  }));
}

export function useAgencyTaskComposer({
  teamId,
  taskId,
  agentEnabled,
  onSent,
  onRegisterUploadHandler,
}: UseAgencyTaskComposerOptions): AgencyTaskComposerViewModel {
  const agencyOps = useAgencyOpsStore();
  const [content, setContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAgentPending, setIsAgentPending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const imageFileInputId = `agency-task-composer-image-${teamId}-${taskId}`;
  const documentFileInputId = `agency-task-composer-document-${teamId}-${taskId}`;

  const isBusy = isSending || isAgentPending;

  const uploadFiles = useCallback(
    async (files: File[], options: { durationSeconds?: number | null } = {}) => {
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
          };

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
        toast.error("Invalid URL", {
          description: "Enter a valid HTTPS link.",
        });
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

  useEffect(() => {
    onRegisterUploadHandler(uploadFiles);
    return () => onRegisterUploadHandler(null);
  }, [onRegisterUploadHandler, uploadFiles]);

  const send = useCallback(async () => {
    const text = content.trim();
    if (!text && pendingAttachments.length === 0) return;

    if (agentEnabled) {
      setIsAgentPending(true);
      try {
        const result = await agencyOps.askTaskAgent({
          teamId,
          taskId,
          content: text || "What do you think?",
          attachments:
            pendingAttachments.length > 0
              ? mapPendingAttachmentsForSend(pendingAttachments)
              : undefined,
        });
        setContent("");
        setPendingAttachments([]);
        onSent();
        if (result) {
          toast("Agent", {
            description: result.response.slice(0, 120),
          });
        }
      } catch (error) {
        toast.error("Agent error", {
          description: getErrorMessage(error, "Try again."),
        });
      } finally {
        setIsAgentPending(false);
      }
      return;
    }

    setIsSending(true);
    try {
      await agencyOps.sendTaskMessage({
        teamId,
        taskId,
        content: text,
        type:
          pendingAttachments.length > 0 &&
          pendingAttachments.every((a) => a.durationSeconds !== null)
            ? "voice"
            : pendingAttachments.length > 0
              ? "attachment"
              : "text",
        attachments:
          pendingAttachments.length > 0 ? mapPendingAttachmentsForSend(pendingAttachments) : undefined,
      });
      setContent("");
      setPendingAttachments([]);
      onSent();
    } catch (error) {
      toast.error("Couldn't send message", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setIsSending(false);
    }
  }, [agencyOps, agentEnabled, content, onSent, pendingAttachments, taskId, teamId]);

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

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      const files = event.dataTransfer?.files;
      if (files) {
        void uploadFiles(Array.from(files));
      }
    },
    [uploadFiles],
  );

  const placeholder = useMemo(
    () => getComposerPlaceholder(agentEnabled, pendingAttachments.length > 0),
    [agentEnabled, pendingAttachments.length],
  );

  const attachmentCountLabel =
    pendingAttachments.length > 0
      ? `${pendingAttachments.length} file${pendingAttachments.length === 1 ? "" : "s"}`
      : null;

  return {
    content,
    isDragging,
    isBusy,
    pendingAttachments,
    agentEnabled,
    placeholder,
    attachmentCountLabel,
    onContentChange: setContent,
    onSend: () => void send(),
    onKeyDown,
    onImageInputChange: handleFileInputChange,
    onDocumentInputChange: handleFileInputChange,
    onDrop,
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
      setPendingAttachments((current) => current.filter((_, i) => i !== index)),
    onVoiceRecorded: (file, durationSeconds) => void uploadFiles([file], { durationSeconds }),
    onAddUrlAttachment,
    imageFileInputId,
    documentFileInputId,
  };
}
