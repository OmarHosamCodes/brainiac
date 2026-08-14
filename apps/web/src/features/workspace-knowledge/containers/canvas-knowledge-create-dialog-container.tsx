import { useCanvasKnowledgeCreate } from "@/features/workspace-knowledge/hooks/use-canvas-knowledge-create";
import { CanvasKnowledgeCreateDialogView } from "@/features/workspace-knowledge/canvas-knowledge-create-dialog-view";

type CanvasKnowledgeCreateDialogContainerProps = {
  teamId?: string | null;
  resolveBoardPoint: () => { x: number; y: number } | null;
  onCreateDocument: (point?: { x: number; y: number }) => void;
};

export function CanvasKnowledgeCreateDialogContainer({
  teamId,
  resolveBoardPoint,
  onCreateDocument,
}: CanvasKnowledgeCreateDialogContainerProps) {
  const view = useCanvasKnowledgeCreate({ teamId, resolveBoardPoint, onCreateDocument });
  return <CanvasKnowledgeCreateDialogView {...view} />;
}
