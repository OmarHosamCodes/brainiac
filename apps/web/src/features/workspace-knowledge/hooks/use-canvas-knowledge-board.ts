import type { KnowledgeAction } from "@orch/agent/knowledge-actions";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CanvasNodeModel } from "@/features/workspace/canvas/canvas-types";
import {
  findFolderDropTarget,
  isDocumentBoardCard,
  mergeCanvasBoard,
  shouldPersistKnowledgeGeometry,
} from "@/features/workspace-knowledge/board-cards";
import { useWorkspaceKnowledgeStore } from "@/features/workspace-knowledge/stores/workspace-knowledge";
import { orpc } from "@/lib/orpc";

type Geometry = Pick<CanvasNodeModel, "x" | "y" | "width" | "height">;

export function useCanvasKnowledgeBoard(input: {
  documents: CanvasNodeModel[];
  teamId?: string | null;
}): {
  cards: CanvasNodeModel[];
  isLoading: boolean;
  captureError: string | null;
  syncGeometry: (nextNodes: CanvasNodeModel[]) => void;
  removeCard: (nodeId: string) => Promise<void>;
} {
  const teamId = input.teamId ?? undefined;
  const captureKnowledge = useWorkspaceKnowledgeStore((state) => state.captureKnowledge);
  const captureError = useWorkspaceKnowledgeStore((state) => state.captureError);
  const [overlay, setOverlay] = useState<Record<string, Geometry>>({});
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingGeometry = useRef<CanvasNodeModel[]>([]);
  const cardsRef = useRef<CanvasNodeModel[]>([]);
  const overlayRef = useRef<Record<string, Geometry>>({});

  const boardQuery = useQuery({
    ...orpc.workspace.knowledge.board.queryOptions({ input: { teamId } }),
  });

  const cards = useMemo(() => {
    const merged = mergeCanvasBoard(input.documents, boardQuery.data?.items ?? []);
    if (Object.keys(overlay).length === 0) return merged;
    return merged.map((card) => {
      const next = overlay[card.id];
      return next ? { ...card, ...next } : card;
    });
  }, [boardQuery.data?.items, input.documents, overlay]);
  cardsRef.current = cards;
  overlayRef.current = overlay;

  const persistGeometry = useCallback(
    async (nodes: CanvasNodeModel[]) => {
      const boardById = new Map(cardsRef.current.map((card) => [card.id, card]));
      for (const node of nodes) {
        boardById.set(node.id, node);
      }
      const board = [...boardById.values()];
      for (const node of nodes) {
        if (!shouldPersistKnowledgeGeometry(board, node.id)) continue;
        const action: KnowledgeAction = {
          type: "placement.upsert",
          objectId: node.id,
          objectType: node.objectType,
          teamId: teamId ?? null,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        };
        await captureKnowledge({ action, teamId, silent: true });
        const folderId = findFolderDropTarget(board, node.id);
        if (folderId && node.parentId !== folderId) {
          await captureKnowledge({
            action: {
              type: "relation.create",
              fromObjectId: node.id,
              to: { objectType: "folder", id: folderId },
              relationType: "in",
            },
            teamId,
            silent: true,
          });
        }
      }
    },
    [captureKnowledge, teamId],
  );

  const syncGeometry = useCallback(
    (nextNodes: CanvasNodeModel[]) => {
      const currentById = new Map(cardsRef.current.map((node) => [node.id, node]));
      const changed: CanvasNodeModel[] = [];
      const nextOverlay = { ...overlayRef.current };
      for (const node of nextNodes) {
        if (isDocumentBoardCard(node) || node.kind === "inbox") continue;
        const current = currentById.get(node.id);
        if (
          current &&
          current.x === node.x &&
          current.y === node.y &&
          current.width === node.width &&
          current.height === node.height
        ) {
          continue;
        }
        nextOverlay[node.id] = {
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        };
        changed.push(node);
      }
      if (changed.length === 0) return;
      overlayRef.current = nextOverlay;
      setOverlay(nextOverlay);
      pendingGeometry.current = changed;
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        void persistGeometry(pendingGeometry.current);
      }, 400);
    },
    [persistGeometry],
  );

  useEffect(() => {
    if (persistTimer.current) return;
    if (Object.keys(overlayRef.current).length === 0) return;
    overlayRef.current = {};
    setOverlay({});
  }, [boardQuery.dataUpdatedAt]);

  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  const removeCard = useCallback(
    async (nodeId: string) => {
      const card = cards.find((node) => node.id === nodeId);
      if (!card || isDocumentBoardCard(card) || card.kind === "inbox" || card.kind === "agency") {
        return;
      }
      await captureKnowledge({
        action: { type: "object.delete", objectId: nodeId, objectType: card.objectType },
        teamId,
      });
    },
    [captureKnowledge, cards, teamId],
  );

  return {
    cards,
    isLoading: boardQuery.isPending,
    captureError,
    syncGeometry,
    removeCard,
  };
}
