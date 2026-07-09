import { useCallback, useState } from "react";

import type { AgencyTaskMessageAttachment } from "@/features/task-management/agency-work";

type UseAgencyAttachmentGridOptions = {
  attachments: AgencyTaskMessageAttachment[];
};

export function useAgencyAttachmentGrid({ attachments }: UseAgencyAttachmentGridOptions) {
  const [viewerAttachment, setViewerAttachment] = useState<AgencyTaskMessageAttachment | null>(
    null,
  );

  const closeViewer = useCallback(() => setViewerAttachment(null), []);
  const openViewer = useCallback(
    (attachment: AgencyTaskMessageAttachment) => setViewerAttachment(attachment),
    [],
  );

  return {
    attachments,
    viewerAttachment,
    closeViewer,
    openViewer,
  };
}
