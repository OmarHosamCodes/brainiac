import type { AgentScopeRef, DashboardAgentToolPreset } from "@orch/agent/types";

export function nodeChipPlanSeed(input: {
  toolPreset: DashboardAgentToolPreset;
  draft: string;
  chip: AgentScopeRef;
}): string | null {
  if (input.toolPreset !== "plan") return null;
  if (input.chip.kind !== "node") return null;
  if (input.draft.trim().length > 0) return null;
  return `Draft a plan to patch “${input.chip.label}” (${input.chip.id}). Use draft_canvas_plan plus ui_present workspaceBlock or workspaceNode. Do not create a new node.`;
}
