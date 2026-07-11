import { Expand, ExternalLink, File, Image } from "lucide-react";
import { cn } from "@/lib/utils";

import { AgencyTaskMediaPlayer } from "@/features/task-management/task-thread/agency-task-media-player";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import type { AgencyTaskMessageAttachment } from "@/features/task-management/agency-work";
import {
  getAttachmentUrl,
  isAudioAttachment,
  isImageAttachment,
  isVideoAttachment,
} from "@/features/task-management/agency-attachment-utils";

type AgencyAttachmentViewerDialogProps = {
  attachment: AgencyTaskMessageAttachment | null;
  onClose: () => void;
};

function isHls(attachment: AgencyTaskMessageAttachment) {
  const source = getAttachmentUrl(attachment)?.toLowerCase().split(/[?#]/, 1)[0] ?? "";
  const mimeType = attachment.mimeType.toLowerCase();

  return (
    source.endsWith(".m3u8") ||
    mimeType === "application/vnd.apple.mpegurl" ||
    mimeType === "application/x-mpegurl"
  );
}

function isPlayableMedia(attachment: AgencyTaskMessageAttachment) {
  return isAudioAttachment(attachment) || isVideoAttachment(attachment) || isHls(attachment);
}

export function AgencyAttachmentViewerDialog({
  attachment,
  onClose,
}: AgencyAttachmentViewerDialogProps) {
  const url = attachment ? getAttachmentUrl(attachment) : null;

  return (
    <Dialog
      open={attachment !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{attachment?.fileName ?? "Attachment"}</DialogTitle>
        </DialogHeader>
        {attachment ? (
          <div className="flex items-center justify-center p-2">
            {isImageAttachment(attachment) && url ? (
              <img
                src={url}
                alt={attachment.fileName}
                className="max-h-[80vh] max-w-full rounded-lg object-contain"
              />
            ) : isImageAttachment(attachment) && !url ? (
              <div className="flex flex-col items-center gap-2 p-8 text-muted">
                <Image className="size-8" />
                <p className="text-sm">Attachment unavailable</p>
              </div>
            ) : isPlayableMedia(attachment) && url ? (
              <div className="w-full max-w-xl">
                <AgencyTaskMediaPlayer
                  src={url}
                  mimeType={attachment.mimeType}
                  fileName={attachment.fileName}
                  mediaKind={isAudioAttachment(attachment) ? "audio" : "video"}
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
          {attachment && url ? (
            <Button variant="ghost" size="sm" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink />
                Open original
              </a>
            </Button>
          ) : (
            <span />
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AgencyAttachmentGridViewProps = {
  attachments: AgencyTaskMessageAttachment[];
  className?: string;
  viewerAttachment: AgencyTaskMessageAttachment | null;
  onOpenViewer: (attachment: AgencyTaskMessageAttachment) => void;
  onCloseViewer: () => void;
};

export function AgencyAttachmentGridView({
  attachments,
  className,
  viewerAttachment,
  onOpenViewer,
  onCloseViewer,
}: AgencyAttachmentGridViewProps) {
  const imageAttachments = attachments.filter((a) => isImageAttachment(a));

  if (imageAttachments.length === 0) return null;

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {imageAttachments.map((attachment) => {
          const url = getAttachmentUrl(attachment);

          if (url) {
            return (
              <button
                key={attachment.id}
                type="button"
                className="group relative block overflow-hidden rounded-lg border border-default"
                aria-label={`Open ${attachment.fileName}`}
                onClick={() => onOpenViewer(attachment)}
              >
                <img
                  src={url}
                  alt={attachment.fileName}
                  className="size-24 object-cover motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-[1.02] motion-reduce:transition-none"
                />
              </button>
            );
          }

          return (
            <div
              key={attachment.id}
              className="flex size-24 items-center justify-center rounded-lg border border-default bg-muted"
            >
              <Image className="size-6 text-muted" />
            </div>
          );
        })}
      </div>

      <AgencyAttachmentViewerDialog attachment={viewerAttachment} onClose={onCloseViewer} />
    </>
  );
}

// Keep expand helper exported for mixed layouts that show video with expand
export function AgencyAttachmentExpandButton({
  attachment,
  onOpen,
}: {
  attachment: AgencyTaskMessageAttachment;
  onOpen: (attachment: AgencyTaskMessageAttachment) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Open in viewer"
      onClick={() => onOpen(attachment)}
    >
      <Expand />
    </Button>
  );
}
