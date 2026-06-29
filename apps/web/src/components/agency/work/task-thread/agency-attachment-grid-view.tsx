import { Expand, ExternalLink, File, FileText, Image, Music, Video } from "lucide-react";

import { AgencyTaskMediaPlayer } from "@/components/agency/agency-task-media-player";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AgencyTaskMessageAttachment } from "@/lib/schemas/agency-work";

type AttachmentMediaKind = "image" | "video" | "audio" | "document" | "archive" | "other";

type AgencyAttachmentGridViewProps = {
  attachments: AgencyTaskMessageAttachment[];
  className?: string;
  viewerAttachment: AgencyTaskMessageAttachment | null;
  onOpenViewer: (attachment: AgencyTaskMessageAttachment) => void;
  onCloseViewer: () => void;
};

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function isVideo(mimeType: string) {
  return mimeType.startsWith("video/");
}

function isAudio(mimeType: string) {
  return mimeType.startsWith("audio/");
}

function getMediaKind(metadata: unknown): AttachmentMediaKind | null {
  if (!metadata || typeof metadata !== "object") return null;
  const mediaKind = (metadata as { mediaKind?: unknown }).mediaKind;
  if (
    mediaKind === "image" ||
    mediaKind === "video" ||
    mediaKind === "audio" ||
    mediaKind === "document" ||
    mediaKind === "archive" ||
    mediaKind === "other"
  ) {
    return mediaKind;
  }
  return null;
}

function isAudioAttachment(attachment: AgencyTaskMessageAttachment) {
  return (
    isAudio(attachment.mimeType) ||
    getMediaKind(attachment.metadata) === "audio" ||
    attachment.durationSeconds != null
  );
}

function fileUrl(attachment: AgencyTaskMessageAttachment): string | null {
  return attachment.url ?? null;
}

function isHls(attachment: AgencyTaskMessageAttachment) {
  const source = fileUrl(attachment)?.toLowerCase().split(/[?#]/, 1)[0] ?? "";
  const mimeType = attachment.mimeType.toLowerCase();

  return (
    source.endsWith(".m3u8") ||
    mimeType === "application/vnd.apple.mpegurl" ||
    mimeType === "application/x-mpegurl"
  );
}

function isPlayableMedia(attachment: AgencyTaskMessageAttachment) {
  return isAudioAttachment(attachment) || isVideo(attachment.mimeType) || isHls(attachment);
}

function isImageOrVideo(attachment: AgencyTaskMessageAttachment) {
  return (
    !isAudioAttachment(attachment) &&
    (isImage(attachment.mimeType) || isVideo(attachment.mimeType) || isHls(attachment))
  );
}

function fileIcon(attachment: AgencyTaskMessageAttachment) {
  if (isImage(attachment.mimeType)) return Image;
  if (isAudioAttachment(attachment)) return Music;
  if (isVideo(attachment.mimeType)) return Video;
  if (attachment.mimeType.includes("pdf")) return FileText;
  return File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AgencyAttachmentGridView({
  attachments,
  className,
  viewerAttachment,
  onOpenViewer,
  onCloseViewer,
}: AgencyAttachmentGridViewProps) {
  return (
    <>
      <div className={["flex flex-wrap gap-2", className].filter(Boolean).join(" ")}>
        {attachments.map((attachment) => {
          const Icon = fileIcon(attachment);
          const url = fileUrl(attachment);

          if (isImage(attachment.mimeType) && url) {
            return (
              <button
                key={attachment.id}
                type="button"
                className="group relative block overflow-hidden rounded-lg border border-default"
                onClick={() => onOpenViewer(attachment)}
              >
                <img
                  src={url}
                  alt={attachment.fileName}
                  className="size-24 object-cover transition-transform group-hover:scale-105"
                />
              </button>
            );
          }

          if (isImage(attachment.mimeType) && !url) {
            return (
              <div
                key={attachment.id}
                className="flex size-24 items-center justify-center rounded-lg border border-default bg-muted"
              >
                <Icon className="size-6 text-muted" />
              </div>
            );
          }

          if (isPlayableMedia(attachment)) {
            return (
              <div key={attachment.id} className="w-full max-w-sm space-y-1.5">
                <AgencyTaskMediaPlayer
                  src={url}
                  mimeType={attachment.mimeType}
                  fileName={attachment.fileName}
                  mediaKind={
                    isAudioAttachment(attachment) ? "audio" : getMediaKind(attachment.metadata)
                  }
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{attachment.fileName}</span>
                    <span className="shrink-0">{formatSize(attachment.sizeBytes)}</span>
                  </span>
                  {isImageOrVideo(attachment) && url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Open in viewer"
                      onClick={() => onOpenViewer(attachment)}
                    >
                      <Expand />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          }

          if (url) {
            return (
              <a
                key={attachment.id}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-default bg-muted px-3 py-2 text-xs hover:bg-elevated"
              >
                <Icon className="size-4 text-muted" />
                <span className="max-w-[8rem] truncate">{attachment.fileName}</span>
                <span className="text-muted">{formatSize(attachment.sizeBytes)}</span>
              </a>
            );
          }

          return (
            <div
              key={attachment.id}
              className="flex items-center gap-2 rounded-lg border border-default bg-muted px-3 py-2 text-xs"
            >
              <Icon className="size-4 text-muted" />
              <span className="max-w-[8rem] truncate">{attachment.fileName}</span>
            </div>
          );
        })}
      </div>

      <Dialog
        open={viewerAttachment !== null}
        onOpenChange={(open) => {
          if (!open) onCloseViewer();
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewerAttachment?.fileName ?? "Attachment"}</DialogTitle>
          </DialogHeader>
          {viewerAttachment ? (
            <div className="flex items-center justify-center p-2">
              {isImage(viewerAttachment.mimeType) && fileUrl(viewerAttachment) ? (
                <img
                  src={fileUrl(viewerAttachment)!}
                  alt={viewerAttachment.fileName}
                  className="max-h-[80vh] max-w-full rounded-lg object-contain"
                />
              ) : isImage(viewerAttachment.mimeType) && !fileUrl(viewerAttachment) ? (
                <div className="flex flex-col items-center gap-2 p-8 text-muted">
                  <Image className="size-8" />
                  <p className="text-sm">Attachment unavailable</p>
                </div>
              ) : isPlayableMedia(viewerAttachment) && fileUrl(viewerAttachment) ? (
                <div className="w-full max-w-xl">
                  <AgencyTaskMediaPlayer
                    src={fileUrl(viewerAttachment)}
                    mimeType={viewerAttachment.mimeType}
                    fileName={viewerAttachment.fileName}
                    mediaKind={
                      isAudioAttachment(viewerAttachment)
                        ? "audio"
                        : getMediaKind(viewerAttachment.metadata)
                    }
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 p-8 text-muted">
                  <File className="size-8" />
                  <p className="text-sm">Attachment unavailable</p>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {viewerAttachment && fileUrl(viewerAttachment) ? (
              <Button variant="ghost" size="sm" asChild>
                <a href={fileUrl(viewerAttachment)!} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Open original
                </a>
              </Button>
            ) : (
              <span />
            )}
            <Button variant="secondary" size="sm" onClick={onCloseViewer}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
