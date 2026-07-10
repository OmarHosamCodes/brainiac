import type { AgentToolCallEntry } from "@brainiac/agent";

export type DashboardAgentToolTraceViewModel = {
  name: string;
  inputText: string;
  outputText: string;
  status: "completed" | "error" | "in_progress";
  error: string | null;
  durationMs?: number;
  isStructured: boolean;
};

export function formatDashboardAgentTracePayload(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function getDashboardAgentToolTraceViewModel(
  entry: AgentToolCallEntry,
): DashboardAgentToolTraceViewModel {
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
    inputText: formatDashboardAgentTracePayload(entry.input),
    outputText: formatDashboardAgentTracePayload(entry.output),
    status: entry.status,
    error: entry.error,
    durationMs: entry.durationMs,
    isStructured: true,
  };
}
