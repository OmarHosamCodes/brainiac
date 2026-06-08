import { useDashboardStore } from "@/stores/dashboard";
import { useShallow } from "zustand/react/shallow";

/**
 * Hook for dashboard UI state management.
 * Provides access to canvas view, agent dock, and modals.
 */
export function useDashboard() {
  const {
    viewState,
    setViewState,
    setCanvasTranslate,
    setCanvasScale,
    resetCanvasView,
    isAgentDockOpen,
    setAgentDockOpen,
    showTeamSettingsModal,
    setShowTeamSettingsModal,
    reset,
  } = useDashboardStore(
    useShallow((state) => ({
      viewState: state.viewState,
      setViewState: state.setViewState,
      setCanvasTranslate: state.setCanvasTranslate,
      setCanvasScale: state.setCanvasScale,
      resetCanvasView: state.resetCanvasView,
      isAgentDockOpen: state.isAgentDockOpen,
      setAgentDockOpen: state.setAgentDockOpen,
      showTeamSettingsModal: state.showTeamSettingsModal,
      setShowTeamSettingsModal: state.setShowTeamSettingsModal,
      reset: state.reset,
    })),
  );

  return {
    // Canvas
    canvasViewState: viewState,
    setCanvasViewState: setViewState,
    setCanvasTranslate,
    setCanvasScale,
    resetCanvasView,

    // Agent dock
    isAgentDockOpen,
    setAgentDockOpen,

    // Modals
    showTeamSettingsModal,
    setShowTeamSettingsModal,

    // Reset
    reset,
  };
}
