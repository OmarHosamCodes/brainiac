import { KnowledgeObjectPageContainer } from "@/features/workspace-knowledge/containers/knowledge-object-page-container";
import { AppShellPage } from "@/features/app-shell/app-shell-page";

export function WorkspaceObjectPage() {
  return (
    <AppShellPage>
      <KnowledgeObjectPageContainer />
    </AppShellPage>
  );
}
