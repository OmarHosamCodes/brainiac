import { AgencyAttachmentGrid } from "@/components/agency/agency-attachment-grid";
import { AgencyTaskMediaPlayer } from "@/components/agency/agency-task-media-player";
import type { AgencyTaskMessageAttachment } from "@/lib/schemas/agency-work";
import {
  getAttachmentUrl,
  isAudioAttachment,
  selectAttachmentVariant,
} from "@/lib/utils/agency-attachment-utils";

type TaskThreadMessageBodyProps = {
  attachments: AgencyTaskMessageAttachment[];
  messageType: string;
  content: string | null;
};

export function TaskThreadMessageBody({
  attachments,
  messageType,
  content,
}: TaskThreadMessageBodyProps) {
  const audioAttachments = attachments.filter((attachment) => isAudioAttachment(attachment));
  const fileAttachments = attachments.filter((attachment) => !isAudioAttachment(attachment));
  const attachmentVariant = selectAttachmentVariant(fileAttachments, "message");

  return (
    <>
      {messageType === "text" || content ? (
        <div className="mt-1 whitespace-pre-wrap text-sm text-default">{content}</div>
      ) : null}

      {messageType === "voice" || audioAttachments.length > 0 ? (
        <div className="mt-2 space-y-2">
          {audioAttachments.map((attachment) => (
            <AgencyTaskMediaPlayer
              key={attachment.id}
              src={getAttachmentUrl(attachment) ?? undefined}
              mimeType={attachment.mimeType}
              fileName={attachment.fileName}
              mediaKind="audio"
            />
          ))}
        </div>
      ) : null}

      {fileAttachments.length > 0 ? (
        <AgencyAttachmentGrid
          attachments={fileAttachments}
          className="mt-2"
          variant={attachmentVariant}
        />
      ) : null}
    </>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

type TaskThreadUserMessageProps = {
  userName: string;
  createdAt: string;
  attachments: AgencyTaskMessageAttachment[];
  messageType: string;
  content: string | null;
  isOptimistic?: boolean;
};

export function TaskThreadUserMessage({
  userName,
  createdAt,
  attachments,
  messageType,
  content,
  isOptimistic = false,
}: TaskThreadUserMessageProps) {
  return (
    <div className={isOptimistic ? "opacity-70" : undefined}>
      <div className="flex gap-3">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted">
          {userName.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-highlighted">{userName}</span>
            <span className="text-[11px] text-muted">{formatTime(createdAt)}</span>
          </div>
          <TaskThreadMessageBody
            attachments={attachments}
            messageType={messageType}
            content={content}
          />
        </div>
      </div>
    </div>
  );
}
