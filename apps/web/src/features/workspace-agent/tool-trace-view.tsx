import type { AgentToolCallEntry } from "@orch/agent";

import { getWorkspaceAgentToolTraceViewModel } from "@/features/workspace-agent/workspace-agent-view-models";
import { cn } from "@/lib/utils";

type WorkspaceAgentToolTraceProps = {
  entry: AgentToolCallEntry;
};

export function WorkspaceAgentToolTraceView({ entry }: WorkspaceAgentToolTraceProps) {
  const viewModel = getWorkspaceAgentToolTraceViewModel(entry);

  if (!viewModel.isStructured) {
    return (
      <div className="rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-xs">
        <span className="font-semibold text-muted-foreground">{viewModel.name}</span>
      </div>
    );
  }

  const isRunning = viewModel.status === "in_progress";

  return (
    <details
      className="rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-xs"
      open={isRunning}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground [&::-webkit-details-marker]:hidden">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            isRunning
              ? "bg-foreground"
              : viewModel.status === "error"
                ? "bg-destructive"
                : "bg-muted-foreground",
          )}
          aria-hidden="true"
        />
        <span className="font-semibold text-foreground">{viewModel.name}</span>
        {viewModel.durationMs !== undefined ? (
          <span className="text-muted-foreground">{viewModel.durationMs}ms</span>
        ) : null}
        {isRunning ? <span className="text-foreground">running</span> : null}
      </summary>
      {viewModel.inputText ? (
        <div className="mt-2 border-t border-border pt-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Input
          </p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-muted-foreground">
            {viewModel.inputText}
          </pre>
        </div>
      ) : null}
      {viewModel.outputText ? (
        <div className="mt-2 border-t border-border pt-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Output
          </p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-foreground">
            {viewModel.outputText}
          </pre>
        </div>
      ) : null}
      {viewModel.error ? (
        <div className="mt-2 border-t border-border pt-2 text-destructive">{viewModel.error}</div>
      ) : null}
    </details>
  );
}

export function WorkspaceAgentToolTraceListView({
  toolsCalled,
}: {
  toolsCalled: AgentToolCallEntry[];
}) {
  if (toolsCalled.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {toolsCalled.map((entry, index) => (
        <WorkspaceAgentToolTraceView
          key={
            typeof entry === "string" ? `${entry}-${index}` : (entry.id ?? `${entry.name}-${index}`)
          }
          entry={entry}
        />
      ))}
    </div>
  );
}
