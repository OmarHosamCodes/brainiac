import { Bot } from "lucide-react";

import { AgencyAttachmentGrid } from "@/components/agency/agency-attachment-grid";
import { AgencyTaskMediaPlayer } from "@/components/agency/agency-task-media-player";
import type { AgencyTaskMessageAttachment } from "@/lib/schemas/agency-work";

function getMediaKind(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const mediaKind = (metadata as { mediaKind?: unknown }).mediaKind;
  return typeof mediaKind === "string" ? mediaKind : null;
}

function isAudioAttachment(attachment: {
  mimeType: string;
  durationSeconds?: number | null;
  metadata?: unknown;
}) {
  return (
    attachment.mimeType.startsWith("audio/") ||
    getMediaKind(attachment.metadata) === "audio" ||
    attachment.durationSeconds != null
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

type AgencyTaskMessageAttachmentsViewProps = {
  attachments: AgencyTaskMessageAttachment[];
  messageType: string;
  content: string | null;
};

export function AgencyTaskMessageAttachmentsView({
  attachments,
  messageType,
  content,
}: AgencyTaskMessageAttachmentsViewProps) {
  const audioAttachments = attachments.filter((a) => isAudioAttachment(a));
  const fileAttachments = attachments.filter((a) => !isAudioAttachment(a));

  return (
    <>
      {messageType === "text" || content ? (
        <div className="mt-1 whitespace-pre-wrap text-sm text-default">{content}</div>
      ) : null}

      {messageType === "voice" || audioAttachments.length > 0 ? (
        <div className="mt-2">
          {audioAttachments.map((attachment) => (
            <AgencyTaskMediaPlayer
              key={attachment.id}
              src={attachment.url ?? undefined}
              mimeType={attachment.mimeType}
              fileName={attachment.fileName}
              mediaKind="audio"
            />
          ))}
        </div>
      ) : null}

      <AgencyAttachmentGrid attachments={fileAttachments} className="mt-2" />
    </>
  );
}

type AgencyTaskThreadMessageViewProps = {
  senderType: "user" | "agent" | "system";
  userName: string;
  createdAt: string;
  showDateDivider: boolean;
  dateLabel: string;
  attachments: AgencyTaskMessageAttachment[];
  messageType: string;
  content: string | null;
};

export function AgencyTaskThreadMessageView({
  senderType,
  userName,
  createdAt,
  showDateDivider,
  dateLabel,
  attachments,
  messageType,
  content,
}: AgencyTaskThreadMessageViewProps) {
  return (
    <div>
      {showDateDivider ? (
        <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted">
          {dateLabel}
        </div>
      ) : null}

      <div
        className={[
          "flex gap-3",
          senderType === "agent" ? "rounded-xl bg-primary/5 p-3" : "",
        ].join(" ")}
      >
        {senderType === "agent" ? (
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bot className="size-4 text-primary" />
          </div>
        ) : (
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted">
            {userName.slice(0, 2)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-highlighted">{userName}</span>
            <span className="text-[11px] text-muted">{formatTime(createdAt)}</span>
          </div>

          <AgencyTaskMessageAttachmentsView
            attachments={attachments}
            messageType={messageType}
            content={content}
          />
        </div>
      </div>
    </div>
  );
}
