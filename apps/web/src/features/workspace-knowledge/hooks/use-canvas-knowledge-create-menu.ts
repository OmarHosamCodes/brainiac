import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import type { CanvasKnowledgeCreateMenuViewProps } from "@/features/workspace-knowledge/canvas-knowledge-create-menu-view";
import { useWorkspaceKnowledgeStore } from "@/features/workspace-knowledge/stores/workspace-knowledge";
import type { KnowledgeCreateKind } from "@/features/workspace-knowledge/knowledge-create";
import { orpc } from "@/lib/orpc";

export function useCanvasKnowledgeCreateMenu(input: {
  teamId?: string | null;
  onCreateDocument: (point: { x: number; y: number }) => void;
}): CanvasKnowledgeCreateMenuViewProps {
  const createMenuPoint = useWorkspaceKnowledgeStore((state) => state.createMenuPoint);
  const openCreateMenuAt = useWorkspaceKnowledgeStore((state) => state.openCreateMenuAt);
  const requestCreateKind = useWorkspaceKnowledgeStore((state) => state.requestCreateKind);
  const openUnplacedDialog = useWorkspaceKnowledgeStore((state) => state.openUnplacedDialog);
  const setPendingPlacement = useWorkspaceKnowledgeStore((state) => state.setPendingPlacement);
  const teamId = input.teamId ?? undefined;

  const boardQuery = useQuery({
    ...orpc.workspace.knowledge.board.queryOptions({ input: { teamId } }),
  });

  const onSelect = useCallback(
    (kind: KnowledgeCreateKind) => {
      if (createMenuPoint) {
        setPendingPlacement({ x: createMenuPoint.x, y: createMenuPoint.y });
      }
      if (kind === "document" && createMenuPoint) {
        input.onCreateDocument({ x: createMenuPoint.x, y: createMenuPoint.y });
        setPendingPlacement(null);
        openCreateMenuAt(null);
        return;
      }
      requestCreateKind(kind);
      openCreateMenuAt(null);
    },
    [createMenuPoint, input, openCreateMenuAt, requestCreateKind, setPendingPlacement],
  );

  const onOpenUnplaced = useCallback(() => {
    if (createMenuPoint) {
      setPendingPlacement({ x: createMenuPoint.x, y: createMenuPoint.y });
    }
    openUnplacedDialog();
    openCreateMenuAt(null);
  }, [createMenuPoint, openCreateMenuAt, openUnplacedDialog, setPendingPlacement]);

  return {
    open: Boolean(createMenuPoint),
    x: createMenuPoint?.screenX ?? 0,
    y: createMenuPoint?.screenY ?? 0,
    unplacedCount: boardQuery.data?.unplaced.length ?? 0,
    onClose: () => openCreateMenuAt(null),
    onSelect,
    onOpenUnplaced,
  };
}
