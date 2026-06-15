import { create } from "zustand";

import { type AppShellMode, resolveShellMode } from "@/lib/utils/app-navigation";

const DEFAULT_AGENT_DOCK_WIDTH = 384;
const MIN_AGENT_DOCK_WIDTH = 320;
const MAX_AGENT_DOCK_WIDTH = 640;

export function clampAgentDockWidth(width: number) {
  return Math.min(MAX_AGENT_DOCK_WIDTH, Math.max(MIN_AGENT_DOCK_WIDTH, Math.round(width)));
}

type AppShellState = {
  agentDockOpen: boolean;
  agentDockWidth: number;
  pageTitle: string | null;
  customDockOwnerCount: number;
  contextOwnerCount: number;
  actionsOwnerCount: number;
  currentPath: string;
  setAgentDockOpen: (open: boolean) => void;
  toggleAgentDock: () => void;
  setAgentDockWidth: (width: number) => void;
  setPageTitle: (title: string | null) => void;
  acquireCustomDock: () => void;
  releaseCustomDock: () => void;
  acquireContextSlot: () => void;
  releaseContextSlot: () => void;
  acquireActionsSlot: () => void;
  releaseActionsSlot: () => void;
  setCurrentPath: (path: string) => void;
};

export const useAppShellStore = create<AppShellState>((set, get) => ({
  agentDockOpen: false,
  agentDockWidth: DEFAULT_AGENT_DOCK_WIDTH,
  pageTitle: null,
  customDockOwnerCount: 0,
  contextOwnerCount: 0,
  actionsOwnerCount: 0,
  currentPath: "/",
  setAgentDockOpen: (open) => set({ agentDockOpen: open }),
  toggleAgentDock: () => set({ agentDockOpen: !get().agentDockOpen }),
  setAgentDockWidth: (width) => set({ agentDockWidth: clampAgentDockWidth(width) }),
  setPageTitle: (title) => set({ pageTitle: title }),
  acquireCustomDock: () => set({ customDockOwnerCount: get().customDockOwnerCount + 1 }),
  releaseCustomDock: () =>
    set({ customDockOwnerCount: Math.max(0, get().customDockOwnerCount - 1) }),
  acquireContextSlot: () => set({ contextOwnerCount: get().contextOwnerCount + 1 }),
  releaseContextSlot: () => set({ contextOwnerCount: Math.max(0, get().contextOwnerCount - 1) }),
  acquireActionsSlot: () => set({ actionsOwnerCount: get().actionsOwnerCount + 1 }),
  releaseActionsSlot: () => set({ actionsOwnerCount: Math.max(0, get().actionsOwnerCount - 1) }),
  setCurrentPath: (path) => set({ currentPath: path }),
}));

export function useShellMode(): AppShellMode {
  return resolveShellMode(useAppShellStore((s) => s.currentPath));
}

export function useHasCustomDockContent(): boolean {
  return useAppShellStore((s) => s.customDockOwnerCount > 0);
}

export function useHasContextContent(): boolean {
  return useAppShellStore((s) => s.contextOwnerCount > 0);
}
