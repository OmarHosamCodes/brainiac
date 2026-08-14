import { useKnowledgeObjectPage } from "@/features/workspace-knowledge/hooks/use-knowledge-object-page";
import { KnowledgeObjectPageView } from "@/features/workspace-knowledge/knowledge-object-page-view";

export function KnowledgeObjectPageContainer() {
  const view = useKnowledgeObjectPage();
  return <KnowledgeObjectPageView {...view} />;
}
