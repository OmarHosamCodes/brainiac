import type { AgencyTaskMessageAttachment } from "@/features/task-management/agency-work";
import type { AgencyAttachmentVariant } from "@/features/task-management/agency-attachment-utils";
import { selectAttachmentVariant } from "@/features/task-management/agency-attachment-utils";
import { useAgencyAttachmentGrid } from "@/features/task-management/hooks/use-agency-attachment-grid";

import { AgencyAttachmentsView } from "@/features/task-management/task-thread/agency-attachments-view";

type AgencyAttachmentGridProps = {
  attachments: AgencyTaskMessageAttachment[];
  className?: string;
  variant?: AgencyAttachmentVariant;
};

export function AgencyAttachmentGrid({
  attachments,
  className,
  variant,
}: AgencyAttachmentGridProps) {
  const vm = useAgencyAttachmentGrid({ attachments });
  const resolvedVariant = variant ?? selectAttachmentVariant(attachments, "message");

  return (
    <AgencyAttachmentsView
      attachments={vm.attachments}
      variant={resolvedVariant}
      className={className}
      viewerAttachment={vm.viewerAttachment}
      onOpenViewer={vm.openViewer}
      onCloseViewer={vm.closeViewer}
    />
  );
}
