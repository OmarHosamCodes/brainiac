import type { AgentScopeRef } from "@orch/agent/types";
import { create } from "zustand";

type WorkspaceAgentUiState = {
  expanded: boolean;
  scopeModeActive: boolean;
  scopeHintSeen: boolean;
  draft: string;
  scopeChips: AgentScopeRef[];
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  setScopeModeActive: (active: boolean) => void;
  toggleScopeMode: () => void;
  markScopeHintSeen: () => void;
  setDraft: (draft: string) => void;
  addScopeChip: (chip: AgentScopeRef) => void;
  removeScopeChip: (id: string) => void;
  clearScopeChips: () => void;
};

const SCOPE_HINT_KEY = "orch:agent-scope-hint-seen";

function readScopeHintSeen() {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(SCOPE_HINT_KEY) === "1";
}

export const useWorkspaceAgentStore = create<WorkspaceAgentUiState>((set, get) => ({
  expanded: false,
  scopeModeActive: false,
  scopeHintSeen: readScopeHintSeen(),
  draft: "",
  scopeChips: [],
  setExpanded: (expanded) =>
    set({
      expanded,
      scopeModeActive: expanded ? get().scopeModeActive : false,
    }),
  toggleExpanded: () => get().setExpanded(!get().expanded),
  setScopeModeActive: (active) => set({ scopeModeActive: active }),
  toggleScopeMode: () => {
    const next = !get().scopeModeActive;
    set({
      scopeModeActive: next,
      expanded: next ? true : get().expanded,
    });
  },
  markScopeHintSeen: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SCOPE_HINT_KEY, "1");
    }
    set({ scopeHintSeen: true });
  },
  setDraft: (draft) => set({ draft }),
  addScopeChip: (chip) =>
    set((state) =>
      state.scopeChips.some((entry) => entry.kind === chip.kind && entry.id === chip.id)
        ? state
        : { scopeChips: [...state.scopeChips, chip] },
    ),
  removeScopeChip: (id) =>
    set((state) => ({
      scopeChips: state.scopeChips.filter((chip) => chip.id !== id),
    })),
  clearScopeChips: () => set({ scopeChips: [] }),
}));
