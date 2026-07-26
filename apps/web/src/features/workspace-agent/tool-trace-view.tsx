import type { AgentToolCall, AgentToolCallEntry } from "@orch/agent/types";
import { Wrench } from "lucide-react";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { getWorkspaceAgentToolTraceViewModel } from "@/features/workspace-agent/workspace-agent-view-models";
import { Marker, MarkerContent, MarkerIcon } from "@/ui/marker";

type WorkspaceAgentToolTraceProps = {
  entry: AgentToolCallEntry;
};

function toolStateFromCall(tool: AgentToolCall) {
  switch (tool.status) {
    case "in_progress":
      return "input-available" as const;
    case "error":
      return "output-error" as const;
    case "completed":
      return "output-available" as const;
    default: {
      const _exhaustive: never = tool.status;
      return _exhaustive;
    }
  }
}

export function WorkspaceAgentToolTraceView({ entry }: WorkspaceAgentToolTraceProps) {
  const viewModel = getWorkspaceAgentToolTraceViewModel(entry);

  if (!viewModel.isStructured || typeof entry === "string") {
    return (
      <Marker>
        <MarkerIcon>
          <Wrench className="size-3.5" />
        </MarkerIcon>
        <MarkerContent className="font-mono text-xs">{viewModel.name}</MarkerContent>
      </Marker>
    );
  }

  const state = toolStateFromCall(entry);

  return (
    <Tool defaultOpen={entry.status === "in_progress"}>
      <ToolHeader title={entry.name} type={`tool-${entry.name}`} state={state} />
      <ToolContent>
        {entry.input != null ? <ToolInput input={entry.input} /> : null}
        {entry.status === "error" ? (
          <ToolOutput output={undefined} errorText={entry.error ?? "Tool failed"} />
        ) : entry.output != null ? (
          <ToolOutput output={entry.output} errorText={undefined} />
        ) : null}
      </ToolContent>
    </Tool>
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
