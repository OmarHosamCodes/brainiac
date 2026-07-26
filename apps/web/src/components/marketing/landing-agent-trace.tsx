import { marketingAgentToolTraces } from "@/components/marketing/marketing-demo-data";
import { WorkspaceAgentToolTraceListView } from "@/features/workspace-agent/tool-trace-view";
import { cn } from "@/lib/utils";

export function LandingAgentTrace({ className }: { className?: string }) {
  return (
    <div
      className={cn("min-w-0 max-w-full rounded-2xl border border-border bg-card p-4", className)}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[11px] font-semibold text-muted-foreground">Agent</span>
        <time className="text-[11px] text-muted-foreground" dateTime="2026-06-15T14:32:00.000Z">
          2:32 PM
        </time>
      </div>

      <div className="mr-4 min-w-0 overflow-x-auto rounded-xl border border-default bg-muted/20 px-3 py-2 text-sm text-highlighted">
        <p className="text-sm text-foreground">
          I read the launch node, added a checklist block, and I am searching the workspace for
          agency time sync references.
        </p>
        <WorkspaceAgentToolTraceListView toolsCalled={marketingAgentToolTraces} />
      </div>
    </div>
  );
}
