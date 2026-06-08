import { useDashboardStore } from "@/stores/dashboard";
import { useShallow } from "zustand/react/shallow";

/**
 * Hook for dashboard UI state management.
 * Provides access to canvas view, agent dock, and modals.
 */
export function useDashboard() {
  const {
    canvasViewState,
    setCanvasViewState,
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
      canvasViewState: state.canvasViewState,
      setCanvasViewState: state.setCanvasViewState,
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
    canvasViewState,
    setCanvasViewState,
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
