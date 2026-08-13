import type { AgentScopeRef } from "@orch/agent/types";
import { useEffect } from "react";

import { agentScopeAttributeNames, parseAgentScopeTarget } from "@/features/shared/agent-scopeable";
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";

export function useAgentScopeModeListener(onPickChip?: (chip: AgentScopeRef) => void) {
  const scopeModeActive = useWorkspaceAgentStore((s) => s.scopeModeActive);
  const addScopeChip = useWorkspaceAgentStore((s) => s.addScopeChip);
  const pickChip = onPickChip ?? addScopeChip;
  const setScopeModeActive = useWorkspaceAgentStore((s) => s.setScopeModeActive);
  const markScopeHintSeen = useWorkspaceAgentStore((s) => s.markScopeHintSeen);

  useEffect(() => {
    if (!scopeModeActive) return;

    document.documentElement.dataset.agentScopeMode = "true";
    const scopeAttr = agentScopeAttributeNames.scope;

    function onPointerOver(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const scoped = target.closest(`[${scopeAttr}]`);
      document
        .querySelectorAll(`[${scopeAttr}][data-agent-scope-hover]`)
        .forEach((node) => node.removeAttribute("data-agent-scope-hover"));
      if (scoped) {
        scoped.setAttribute("data-agent-scope-hover", "true");
      }
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-workspace-agent-root]")) return;

      const chip = parseAgentScopeTarget(target);
      if (!chip) return;

      event.preventDefault();
      event.stopPropagation();
      pickChip(chip);
      markScopeHintSeen();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setScopeModeActive(false);
        return;
      }

      if (event.key !== "Enter" && event.key !== "Tab") return;

      const focused = document.activeElement;
      const chip = parseAgentScopeTarget(focused instanceof Element ? focused : null);
      if (!chip) return;

      if (event.key === "Enter") {
        event.preventDefault();
        pickChip(chip);
        markScopeHintSeen();
      }
    }

    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      delete document.documentElement.dataset.agentScopeMode;
      document
        .querySelectorAll(`[${scopeAttr}][data-agent-scope-hover]`)
        .forEach((node) => node.removeAttribute("data-agent-scope-hover"));
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [markScopeHintSeen, pickChip, scopeModeActive, setScopeModeActive]);
}
