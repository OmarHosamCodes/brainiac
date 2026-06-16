import { useMutation } from "@tanstack/react-query";
import { Bot, Paperclip, Send, X } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";

import { AgencyVoiceRecorder } from "@/components/agency/agency-voice-recorder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useAgencyOpsStore } from "@/stores/agency-ops";

type AgencyTaskComposerProps = {
  teamId: string;
  taskId: string;
  agentEnabled: boolean;
  onSent: () => void;
};

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

export type AgencyTaskComposerHandle = {
  uploadFiles: (files: File[], options?: { durationSeconds?: number | null }) => Promise<void>;
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

export const AgencyTaskComposer = forwardRef<AgencyTaskComposerHandle, AgencyTaskComposerProps>(
  function AgencyTaskComposer({ teamId, taskId, agentEnabled, onSent }, ref) {
    const agencyOps = useAgencyOpsStore();
    const [content, setContent] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    const createAttachmentMutation = useMutation(
      orpc.agencyOps.taskThreads.attachments.create.mutationOptions(),
    );

    const isBusy = isSending || askAgentMutation.isPending;

    async function uploadFiles(
      files: File[],
      options: { durationSeconds?: number | null } = {},
    ) {
      for (const file of files) {
        try {
          const metadata = await captureFileMetadata(file);
          if (options.durationSeconds != null) {
            metadata.durationSeconds = options.durationSeconds;
            metadata.mediaKind = "audio";
          }

          const result = await createAttachmentMutation.mutateAsync({
            teamId,
            taskId,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          });

          const uploadResponse = await fetch(result.uploadUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
          });

          if (!uploadResponse.ok) {
            throw new Error("Upload failed");
          }

          setPendingAttachments((current) => [
            ...current,
            {
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              storageKey: result.storageKey,
              sizeBytes: file.size,
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
    }

    useImperativeHandle(ref, () => ({ uploadFiles }), [teamId, taskId]);

    async function send() {
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
    }

    function onKeydown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void send();
      }
    }

    function onFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
      const files = event.target.files;
      if (files) {
        void uploadFiles(Array.from(files));
      }
      event.target.value = "";
    }

    function onDrop(event: React.DragEvent) {
      event.preventDefault();
      setIsDragging(false);
      const files = event.dataTransfer?.files;
      if (files) {
        void uploadFiles(Array.from(files));
      }
    }

    return (
      <div
        className={[
          "relative rounded-xl border border-default bg-muted/30 p-2 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "",
        ].join(" ")}
        onDrop={onDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
      >
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={agentEnabled ? "Ask the agent about this task..." : "Write a message..."}
          rows={1}
          className="min-h-8 w-full resize-none"
          disabled={isBusy}
          onKeyDown={onKeydown}
        />

        {pendingAttachments.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {pendingAttachments.map((attachment, index) => (
              <Badge key={attachment.storageKey} variant="secondary" className="max-w-full gap-1">
                <span className="truncate">{attachment.fileName}</span>
                <button
                  type="button"
                  className="text-muted hover:text-highlighted"
                  onClick={() =>
                    setPendingAttachments((current) => current.filter((_, i) => i !== index))
                  }
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={onFileSelect}
            />
            <AgencyVoiceRecorder
              disabled={isBusy}
              onRecorded={(file, durationSeconds) => void uploadFiles([file], { durationSeconds })}
            />
          </div>

          <Button
            size="sm"
            disabled={(!content.trim() && pendingAttachments.length === 0) || isBusy}
            onClick={() => void send()}
          >
            {agentEnabled ? <Bot /> : <Send />}
            {agentEnabled ? "Ask" : "Send"}
          </Button>
        </div>
      </div>
    );
  },
);
