import type { AgentScopeRef } from "@orch/agent";

import { Badge } from "@/ui/badge";

type WorkspaceAgentScopeChipViewProps = {
  chips: AgentScopeRef[];
  onRemove: (id: string) => void;
};

function chipPrefix(kind: AgentScopeRef["kind"]) {
  switch (kind) {
    case "node":
      return "Node";
    case "tab":
      return "Tab";
    case "block":
      return "Block";
    case "timeEntry":
      return "Entry";
    case "project":
      return "Project";
    case "member":
      return "Member";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function WorkspaceAgentScopeChipView({ chips, onRemove }: WorkspaceAgentScopeChipViewProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-3">
      {chips.map((chip) => (
        <Badge key={`${chip.kind}-${chip.id}`} variant="secondary" className="rounded-full">
          {chipPrefix(chip.kind)} - {chip.label}
          <button
            type="button"
            className="ml-1 rounded-full px-0.5 hover:text-destructive"
            aria-label={`Remove ${chip.label} from scope`}
            onClick={() => onRemove(chip.id)}
          >
            ×
          </button>
        </Badge>
      ))}
    </div>
  );
}
