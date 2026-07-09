import type { AgencyTaskMessageAttachment } from "@/features/task-management/agency-work";
import type { AgencyAttachmentLike } from "@/features/task-management/agency-attachment-utils";

import { AgencyAttachmentChipView } from "@/features/task-management/task-thread/agency-attachment-chip-view";
import { cn } from "@/lib/utils";

export type AgencyAttachmentInlineItem = AgencyAttachmentLike & {
  id?: string;
  storageKey?: string;
};

type AgencyAttachmentInlineViewProps = {
  attachments: AgencyAttachmentInlineItem[];
  className?: string;
  removable?: boolean;
  onRemove?: (index: number) => void;
  onOpen?: (attachment: AgencyTaskMessageAttachment) => void;
};

export function AgencyAttachmentInlineView({
  attachments,
  className,
  removable = false,
  onRemove,
  onOpen,
}: AgencyAttachmentInlineViewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {attachments.map((attachment, index) => (
        <AgencyAttachmentChipView
          key={attachment.id ?? attachment.storageKey ?? `${attachment.fileName}-${index}`}
          attachment={attachment}
          removable={removable}
          onRemove={onRemove ? () => onRemove(index) : undefined}
          onOpen={
            onOpen && attachment.id
              ? () => onOpen(attachment as AgencyTaskMessageAttachment)
              : undefined
          }
        />
      ))}
    </div>
  );
}
