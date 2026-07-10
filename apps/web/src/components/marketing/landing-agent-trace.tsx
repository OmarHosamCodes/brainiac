import { DashboardAgentToolTraceList } from "@/features/dashboard-agent/agent-chat/dashboard-agent-tool-trace";
import { marketingAgentToolTraces } from "@/components/marketing/marketing-demo-data";
import { agentChatMessageAssistantClass } from "@/features/dashboard-agent/dashboard-agent-ui";
import { cn } from "@/lib/utils";

export function LandingAgentTrace({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-full rounded-2xl border border-default bg-elevated p-4",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[11px] font-semibold text-muted">Agent</span>
        <time className="text-[11px] text-muted" dateTime="2026-06-15T14:32:00.000Z">
          2:32 PM
        </time>
      </div>

      <div className={cn(agentChatMessageAssistantClass, "min-w-0 overflow-x-auto")}>
        <p className="text-sm text-highlighted">
          I read the launch node, added a checklist block, and I am searching the workspace for
          agency time sync references.
        </p>
        <DashboardAgentToolTraceList toolsCalled={marketingAgentToolTraces} />
      </div>
    </div>
  );
}
