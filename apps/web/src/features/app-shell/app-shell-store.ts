import { create } from "zustand";

import { type AppShellMode, resolveShellMode } from "@/features/app-shell/app-navigation";

const DEFAULT_AGENT_DOCK_WIDTH = 384;
const MIN_AGENT_DOCK_WIDTH = 320;
const MAX_AGENT_DOCK_WIDTH = 640;
const RAIL_PINNED_STORAGE_KEY = "orch.appShell.railPinned";

export function clampAgentDockWidth(width: number) {
  return Math.min(MAX_AGENT_DOCK_WIDTH, Math.max(MIN_AGENT_DOCK_WIDTH, Math.round(width)));
}

function readRailPinned(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(RAIL_PINNED_STORAGE_KEY) === "1";
}

type AppShellState = {
  agentDockOpen: boolean;
  agentDockWidth: number;
  commandPaletteOpen: boolean;
  railPinned: boolean;
  customDockOwnerCount: number;
  currentPath: string;
  setAgentDockOpen: (open: boolean) => void;
  toggleAgentDock: () => void;
  setAgentDockWidth: (width: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setRailPinned: (pinned: boolean) => void;
  toggleRailPinned: () => void;
  acquireCustomDock: () => void;
  releaseCustomDock: () => void;
  setCurrentPath: (path: string) => void;
};

export const useAppShellStore = create<AppShellState>((set, get) => ({
  agentDockOpen: false,
  agentDockWidth: DEFAULT_AGENT_DOCK_WIDTH,
  commandPaletteOpen: false,
  railPinned: readRailPinned(),
  customDockOwnerCount: 0,
  currentPath: "/",
  setAgentDockOpen: (open) => set({ agentDockOpen: open }),
  toggleAgentDock: () => set({ agentDockOpen: !get().agentDockOpen }),
  setAgentDockWidth: (width) => set({ agentDockWidth: clampAgentDockWidth(width) }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set({ commandPaletteOpen: !get().commandPaletteOpen }),
  setRailPinned: (pinned) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(RAIL_PINNED_STORAGE_KEY, pinned ? "1" : "0");
    }
    set({ railPinned: pinned });
  },
  toggleRailPinned: () => get().setRailPinned(!get().railPinned),
  acquireCustomDock: () => set({ customDockOwnerCount: get().customDockOwnerCount + 1 }),
  releaseCustomDock: () =>
    set({ customDockOwnerCount: Math.max(0, get().customDockOwnerCount - 1) }),
  setCurrentPath: (path) => set({ currentPath: path }),
}));

export function useShellMode(): AppShellMode {
  return resolveShellMode(useAppShellStore((s) => s.currentPath));
}

export function useHasCustomDockContent(): boolean {
  return useAppShellStore((s) => s.customDockOwnerCount > 0);
}
