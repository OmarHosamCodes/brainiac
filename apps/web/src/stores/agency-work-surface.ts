import { create } from "zustand";

import type { AgencyWorkMobilePane } from "@/lib/schemas/agency-work";

type AgencyWorkSurfaceState = {
  selectedTaskId: string;
  mobilePane: AgencyWorkMobilePane;
  taskRailCollapsed: boolean;
  setSelectedTaskId: (taskId: string) => void;
  setMobilePane: (pane: AgencyWorkMobilePane) => void;
  setTaskRailCollapsed: (collapsed: boolean) => void;
  openTimePane: () => void;
  resetForTeam: () => void;
};

export const useAgencyWorkSurfaceStore = create<AgencyWorkSurfaceState>((set) => ({
  selectedTaskId: "",
  mobilePane: "tasks",
  taskRailCollapsed: true,
  setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),
  setMobilePane: (pane) => set({ mobilePane: pane }),
  setTaskRailCollapsed: (collapsed) => set({ taskRailCollapsed: collapsed }),
  openTimePane: () => set({ selectedTaskId: "", mobilePane: "time" }),
  resetForTeam: () =>
    set({
      selectedTaskId: "",
      mobilePane: "tasks",
    }),
}));
