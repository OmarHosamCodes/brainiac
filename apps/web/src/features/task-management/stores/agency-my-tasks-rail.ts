import { create } from "zustand";

const STORAGE_KEY = "orch.agency.my-tasks-rail.collapsed";

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

type AgencyMyTasksRailStore = {
  collapsed: boolean;
  hydrated: boolean;
  hydrate: () => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
};

export const useAgencyMyTasksRailStore = create<AgencyMyTasksRailStore>((set, get) => ({
  collapsed: false,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ collapsed: readCollapsed(), hydrated: true });
  },
  setCollapsed: (collapsed) => {
    set({ collapsed });
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // ponytail: local preference only; ignore quota / private mode
    }
  },
  toggleCollapsed: () => {
    get().setCollapsed(!get().collapsed);
  },
}));
