import { useMutation } from "@tanstack/vue-query";
import { computed, ref } from "vue";

import { getErrorMessage } from "~/utils/get-error-message";
import type { useTeamSelection } from "~/composables/useTeamSelection";

type TeamRole = "owner" | "editor" | "viewer";
type TeamSelectionState = ReturnType<typeof useTeamSelection>;

type TeamManagementOptions = {
  teamSelection: TeamSelectionState;
  workspaceQuery: {
    refetch: () => Promise<unknown>;
  };
};

export function useTeamManagement(options: TeamManagementOptions) {
  const { teamSelection, workspaceQuery } = options;
  const authSession = useAuthSession();
  const orpc = useOrpc();
  const toast = useToast();

  const memberEmail = ref("");
  const memberRole = ref<TeamRole>("viewer");

  const createTeamMutation = useMutation(orpc.team.create.mutationOptions());
  const updateTeamMutation = useMutation(orpc.team.update.mutationOptions());
  const deleteTeamMutation = useMutation(orpc.team.delete.mutationOptions());
  const addTeamMemberMutation = useMutation(orpc.team.members.add.mutationOptions());
  const updateTeamMemberRoleMutation = useMutation(
    orpc.team.members.updateRole.mutationOptions(),
  );
  const removeTeamMemberMutation = useMutation(orpc.team.members.remove.mutationOptions());

  const selectedTeamMembers = computed(() => teamSelection.selectedTeam.value?.members ?? []);
  const canManageSelectedTeam = computed(
    () => teamSelection.selectedTeam.value?.role === "owner",
  );
  const currentUserId = computed(() => authSession.value?.data?.user?.id ?? "");

  async function createTeam() {
    const teamName = teamSelection.newTeamName.value.trim();

    if (!teamName) {
      return;
    }

    try {
      await createTeamMutation.mutateAsync({ name: teamName });
      teamSelection.newTeamName.value = "";
      await teamSelection.teamListQuery.refetch();
      toast.add({
        title: "Team created",
        description: `Created ${teamName}.`,
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Failed to create team",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    }
  }

  async function saveTeamName() {
    const teamId = teamSelection.selectedTeamId.value;
    const name = teamSelection.teamNameDraft.value.trim();

    if (!teamId || !name) {
      return;
    }

    try {
      await updateTeamMutation.mutateAsync({ teamId, name });
      await teamSelection.refreshTeamData();
      toast.add({
        title: "Team updated",
        description: "Team name saved.",
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Failed to update team",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    }
  }

  async function deleteSelectedTeam() {
    const teamId = teamSelection.selectedTeamId.value;

    if (!teamId) {
      return;
    }

    try {
      await deleteTeamMutation.mutateAsync({ teamId });
      await Promise.all([teamSelection.teamListQuery.refetch(), workspaceQuery.refetch()]);
      toast.add({
        title: "Team deleted",
        description: "Shared nodes were detached from this team.",
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Failed to delete team",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    }
  }

  async function addTeamMember() {
    const teamId = teamSelection.selectedTeamId.value;
    const userEmail = memberEmail.value.trim();

    if (!teamId || !userEmail) {
      return;
    }

    try {
      await addTeamMemberMutation.mutateAsync({
        teamId,
        userEmail,
        role: memberRole.value,
      });
      memberEmail.value = "";
      memberRole.value = "viewer";
      await teamSelection.refreshTeamData();
      toast.add({
        title: "Member added",
        description: `${userEmail} has been added to the team.`,
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Failed to add member",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    }
  }

  async function updateMemberRole(userId: string, role: TeamRole) {
    const teamId = teamSelection.selectedTeamId.value;

    if (!teamId) {
      return;
    }

    try {
      await updateTeamMemberRoleMutation.mutateAsync({ teamId, userId, role });
      await teamSelection.refreshTeamData();
      toast.add({
        title: "Role updated",
        description: "Member role has been updated.",
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Failed to update role",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    }
  }

  async function removeMember(userId: string) {
    const teamId = teamSelection.selectedTeamId.value;

    if (!teamId) {
      return;
    }

    try {
      await removeTeamMemberMutation.mutateAsync({ teamId, userId });
      await Promise.all([teamSelection.refreshTeamData(), workspaceQuery.refetch()]);
      toast.add({
        title: "Member removed",
        description: "Member access has been revoked.",
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Failed to remove member",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    }
  }

  function onMemberRoleChange(userId: string, event: Event) {
    const target = event.target as HTMLSelectElement | null;

    if (!target) {
      return;
    }

    const role = target.value;

    if (role !== "owner" && role !== "editor" && role !== "viewer") {
      return;
    }

    void updateMemberRole(userId, role);
  }

  return {
    memberEmail,
    memberRole,
    selectedTeamMembers,
    canManageSelectedTeam,
    currentUserId,
    createTeamMutation,
    updateTeamMutation,
    deleteTeamMutation,
    addTeamMemberMutation,
    updateTeamMemberRoleMutation,
    removeTeamMemberMutation,
    createTeam,
    saveTeamName,
    deleteSelectedTeam,
    addTeamMember,
    updateMemberRole,
    removeMember,
    onMemberRoleChange,
  };
}
