import { useTeamStore } from "@/stores/team";
import { useShallow } from "zustand/react/shallow";

/**
 * Hook for team selection and management.
 */
export function useTeamSelection() {
  const {
    selectedTeamId,
    setSelectedTeamId,
    teams,
    setTeams,
    teamMembers,
    setTeamMembers,
    addTeam,
    updateTeam,
    removeTeam,
    addTeamMember,
    removeTeamMember,
    reset,
  } = useTeamStore(
    useShallow((state) => ({
      selectedTeamId: state.selectedTeamId,
      setSelectedTeamId: state.setSelectedTeamId,
      teams: state.teams,
      setTeams: state.setTeams,
      teamMembers: state.teamMembers,
      setTeamMembers: state.setTeamMembers,
      addTeam: state.addTeam,
      updateTeam: state.updateTeam,
      removeTeam: state.removeTeam,
      addTeamMember: state.addTeamMember,
      removeTeamMember: state.removeTeamMember,
      reset: state.reset,
    })),
  );

  return {
    // State
    selectedTeamId,
    teams,
    teamMembers,

    // Actions
    setSelectedTeamId,
    setTeams,
    setTeamMembers,
    addTeam,
    updateTeam,
    removeTeam,
    addTeamMember,
    removeTeamMember,
    reset,

    // Computed
    selectedTeam: teams.find((t) => t.id === selectedTeamId) ?? null,
    selectedTeamMembers: selectedTeamId ? teamMembers[selectedTeamId] ?? [] : [],
  };
}
