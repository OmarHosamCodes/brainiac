import { useCanvasKnowledgeCreateMenu } from "@/features/workspace-knowledge/hooks/use-canvas-knowledge-create-menu";
import { CanvasKnowledgeCreateMenuView } from "@/features/workspace-knowledge/canvas-knowledge-create-menu-view";

type CanvasKnowledgeCreateMenuContainerProps = {
  teamId?: string | null;
  onCreateDocument: (point: { x: number; y: number }) => void;
};

export function CanvasKnowledgeCreateMenuContainer({
  teamId,
  onCreateDocument,
}: CanvasKnowledgeCreateMenuContainerProps) {
  const view = useCanvasKnowledgeCreateMenu({ teamId, onCreateDocument });
  return <CanvasKnowledgeCreateMenuView {...view} />;
}
