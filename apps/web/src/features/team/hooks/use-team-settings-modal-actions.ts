import { useMemo } from "react";

import { useTeamSettingsModal } from "./use-team-settings-modal";
import { useTeamSettingsModalState } from "./use-team-settings-modal-state";

export type TeamSettingsRole = "owner" | "editor" | "viewer";

export type TeamSettingsMember = {
  teamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: TeamSettingsRole;
  joinedAt: string;
  updatedAt: string;
};

export type TeamSettingsTeam = {
  id: string;
  name: string;
  role: TeamSettingsRole;
  createdByUserId: string;
  updatedAt: string;
  members: TeamSettingsMember[];
};

export type TeamSettingsModalInput = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamSettingsTeam | null;
  onRefetchWorkspace: () => Promise<unknown>;
};

const TEAM_ROLE_RANK: Record<TeamSettingsRole, number> = {
  owner: 0,
  editor: 1,
  viewer: 2,
};

export function useTeamSettingsModalActions(input: TeamSettingsModalInput) {
  const actions = useTeamSettingsModal(input.team?.role ?? null);
  const state = useTeamSettingsModalState();
  const sortedMembers = useMemo(
    () =>
      input.team
        ? [...input.team.members].sort(
            (a, b) =>
              TEAM_ROLE_RANK[a.role] - TEAM_ROLE_RANK[b.role] ||
              a.userName.localeCompare(b.userName),
          )
        : [],
    [input.team],
  );

  async function saveName() {
    if (!input.team || !state.nameDraft.trim() || !state.nameDirty) return;
    state.setSavingName(true);
    try {
      await actions.saveTeamName(input.team.id, state.nameDraft.trim());
      state.setNameDirty(false);
    } finally {
      state.setSavingName(false);
    }
  }

  async function addMember() {
    if (!input.team || !state.inviteEmail.trim()) return;
    actions.setMemberEmail(state.inviteEmail.trim());
    actions.setMemberRole(state.inviteRole);
    state.setAddingMember(true);
    try {
      await actions.addTeamMember(input.team.id);
      state.setInviteEmail("");
    } finally {
      state.setAddingMember(false);
    }
  }

  async function removeMember(userId: string) {
    if (!input.team) return;
    state.setConfirmRemoveUserId(null);
    await actions.removeMember(input.team.id, userId, input.onRefetchWorkspace);
  }

  async function updateMemberRole(userId: string, role: TeamSettingsRole) {
    if (!input.team) return;
    await actions.updateMemberRole(input.team.id, userId, role);
  }

  async function deleteTeam() {
    if (!input.team) return;
    state.setDeletingTeam(true);
    try {
      await actions.deleteSelectedTeam(input.team.id, input.onRefetchWorkspace);
      handleOpenChange(false);
    } finally {
      state.setDeletingTeam(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      state.setNameDraft("");
      state.setNameDirty(false);
      state.setInviteEmail("");
      state.setInviteRole("viewer");
      state.setConfirmDelete(false);
      state.setConfirmRemoveUserId(null);
    }
    input.onOpenChange(nextOpen);
  }

  function handleNameDraftChange(value: string) {
    state.setNameDraft(value);
    state.setNameDirty(value !== input.team?.name);
  }

  return {
    open: input.open,
    team: input.team,
    teamRole: input.team?.role ?? null,
    displayMemberCount: input.team?.members.length ?? 0,
    sortedMembers,
    currentUserId: actions.currentUserId,
    permissions: actions.permissions,
    nameDraft: state.nameDraft,
    nameDirty: state.nameDirty,
    savingName: state.savingName,
    inviteEmail: state.inviteEmail,
    inviteRole: state.inviteRole,
    addingMember: state.addingMember,
    confirmDelete: state.confirmDelete,
    confirmRemoveUserId: state.confirmRemoveUserId,
    deletingTeam: state.deletingTeam,
    actionButtonDisabled: state.addingMember || !state.inviteEmail.trim(),
    removeTargetName:
      sortedMembers.find((member) => member.userId === state.confirmRemoveUserId)?.userName ||
      "member",
    onOpenChange: handleOpenChange,
    onNameDraftChange: handleNameDraftChange,
    onSaveName: () => void saveName(),
    onInviteEmailChange: state.setInviteEmail,
    onInviteRoleChange: state.setInviteRole,
    onAddMember: () => void addMember(),
    onUpdateMemberRole: (userId: string, role: TeamSettingsRole) =>
      void updateMemberRole(userId, role),
    onRequestRemoveMember: state.setConfirmRemoveUserId,
    onRemoveMember: (userId: string) => void removeMember(userId),
    onCancelRemoveMember: () => state.setConfirmRemoveUserId(null),
    onRequestDeleteTeam: () => state.setConfirmDelete(true),
    onCancelDeleteTeam: () => state.setConfirmDelete(false),
    onDeleteTeam: () => void deleteTeam(),
  };
}

export type TeamSettingsModalViewModel = ReturnType<typeof useTeamSettingsModalActions>;
