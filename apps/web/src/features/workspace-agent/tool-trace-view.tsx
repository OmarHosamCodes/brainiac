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
      <div className="rounded-lg border border-default bg-default px-2.5 py-2 font-mono text-xs">
        <span className="font-semibold text-muted">{viewModel.name}</span>
      </div>
    );
  }

  const isRunning = viewModel.status === "in_progress";

  return (
    <details
      className="rounded-lg border border-default bg-default px-2.5 py-2 font-mono text-xs"
      open={isRunning}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted [&::-webkit-details-marker]:hidden">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            isRunning ? "bg-primary" : viewModel.status === "error" ? "bg-destructive" : "bg-muted",
          )}
          aria-hidden="true"
        />
        <span className="font-semibold text-highlighted">{viewModel.name}</span>
        {viewModel.durationMs !== undefined ? (
          <span className="text-muted">{viewModel.durationMs}ms</span>
        ) : null}
        {isRunning ? <span className="text-primary">running</span> : null}
      </summary>
      {viewModel.inputText ? (
        <div className="mt-2 border-t border-default pt-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">Input</p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-muted">
            {viewModel.inputText}
          </pre>
        </div>
      ) : null}
      {viewModel.outputText ? (
        <div className="mt-2 border-t border-default pt-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">Output</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-highlighted">
            {viewModel.outputText}
          </pre>
        </div>
      ) : null}
      {viewModel.error ? (
        <div className="mt-2 border-t border-default pt-2 text-destructive">{viewModel.error}</div>
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
