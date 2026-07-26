import type { AgentToolCallEntry } from "@orch/agent";

export type WorkspaceAgentToolTraceViewModel = {
  name: string;
  inputText: string;
  outputText: string;
  status: "completed" | "error" | "in_progress";
  error: string | null;
  durationMs?: number;
  isStructured: boolean;
};

export function formatWorkspaceAgentTracePayload(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function getWorkspaceAgentToolTraceViewModel(
  entry: AgentToolCallEntry,
): WorkspaceAgentToolTraceViewModel {
  if (typeof entry === "string") {
    return {
      name: entry,
      inputText: "",
      outputText: "",
      status: "completed",
      error: null,
      isStructured: false,
    };
  }

  return {
    name: entry.name,
    inputText: formatWorkspaceAgentTracePayload(entry.input),
    outputText: formatWorkspaceAgentTracePayload(entry.output),
    status: entry.status,
    error: entry.error,
    durationMs: entry.durationMs,
    isStructured: true,
  };
}
