import type { AgentModelPreset } from "./types";

export function resolveOpenRouterReasoning(preset: AgentModelPreset | null | undefined) {
  if (!preset || preset.tier !== "pro") return undefined;
  if (!preset.effort) return undefined;
  return { effort: preset.effort };
}
