import { create } from "zustand";

export type CanvasViewState = {
  translateX: number;
  translateY: number;
  scale: number;
};

export type DashboardStore = {
  // Canvas state
  canvasViewState: CanvasViewState;
  setCanvasViewState: (state: CanvasViewState) => void;
  setCanvasTranslate: (x: number, y: number) => void;
  setCanvasScale: (scale: number) => void;
  resetCanvasView: () => void;

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

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Canvas state
  canvasViewState: DEFAULT_CANVAS_VIEW,

  setCanvasViewState: (state) => set({ canvasViewState: state }),

  setCanvasTranslate: (x, y) =>
    set((state) => ({
      canvasViewState: {
        ...state.canvasViewState,
        translateX: x,
        translateY: y,
      },
    })),

  setCanvasScale: (scale) =>
    set((state) => ({
      canvasViewState: {
        ...state.canvasViewState,
        scale,
      },
    })),

  resetCanvasView: () => set({ canvasViewState: DEFAULT_CANVAS_VIEW }),

  // UI state
  isAgentDockOpen: false,
  setAgentDockOpen: (open) => set({ isAgentDockOpen: open }),

  // Modal/Dialog state
  showTeamSettingsModal: false,
  setShowTeamSettingsModal: (show) => set({ showTeamSettingsModal: show }),

  // Reset
  reset: () => {
    set({
      canvasViewState: DEFAULT_CANVAS_VIEW,
      isAgentDockOpen: false,
      showTeamSettingsModal: false,
    });
  },
}));
