import type { AgentToolCallEntry } from "@brainiac/agent";

import { agentChatToolTraceClass } from "@/lib/utils/dashboard-agent-ui";
import { cn } from "@/lib/utils";

type DashboardAgentToolTraceProps = {
  entry: AgentToolCallEntry;
  className?: string;
};

function formatTracePayload(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isStructuredToolCall(
  entry: AgentToolCallEntry,
): entry is Exclude<AgentToolCallEntry, string> {
  return typeof entry === "object" && entry !== null && "name" in entry;
}

export function DashboardAgentToolTrace({ entry, className }: DashboardAgentToolTraceProps) {
  if (!isStructuredToolCall(entry)) {
    return (
      <div className={cn(agentChatToolTraceClass, className)}>
        <span className="font-semibold text-muted">{entry}</span>
      </div>
    );
  }

  const inputText = formatTracePayload(entry.input);
  const outputText = formatTracePayload(entry.output);
  const isRunning = entry.status === "in_progress";

  return (
    <details className={cn(agentChatToolTraceClass, className)} open={isRunning}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted [&::-webkit-details-marker]:hidden">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            isRunning ? "bg-primary" : entry.status === "error" ? "bg-destructive" : "bg-muted",
          )}
          aria-hidden="true"
        />
        <span className="font-semibold text-highlighted">{entry.name}</span>
        {entry.durationMs !== undefined ? (
          <span className="text-muted">{entry.durationMs}ms</span>
        ) : null}
        {isRunning ? <span className="text-primary">running</span> : null}
      </summary>

      {inputText ? (
        <div className="mt-2 border-t border-default pt-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">Input</p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-muted">{inputText}</pre>
        </div>
      ) : null}

      {outputText ? (
        <div className="mt-2 border-t border-default pt-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">Output</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-highlighted">
            {outputText}
          </pre>
        </div>
      ) : null}

      {entry.error ? (
        <div className="mt-2 border-t border-default pt-2 text-destructive">{entry.error}</div>
      ) : null}
    </details>
  );
}

type DashboardAgentToolTraceListProps = {
  toolsCalled: AgentToolCallEntry[];
  className?: string;
};

export function DashboardAgentToolTraceList({
  toolsCalled,
  className,
}: DashboardAgentToolTraceListProps) {
  if (toolsCalled.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {toolsCalled.map((entry, index) => (
        <DashboardAgentToolTrace
          key={
            typeof entry === "string" ? `${entry}-${index}` : (entry.id ?? `${entry.name}-${index}`)
          }
          entry={entry}
        />
      ))}
    </div>
  );
}
