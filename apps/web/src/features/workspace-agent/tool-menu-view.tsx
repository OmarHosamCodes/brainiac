import type { AgentToolCatalogEntry } from "@orch/agent";
import { Loader2 } from "lucide-react";

import { Skeleton } from "@/ui/skeleton";

type WorkspaceAgentToolMenuViewProps = {
  tools: AgentToolCatalogEntry[];
  loading: boolean;
};

export function WorkspaceAgentToolMenuView({ tools, loading }: WorkspaceAgentToolMenuViewProps) {
  if (loading && tools.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  if (tools.length === 0) {
    return <p className="p-3 text-sm text-muted-foreground">No tools available on this surface.</p>;
  }

  return (
    <div className="flex max-h-64 flex-col gap-1 overflow-y-auto p-2">
      {loading ? (
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Refreshing tools
        </div>
      ) : null}
      {tools.map((tool) => (
        <div key={tool.name} className="rounded-lg px-2 py-1.5">
          <p className="font-mono text-xs font-semibold text-foreground">{tool.name}</p>
          <p className="text-xs text-muted-foreground">{tool.usage}</p>
        </div>
      ))}
    </div>
  );
}
