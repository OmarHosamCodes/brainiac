import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { computed, ref } from "vue";

import type { useTeamSelection } from "~/composables/useTeamSelection";
import { getErrorMessage } from "~/utils/get-error-message";

type TeamRole = "owner" | "editor" | "viewer";
type TeamSelectionState = ReturnType<typeof useTeamSelection>;

type TeamMember = {
  teamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: TeamRole;
  joinedAt: string;
  updatedAt: string;
};

type TeamSummary = {
  id: string;
  name: string;
  role: TeamRole;
  createdByUserId: string;
  updatedAt: string;
};

type TeamDetail = TeamSummary & {
  members: TeamMember[];
};

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
  const queryClient = useQueryClient();

  const memberEmail = ref("");
  const memberRole = ref<TeamRole>("viewer");

  const createTeamMutation = useMutation(orpc.team.create.mutationOptions());
  const updateTeamMutation = useMutation(orpc.team.update.mutationOptions());
  const deleteTeamMutation = useMutation(orpc.team.delete.mutationOptions());
  const addTeamMemberMutation = useMutation(orpc.team.members.add.mutationOptions());
  const updateTeamMemberRoleMutation = useMutation(orpc.team.members.updateRole.mutationOptions());
  const removeTeamMemberMutation = useMutation(orpc.team.members.remove.mutationOptions());
  const teamListQueryKey = orpc.team.list.queryOptions().queryKey;

  function getTeamDetailQueryKey(teamId: string) {
    return orpc.team.get.queryOptions({ input: { teamId } }).queryKey;
  }

  function createPendingMemberId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `pending-${crypto.randomUUID()}`;
    }

    return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const selectedTeamMembers = computed(() => teamSelection.selectedTeam.value?.members ?? []);
  const selectedTeamRole = computed<TeamRole | null>(() => {
    const role = teamSelection.selectedTeam.value?.role;

    if (role === "owner" || role === "editor" || role === "viewer") {
      return role;
    }

    return null;
  });
  const canInvite = computed(() => selectedTeamRole.value === "owner");
  const canDeleteTeam = computed(() => selectedTeamRole.value === "owner");
  const canModifyRoles = computed(() => selectedTeamRole.value === "owner");
  const canRemoveMembers = computed(() => selectedTeamRole.value === "owner");
  const canManageSelectedTeam = computed(
    () => canInvite.value && canDeleteTeam.value && canModifyRoles.value && canRemoveMembers.value,
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

    const teamDetailQueryKey = getTeamDetailQueryKey(teamId);
    const previousTeamDetail = queryClient.getQueryData<TeamDetail>(teamDetailQueryKey);
    const previousTeamList = queryClient.getQueryData<{ items: TeamSummary[] }>(teamListQueryKey);

    queryClient.setQueryData<TeamDetail | undefined>(teamDetailQueryKey, (current) =>
      current
        ? {
            ...current,
            name,
          }
        : current,
    );
    queryClient.setQueryData<{ items: TeamSummary[] } | undefined>(teamListQueryKey, (current) =>
      current
        ? {
            ...current,
            items: current.items.map((team) =>
              team.id === teamId
                ? {
                    ...team,
                    name,
                  }
                : team,
            ),
          }
        : current,
    );

    try {
      const updatedTeam = (await updateTeamMutation.mutateAsync({ teamId, name })) as TeamSummary;

      queryClient.setQueryData<TeamDetail | undefined>(teamDetailQueryKey, (current) =>
        current
          ? {
              ...current,
              name: updatedTeam.name,
              role: updatedTeam.role,
              updatedAt: updatedTeam.updatedAt,
            }
          : current,
      );
      queryClient.setQueryData<{ items: TeamSummary[] } | undefined>(teamListQueryKey, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((team) =>
                team.id === updatedTeam.id
                  ? {
                      ...team,
                      ...updatedTeam,
                    }
                  : team,
              ),
            }
          : current,
      );

      toast.add({
        title: "Team updated",
        description: "Team name saved.",
        color: "success",
      });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(teamDetailQueryKey, previousTeamDetail);
      }

      if (previousTeamList) {
        queryClient.setQueryData(teamListQueryKey, previousTeamList);
      }

      toast.add({
        title: "Failed to update team",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    } finally {
      await teamSelection.refreshTeamData();
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

    const teamDetailQueryKey = getTeamDetailQueryKey(teamId);
    const previousTeamDetail = queryClient.getQueryData<TeamDetail>(teamDetailQueryKey);
    const pendingMemberId = createPendingMemberId();
    const timestamp = new Date().toISOString();
    const optimisticMember: TeamMember = {
      teamId,
      userId: pendingMemberId,
      userName: userEmail.split("@")[0] || userEmail,
      userEmail,
      role: memberRole.value,
      joinedAt: timestamp,
      updatedAt: timestamp,
    };

    queryClient.setQueryData<TeamDetail | undefined>(teamDetailQueryKey, (current) =>
      current
        ? {
            ...current,
            members: [...current.members, optimisticMember],
          }
        : current,
    );

    try {
      const addedMember = (await addTeamMemberMutation.mutateAsync({
        teamId,
        userEmail,
        role: memberRole.value,
      })) as TeamMember;

      queryClient.setQueryData<TeamDetail | undefined>(teamDetailQueryKey, (current) => {
        if (!current) {
          return current;
        }

        const replacedMembers = current.members.map((member) =>
          member.userId === pendingMemberId ? addedMember : member,
        );
        const hasRealMember = replacedMembers.some(
          (member) => member.userId === addedMember.userId,
        );

        return {
          ...current,
          members: hasRealMember ? replacedMembers : [...replacedMembers, addedMember],
        };
      });

      memberEmail.value = "";
      memberRole.value = "viewer";
      toast.add({
        title: "Member added",
        description: `${userEmail} has been added to the team.`,
        color: "success",
      });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(teamDetailQueryKey, previousTeamDetail);
      }

      toast.add({
        title: "Failed to add member",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    } finally {
      await teamSelection.refreshTeamData();
    }
  }

  async function updateMemberRole(userId: string, role: TeamRole) {
    const teamId = teamSelection.selectedTeamId.value;

    if (!teamId) {
      return;
    }

    const teamDetailQueryKey = getTeamDetailQueryKey(teamId);
    const previousTeamDetail = queryClient.getQueryData<TeamDetail>(teamDetailQueryKey);

    queryClient.setQueryData<TeamDetail | undefined>(teamDetailQueryKey, (current) =>
      current
        ? {
            ...current,
            members: current.members.map((member) =>
              member.userId === userId
                ? {
                    ...member,
                    role,
                  }
                : member,
            ),
          }
        : current,
    );

    try {
      await updateTeamMemberRoleMutation.mutateAsync({ teamId, userId, role });
      toast.add({
        title: "Role updated",
        description: "Member role has been updated.",
        color: "success",
      });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(teamDetailQueryKey, previousTeamDetail);
      }

      toast.add({
        title: "Failed to update role",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    } finally {
      await teamSelection.refreshTeamData();
    }
  }

  async function removeMember(userId: string) {
    const teamId = teamSelection.selectedTeamId.value;

    if (!teamId) {
      return;
    }

    const teamDetailQueryKey = getTeamDetailQueryKey(teamId);
    const previousTeamDetail = queryClient.getQueryData<TeamDetail>(teamDetailQueryKey);

    queryClient.setQueryData<TeamDetail | undefined>(teamDetailQueryKey, (current) =>
      current
        ? {
            ...current,
            members: current.members.filter((member) => member.userId !== userId),
          }
        : current,
    );

    try {
      await removeTeamMemberMutation.mutateAsync({ teamId, userId });
      toast.add({
        title: "Member removed",
        description: "Member access has been revoked.",
        color: "success",
      });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(teamDetailQueryKey, previousTeamDetail);
      }

      toast.add({
        title: "Failed to remove member",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    } finally {
      await Promise.all([teamSelection.refreshTeamData(), workspaceQuery.refetch()]);
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
    queryClient,
    memberEmail,
    memberRole,
    selectedTeamMembers,
    canInvite,
    canDeleteTeam,
    canModifyRoles,
    canRemoveMembers,
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
