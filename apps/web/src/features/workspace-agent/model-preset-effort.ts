import type { AgentModelPreset, AgentModelTier } from "@orch/agent/types";

export function effortForOutboundPreset(
  tier: AgentModelTier,
  effort: AgentModelPreset["effort"],
): AgentModelPreset["effort"] {
  return tier === "pro" ? effort : undefined;
}
