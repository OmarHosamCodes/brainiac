import { create } from "zustand";

export type Team = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamMember = {
  id: string;
  teamId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: "owner" | "member";
  createdAt: string;
  updatedAt: string;
};

export type TeamStore = {
  // State
  selectedTeamId: string | null;
  teams: Team[];
  teamMembers: Record<string, TeamMember[]>;

  // Actions
  setSelectedTeamId: (teamId: string | null) => void;
  setTeams: (teams: Team[]) => void;
  setTeamMembers: (teamId: string, members: TeamMember[]) => void;
  addTeam: (team: Team) => void;
  updateTeam: (team: Team) => void;
  removeTeam: (teamId: string) => void;
  addTeamMember: (teamId: string, member: TeamMember) => void;
  removeTeamMember: (teamId: string, memberId: string) => void;
  reset: () => void;
};

export const useTeamStore = create<TeamStore>((set, _get) => ({
  // Initial state
  selectedTeamId: null,
  teams: [],
  teamMembers: {},

  // Actions
  setSelectedTeamId: (teamId) => set({ selectedTeamId: teamId }),

  setTeams: (teams) => set({ teams }),

  setTeamMembers: (teamId, members) => {
    set((state) => ({
      teamMembers: {
        ...state.teamMembers,
        [teamId]: members,
      },
    }));
  },

  addTeam: (team) => {
    set((state) => ({
      teams: [team, ...state.teams],
    }));
  },

  updateTeam: (team) => {
    set((state) => ({
      teams: state.teams.map((t) => (t.id === team.id ? team : t)),
    }));
  },

  removeTeam: (teamId) => {
    set((state) => ({
      teams: state.teams.filter((t) => t.id !== teamId),
      teamMembers: (() => {
        const nextMembers = { ...state.teamMembers };
        delete nextMembers[teamId];
        return nextMembers;
      })(),
      selectedTeamId: state.selectedTeamId === teamId ? null : state.selectedTeamId,
    }));
  },

  addTeamMember: (teamId, member) => {
    set((state) => ({
      teamMembers: {
        ...state.teamMembers,
        [teamId]: [member, ...(state.teamMembers[teamId] ?? [])],
      },
    }));
  },

  removeTeamMember: (teamId, memberId) => {
    set((state) => ({
      teamMembers: {
        ...state.teamMembers,
        [teamId]: (state.teamMembers[teamId] ?? []).filter((m) => m.id !== memberId),
      },
    }));
  },

  reset: () => {
    set({
      selectedTeamId: null,
      teams: [],
      teamMembers: {},
    });
  },
}));
