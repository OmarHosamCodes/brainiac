import { create } from "zustand";

export type CanvasViewState = {
  translateX: number;
  translateY: number;
  scale: number;
};

export type DashboardStore = {
  // Canvas state
  viewState: CanvasViewState;
  setViewState: (state: CanvasViewState) => void;
  setCanvasTranslate: (x: number, y: number) => void;
  setCanvasScale: (scale: number) => void;
  resetCanvasView: () => void;

  // Selection state
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;

  // UI state
  isAgentDockOpen: boolean;
  setAgentDockOpen: (open: boolean) => void;

  // Modal/Dialog state
  showTeamSettingsModal: boolean;
  setShowTeamSettingsModal: (show: boolean) => void;

  // Reset
  reset: () => void;
};

const DEFAULT_CANVAS_VIEW: CanvasViewState = {
  translateX: 0,
  translateY: 0,
  scale: 1,
};

export const useDashboard = create<DashboardStore>((set) => ({
  // Canvas state
  viewState: DEFAULT_CANVAS_VIEW,

  setViewState: (state) => set({ viewState: state }),

  setCanvasTranslate: (x, y) =>
    set((state) => ({
      viewState: {
        ...state.viewState,
        translateX: x,
        translateY: y,
      },
    })),

  setCanvasScale: (scale) =>
    set((state) => ({
      viewState: {
        ...state.viewState,
        scale,
      },
    })),

  resetCanvasView: () => set({ viewState: DEFAULT_CANVAS_VIEW }),

  // Selection state
  selectedNodeId: null,
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),

  // UI state
  isAgentDockOpen: false,
  setAgentDockOpen: (open) => set({ isAgentDockOpen: open }),

  // Modal/Dialog state
  showTeamSettingsModal: false,
  setShowTeamSettingsModal: (show) => set({ showTeamSettingsModal: show }),

  // Reset
  reset: () => {
    set({
      viewState: DEFAULT_CANVAS_VIEW,
      selectedNodeId: null,
      isAgentDockOpen: false,
      showTeamSettingsModal: false,
    });
  },
}));

// For backward compatibility
export const useDashboardStore = useDashboard;
