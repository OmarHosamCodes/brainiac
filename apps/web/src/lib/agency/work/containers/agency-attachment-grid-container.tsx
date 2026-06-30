import type { AgencyTaskMessageAttachment } from "@/lib/schemas/agency-work";
import type { AgencyAttachmentVariant } from "@/lib/utils/agency-attachment-utils";
import { selectAttachmentVariant } from "@/lib/utils/agency-attachment-utils";
import { useAgencyAttachmentGrid } from "@/lib/agency/work/hooks/use-agency-attachment-grid";

import { AgencyAttachmentsView } from "@/components/agency/work/task-thread/agency-attachments-view";

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
