import { authClient } from "@/lib/auth-client";
import { deriveTeamPermissions, useTeamStore } from "@/features/team/team-store";

export function useTeamSettingsModal(teamRole: "owner" | "editor" | "viewer" | null) {
  const session = authClient.useSession();

  return {
    currentUserId: session.data?.user?.id ?? "",
    saveTeamName: useTeamStore((state) => state.saveTeamName),
    saveTeamImage: useTeamStore((state) => state.saveTeamImage),
    deleteSelectedTeam: useTeamStore((state) => state.deleteSelectedTeam),
    addTeamMember: useTeamStore((state) => state.addTeamMember),
    updateMemberRole: useTeamStore((state) => state.updateMemberRole),
    removeMember: useTeamStore((state) => state.removeMember),
    setMemberEmail: useTeamStore((state) => state.setMemberEmail),
    setMemberRole: useTeamStore((state) => state.setMemberRole),
    permissions: deriveTeamPermissions(teamRole),
  };
}
