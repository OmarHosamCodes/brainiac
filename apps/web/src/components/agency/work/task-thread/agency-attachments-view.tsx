import type { AgencyTaskMessageAttachment } from "@/lib/schemas/agency-work";
import type { AgencyAttachmentVariant } from "@/lib/utils/agency-attachment-utils";

import { AgencyAttachmentGridView } from "@/components/agency/work/task-thread/agency-attachment-grid-view";
import { AgencyAttachmentInlineView } from "@/components/agency/work/task-thread/agency-attachment-inline-view";
import { AgencyAttachmentListView } from "@/components/agency/work/task-thread/agency-attachment-list-view";
import { AgencyAttachmentViewerDialog } from "@/components/agency/work/task-thread/agency-attachment-grid-view";
import { AgencyTaskMediaPlayer } from "@/components/agency/agency-task-media-player";
import {
  getAttachmentUrl,
  isAudioAttachment,
  isVideoAttachment,
} from "@/lib/utils/agency-attachment-utils";

type AgencyAttachmentsViewProps = {
  attachments: AgencyTaskMessageAttachment[];
  variant: AgencyAttachmentVariant;
  className?: string;
  viewerAttachment: AgencyTaskMessageAttachment | null;
  onOpenViewer: (attachment: AgencyTaskMessageAttachment) => void;
  onCloseViewer: () => void;
};

export function AgencyAttachmentsView({
  attachments,
  variant,
  className,
  viewerAttachment,
  onOpenViewer,
  onCloseViewer,
}: AgencyAttachmentsViewProps) {
  const audioAttachments = attachments.filter((a) => isAudioAttachment(a));
  const videoAttachments = attachments.filter(
    (a) => isVideoAttachment(a) && !isAudioAttachment(a),
  );
  const fileAttachments = attachments.filter(
    (a) => !isAudioAttachment(a) && !isVideoAttachment(a),
  );

  return (
    <>
      {audioAttachments.map((attachment) => (
        <div key={attachment.id} className={className}>
          <AgencyTaskMediaPlayer
            src={getAttachmentUrl(attachment) ?? undefined}
            mimeType={attachment.mimeType}
            fileName={attachment.fileName}
            mediaKind="audio"
          />
        </div>
      ))}

      {videoAttachments.map((attachment) => (
        <div key={attachment.id} className={className}>
          <AgencyTaskMediaPlayer
            src={getAttachmentUrl(attachment) ?? undefined}
            mimeType={attachment.mimeType}
            fileName={attachment.fileName}
            mediaKind="video"
          />
        </div>
      ))}

      {fileAttachments.length > 0 ? (
        variant === "grid" ? (
          <AgencyAttachmentGridView
            attachments={fileAttachments}
            className={className}
            viewerAttachment={viewerAttachment}
            onOpenViewer={onOpenViewer}
            onCloseViewer={onCloseViewer}
          />
        ) : variant === "list" ? (
          <>
            <AgencyAttachmentListView
              attachments={fileAttachments}
              className={className}
              onOpen={onOpenViewer}
            />
            <AgencyAttachmentViewerDialog attachment={viewerAttachment} onClose={onCloseViewer} />
          </>
        ) : (
          <>
            <AgencyAttachmentInlineView
              attachments={fileAttachments}
              className={className}
              onOpen={onOpenViewer}
            />
            <AgencyAttachmentViewerDialog attachment={viewerAttachment} onClose={onCloseViewer} />
          </>
        )
      ) : null}
    </>
  );
}
