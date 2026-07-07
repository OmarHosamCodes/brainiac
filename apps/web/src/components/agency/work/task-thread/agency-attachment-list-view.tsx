import { ExternalLink, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgencyTaskMessageAttachment } from "@/lib/schemas/agency-work";
import {
  getAttachmentIcon,
  getAttachmentUrl,
  isImageAttachment,
  isLinkAttachment,
  type AgencyAttachmentLike,
} from "@/lib/utils/agency-attachment-utils";
import { cn } from "@/lib/utils";

export type AgencyAttachmentListItem = AgencyAttachmentLike & {
  id?: string;
};

type AgencyAttachmentListViewProps = {
  attachments: AgencyAttachmentListItem[];
  className?: string;
  removable?: boolean;
  onRemove?: (index: number) => void;
  onOpen?: (attachment: AgencyTaskMessageAttachment) => void;
};

export function AgencyAttachmentListView({
  attachments,
  className,
  removable = false,
  onRemove,
  onOpen,
}: AgencyAttachmentListViewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {attachments.map((attachment, index) => {
        const Icon = getAttachmentIcon(attachment);
        const url = getAttachmentUrl(attachment);
        const isImage = isImageAttachment(attachment);
        const isLink = isLinkAttachment(attachment);

        return (
          <div
            key={attachment.id ?? `${attachment.fileName}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-default bg-elevated px-3 py-2"
          >
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-default bg-muted">
              {isImage && url ? (
                <img src={url} alt="" className="size-full object-cover" />
              ) : (
                <Icon className="size-5 text-muted" aria-hidden />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-highlighted">
                {attachment.fileName}
              </p>
              <p className="truncate text-xs text-muted">{attachment.mimeType}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {isLink && url ? (
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${attachment.fileName}`}
                  >
                    <ExternalLink />
                  </a>
                </Button>
              ) : onOpen && attachment.id && !isLink ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Open ${attachment.fileName}`}
                  onClick={() => onOpen(attachment as AgencyTaskMessageAttachment)}
                >
                  <ExternalLink />
                </Button>
              ) : url && !isLink ? (
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${attachment.fileName}`}
                  >
                    <ExternalLink />
                  </a>
                </Button>
              ) : null}

              {removable && onRemove ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${attachment.fileName}`}
                  onClick={() => onRemove(index)}
                >
                  <X />
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
