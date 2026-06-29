import type { AgencyTaskMessageAttachment } from "@/lib/schemas/agency-work";
import { useAgencyAttachmentGrid } from "@/lib/agency/work/hooks/use-agency-attachment-grid";

import { AgencyAttachmentGridView } from "@/components/agency/work/task-thread/agency-attachment-grid-view";

type AgencyAttachmentGridProps = {
  attachments: AgencyTaskMessageAttachment[];
  className?: string;
};

export function AgencyAttachmentGrid({ attachments, className }: AgencyAttachmentGridProps) {
  const vm = useAgencyAttachmentGrid({ attachments });

  return (
    <AgencyAttachmentGridView
      attachments={vm.attachments}
      className={className}
      viewerAttachment={vm.viewerAttachment}
      onOpenViewer={vm.openViewer}
      onCloseViewer={vm.closeViewer}
    />
  );
}
