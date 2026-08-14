import { useCallback, useState } from "react";

import { useWorkspaceKnowledgeStore } from "@/features/workspace-knowledge/stores/workspace-knowledge";
import type { CanvasKnowledgeQuickAddViewProps } from "@/features/workspace-knowledge/canvas-knowledge-quick-add-view";

export function useCanvasKnowledgeQuickAdd(input: {
  teamId?: string | null;
}): CanvasKnowledgeQuickAddViewProps {
  const [title, setTitle] = useState("");
  const captureKnowledge = useWorkspaceKnowledgeStore((state) => state.captureKnowledge);
  const capturePending = useWorkspaceKnowledgeStore((state) => state.capturePending);
  const captureError = useWorkspaceKnowledgeStore((state) => state.captureError);

  const onSubmit = useCallback(() => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    void captureKnowledge({
      action: {
        type: "object.create",
        objectType: "note",
        title: nextTitle,
        visibility: "private",
      },
      teamId: input.teamId,
    })
      .then((result) => {
        if (result.status === "applied" || result.status === "pending") setTitle("");
      })
      .catch(() => undefined);
  }, [captureKnowledge, input.teamId, title]);

  return {
    title,
    pending: capturePending,
    error: captureError,
    pendingLabel: capturePending ? "Saving note…" : null,
    onTitleChange: setTitle,
    onSubmit,
  };
}
