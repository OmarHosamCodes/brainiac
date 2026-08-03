import { create } from "zustand";

import { type AppShellMode, resolveShellMode } from "@/features/app-shell/app-navigation";

const RAIL_PINNED_STORAGE_KEY = "orch.appShell.railPinned";

function readRailPinned(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(RAIL_PINNED_STORAGE_KEY) === "1";
}

type AppShellState = {
  commandPaletteOpen: boolean;
  railPinned: boolean;
  /** Agency Management drill-in: full rail shows Back + panes (URL stays on management). */
  managementNavOpen: boolean;
  currentPath: string;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setRailPinned: (pinned: boolean) => void;
  toggleRailPinned: () => void;
  setManagementNavOpen: (open: boolean) => void;
  setCurrentPath: (path: string) => void;
};

export const useAppShellStore = create<AppShellState>((set, get) => ({
  commandPaletteOpen: false,
  railPinned: readRailPinned(),
  managementNavOpen: false,
  currentPath: "/",
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set({ commandPaletteOpen: !get().commandPaletteOpen }),
  setRailPinned: (pinned) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(RAIL_PINNED_STORAGE_KEY, pinned ? "1" : "0");
    }
    set({ railPinned: pinned });
  },
  toggleRailPinned: () => get().setRailPinned(!get().railPinned),
  setManagementNavOpen: (open) => set({ managementNavOpen: open }),
  setCurrentPath: (path) => set({ currentPath: path }),
}));

export function useShellMode(): AppShellMode {
  return resolveShellMode(useAppShellStore((s) => s.currentPath));
}
