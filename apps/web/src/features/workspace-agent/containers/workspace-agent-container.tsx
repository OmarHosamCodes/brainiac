import { useWorkspaceAgent } from "@/features/workspace-agent/hooks/use-workspace-agent";
import { WorkspaceAgentView } from "@/features/workspace-agent/workspace-agent-view";

export function WorkspaceAgentContainer() {
  const view = useWorkspaceAgent();
  return <WorkspaceAgentView view={view} />;
}
