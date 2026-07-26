import type { AgentToolCatalogEntry } from "@orch/agent/types";
import { Loader2 } from "lucide-react";

import { Skeleton } from "@/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

type WorkspaceAgentToolMenuViewProps = {
  tools: AgentToolCatalogEntry[];
  loading: boolean;
};

function formatToolTitle(name: string) {
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function WorkspaceAgentToolMenuView({ tools, loading }: WorkspaceAgentToolMenuViewProps) {
  if (loading && tools.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-44" />
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <p className="p-3 text-sm text-foreground/70">No tools available on this surface.</p>
    );
  }

  return (
    <TooltipProvider delayDuration={280}>
      <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto p-1.5">
        {loading ? (
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground/70">
            <Loader2 className="size-3 animate-spin" />
            Refreshing tools
          </div>
        ) : null}
        {tools.map((tool) => (
          <Tooltip key={tool.name}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground motion-safe:transition-colors motion-safe:duration-150 hover:bg-accent hover:text-accent-foreground"
              >
                {formatToolTitle(tool.name)}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={10}
              className="max-w-64 text-pretty"
              data-workspace-agent-overlay
            >
              {tool.usage}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
