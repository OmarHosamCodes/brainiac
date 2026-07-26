import type { AgentScopeRef } from "@orch/agent";

const SCOPE_ATTR = "data-agent-scope";
const SCOPE_KIND_ATTR = "data-agent-scope-kind";
const SCOPE_ID_ATTR = "data-agent-scope-id";
const SCOPE_LABEL_ATTR = "data-agent-scope-label";

export type AgentScopeableKind = AgentScopeRef["kind"];

export const agentScopeAttributeNames = {
  scope: SCOPE_ATTR,
  kind: SCOPE_KIND_ATTR,
  id: SCOPE_ID_ATTR,
  label: SCOPE_LABEL_ATTR,
} as const;

export function agentScopeableProps(args: { kind: AgentScopeableKind; id: string; label: string }) {
  return {
    [SCOPE_ATTR]: "",
    [SCOPE_KIND_ATTR]: args.kind,
    [SCOPE_ID_ATTR]: args.id,
    [SCOPE_LABEL_ATTR]: args.label,
  } as const;
}

export function parseAgentScopeTarget(element: Element | null): AgentScopeRef | null {
  const target = element?.closest(`[${SCOPE_ATTR}]`);
  if (!target) return null;

  const kind = target.getAttribute(SCOPE_KIND_ATTR) as AgentScopeableKind | null;
  const id = target.getAttribute(SCOPE_ID_ATTR);
  const label = target.getAttribute(SCOPE_LABEL_ATTR);
  if (!kind || !id || !label) return null;

  return { kind, id, label };
}
