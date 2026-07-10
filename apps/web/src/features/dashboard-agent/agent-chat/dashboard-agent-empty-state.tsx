import { agentChatEmptyPanelClass } from "@/features/dashboard-agent/dashboard-agent-ui";
import { cn } from "@/lib/utils";

type DashboardAgentEmptyStateProps = {
  scopeKind: "nodes" | "blocks";
  promptSuggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
};

export function DashboardAgentEmptyState({
  scopeKind,
  promptSuggestions,
  onSelectSuggestion,
}: DashboardAgentEmptyStateProps) {
  return (
    <div className={cn(agentChatEmptyPanelClass, "text-left")}>
      <p className="text-sm font-semibold text-highlighted">
        {scopeKind === "blocks" ? "Ask about blocks in scope" : "Ask about your workspace"}
      </p>
      <p className="mt-1 text-sm text-muted">
        The agent can read nodes, run tools, and update your canvas. Tool calls appear as plain
        traces below each reply.
      </p>
      <div className="mt-4 space-y-2">
        {promptSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="block w-full rounded-xl border border-default px-3 py-2 text-left text-sm text-muted transition-colors hover:border-primary/30 hover:bg-muted/30 hover:text-highlighted"
            onClick={() => onSelectSuggestion(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
