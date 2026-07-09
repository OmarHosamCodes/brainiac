import { AgencyAttachmentGrid } from "@/features/task-management/task-thread/agency-attachment-grid";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencyTaskMediaPlayer } from "@/features/task-management/task-thread/agency-task-media-player";
import type { AgencyTaskMessageAttachment } from "@/features/task-management/agency-work";
import {
  getAttachmentUrl,
  isAudioAttachment,
  selectAttachmentVariant,
} from "@/features/task-management/agency-attachment-utils";

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
        <div className="mt-1 whitespace-pre-wrap text-sm text-foreground">{content}</div>
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
  userAvatar: string | null;
  createdAt: string;
  attachments: AgencyTaskMessageAttachment[];
  messageType: string;
  content: string | null;
  isOptimistic?: boolean;
};

export function TaskThreadUserMessage({
  userName,
  userAvatar,
  createdAt,
  attachments,
  messageType,
  content,
  isOptimistic = false,
}: TaskThreadUserMessageProps) {
  return (
    <div className={isOptimistic ? "opacity-70" : undefined}>
      <div className="flex gap-3">
        <AgencyMemberAvatar
          name={userName}
          avatarUrl={userAvatar}
          size="sm"
          className="size-6 rounded-full"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-foreground">{userName}</span>
            <span className="text-[11px] text-muted-foreground">{formatTime(createdAt)}</span>
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
