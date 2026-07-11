import { X } from "lucide-react";

import {
  formatAttachmentSize,
  getAttachmentIcon,
  getAttachmentMediaKind,
  getAttachmentUrl,
  isImageAttachment,
  type AgencyAttachmentLike,
} from "@/features/task-management/agency-attachment-utils";
import { cn } from "@/lib/utils";

export type AgencyAttachmentChipViewProps = {
  attachment: AgencyAttachmentLike;
  removable?: boolean;
  onRemove?: () => void;
  onOpen?: () => void;
  className?: string;
};

export function AgencyAttachmentChipView({
  attachment,
  removable = false,
  onRemove,
  onOpen,
  className,
}: AgencyAttachmentChipViewProps) {
  const Icon = getAttachmentIcon(attachment);
  const url = getAttachmentUrl(attachment);
  const sizeLabel = formatAttachmentSize(attachment.sizeBytes);
  const isImage = isImageAttachment(attachment);
  const mediaKind = getAttachmentMediaKind(attachment);

  const content = (
    <>
      {isImage && url ? (
        <img src={url} alt="" className="size-5 shrink-0 rounded object-cover" aria-hidden />
      ) : (
        <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
      )}
      <span className="min-w-0 truncate">{attachment.fileName}</span>
      {sizeLabel ? <span className="shrink-0 text-muted">{sizeLabel}</span> : null}
      {removable && onRemove ? (
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-muted hover:text-highlighted"
          aria-label={`Remove ${attachment.fileName}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </>
  );

  const chipClass = cn(
    "inline-flex max-w-full items-center gap-1.5 rounded-full border border-default bg-elevated px-2 py-1 text-xs font-medium text-highlighted",
    onOpen && "cursor-pointer transition-colors hover:bg-default",
    className,
  );

  if (onOpen) {
    return (
      <button type="button" className={chipClass} onClick={onOpen}>
        {content}
      </button>
    );
  }

  if (mediaKind === "link" && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={cn(chipClass, "hover:bg-default")}>
        {content}
      </a>
    );
  }

  return <span className={chipClass}>{content}</span>;
}
