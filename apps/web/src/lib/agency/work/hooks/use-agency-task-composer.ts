import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getRpcBaseUrl } from "@/lib/env";
import { orpc } from "@/lib/orpc";
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
  metadata?: {
    imageWidth?: number;
    imageHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
    durationSeconds?: number;
    fileExtension?: string;
    lastModified?: string;
    mediaKind?: "image" | "video" | "audio" | "document" | "archive" | "other";
  };
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
  onContentChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onAttachClick: () => void;
  onRemoveAttachment: (index: number) => void;
  onVoiceRecorded: (file: File, durationSeconds: number) => void;
  fileInputId: string;
};

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
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const fileInputId = `agency-task-composer-file-${teamId}-${taskId}`;

  const askAgentMutation = useMutation(
    orpc.agencyOps.taskAgent.ask.mutationOptions({
      onSuccess: (result) => {
        setContent("");
        setPendingAttachments([]);
        onSent();
        toast("Agent", {
          description: result.response.slice(0, 120),
        });
      },
      onError: (error) => {
        toast.error("Agent error", {
          description: getErrorMessage(error, "Try again."),
        });
      },
    }),
  );

  const isBusy = isSending || askAgentMutation.isPending;

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

  useEffect(() => {
    onRegisterUploadHandler(uploadFiles);
    return () => onRegisterUploadHandler(null);
  }, [onRegisterUploadHandler, uploadFiles]);

  const send = useCallback(async () => {
    const text = content.trim();
    if (!text && pendingAttachments.length === 0) return;

    if (agentEnabled) {
      await askAgentMutation.mutateAsync({
        teamId,
        taskId,
        content: text || "What do you think?",
        attachments:
          pendingAttachments.length > 0
            ? pendingAttachments.map((a) => ({
                fileName: a.fileName,
                mimeType: a.mimeType,
                storageKey: a.storageKey,
                sizeBytes: a.sizeBytes,
                durationSeconds: a.durationSeconds ?? undefined,
                uploadToken: a.uploadToken,
                metadata: a.metadata,
              }))
            : undefined,
      });
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
          pendingAttachments.length > 0
            ? pendingAttachments.map((a) => ({
                fileName: a.fileName,
                mimeType: a.mimeType,
                storageKey: a.storageKey,
                sizeBytes: a.sizeBytes,
                durationSeconds: a.durationSeconds ?? undefined,
                uploadToken: a.uploadToken,
                metadata: a.metadata,
              }))
            : undefined,
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
  }, [agencyOps, agentEnabled, askAgentMutation, content, onSent, pendingAttachments, taskId, teamId]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void send();
      }
    },
    [send],
  );

  const onFileInputChange = useCallback(
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

  return {
    content,
    isDragging,
    isBusy,
    pendingAttachments,
    agentEnabled,
    onContentChange: setContent,
    onSend: () => void send(),
    onKeyDown,
    onFileInputChange,
    onDrop,
    onDragOver: (event) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: () => setIsDragging(false),
    onAttachClick: () => {
      document.getElementById(fileInputId)?.click();
    },
    onRemoveAttachment: (index) =>
      setPendingAttachments((current) => current.filter((_, i) => i !== index)),
    onVoiceRecorded: (file, durationSeconds) => void uploadFiles([file], { durationSeconds }),
    fileInputId,
  };
}
