import { useCanvasKnowledgeQuickAdd } from "@/features/workspace-knowledge/hooks/use-canvas-knowledge-quick-add";
import { CanvasKnowledgeQuickAddView } from "@/features/workspace-knowledge/canvas-knowledge-quick-add-view";

type CanvasKnowledgeQuickAddContainerProps = {
  teamId?: string | null;
};

export function CanvasKnowledgeQuickAddContainer({ teamId }: CanvasKnowledgeQuickAddContainerProps) {
  const view = useCanvasKnowledgeQuickAdd({ teamId });
  return <CanvasKnowledgeQuickAddView {...view} />;
}
