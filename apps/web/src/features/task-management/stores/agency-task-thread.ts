import { create } from "zustand";

type AgencyTaskThreadState = {
  agentEnabled: boolean;
  isDraggingFile: boolean;
  setAgentEnabled: (enabled: boolean) => void;
  setIsDraggingFile: (dragging: boolean) => void;
  reset: () => void;
};

export const useAgencyTaskThreadStore = create<AgencyTaskThreadState>((set) => ({
  agentEnabled: false,
  isDraggingFile: false,
  setAgentEnabled: (enabled) => set({ agentEnabled: enabled }),
  setIsDraggingFile: (dragging) => set({ isDraggingFile: dragging }),
  reset: () => set({ agentEnabled: false, isDraggingFile: false }),
}));
