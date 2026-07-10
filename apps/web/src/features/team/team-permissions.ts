export type TeamPermissionRole = "owner" | "editor" | "viewer";

export function deriveTeamPermissions(role: TeamPermissionRole | null | undefined) {
  const isOwner = role === "owner";
  return {
    canInvite: isOwner,
    canDeleteTeam: isOwner,
    canModifyRoles: isOwner,
    canRemoveMembers: isOwner,
    canManageSelectedTeam: isOwner,
  };
}
