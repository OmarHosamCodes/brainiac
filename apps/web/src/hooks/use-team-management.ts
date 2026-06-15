import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

import type { useTeamSelection } from "@/hooks/use-team-selection";

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
  const session = authClient.useSession();
  const queryClient = useQueryClient();

  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<TeamRole>("viewer");

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

  const selectedTeamMembers = useMemo(
    () => teamSelection.selectedTeam?.members ?? [],
    [teamSelection.selectedTeam?.members],
  );

  const selectedTeamRole = useMemo<TeamRole | null>(() => {
    const role = teamSelection.selectedTeam?.role;

    if (role === "owner" || role === "editor" || role === "viewer") {
      return role;
    }

    return null;
  }, [teamSelection.selectedTeam?.role]);

  const canInvite = selectedTeamRole === "owner";
  const canDeleteTeam = selectedTeamRole === "owner";
  const canModifyRoles = selectedTeamRole === "owner";
  const canRemoveMembers = selectedTeamRole === "owner";
  const canManageSelectedTeam = canInvite && canDeleteTeam && canModifyRoles && canRemoveMembers;
  const currentUserId = session.data?.user?.id ?? "";

  async function createTeam() {
    const teamName = teamSelection.newTeamName.trim();

    if (!teamName) {
      return;
    }

    try {
      await createTeamMutation.mutateAsync({ name: teamName });
      teamSelection.setNewTeamName("");
      await teamSelection.teamListQuery.refetch();
      toast.success("Team created", { description: `Created ${teamName}.` });
    } catch (error) {
      toast.error("Failed to create team", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  }

  async function saveTeamName() {
    const teamId = teamSelection.selectedTeamId;
    const name = teamSelection.teamNameDraft.trim();

    if (!teamId || !name) {
      return;
    }

    const teamDetailQueryKey = getTeamDetailQueryKey(teamId);
    const previousTeamDetail = queryClient.getQueryData<TeamDetail>(teamDetailQueryKey);
    const previousTeamList = queryClient.getQueryData<{ items: TeamSummary[] }>(teamListQueryKey);

    queryClient.setQueryData<TeamDetail | undefined>(teamDetailQueryKey, (current) =>
      current ? { ...current, name } : current,
    );
    queryClient.setQueryData<{ items: TeamSummary[] } | undefined>(teamListQueryKey, (current) =>
      current
        ? {
            ...current,
            items: current.items.map((team) => (team.id === teamId ? { ...team, name } : team)),
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
                team.id === updatedTeam.id ? { ...team, ...updatedTeam } : team,
              ),
            }
          : current,
      );

      toast.success("Team updated", { description: "Team name saved." });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(teamDetailQueryKey, previousTeamDetail);
      }

      if (previousTeamList) {
        queryClient.setQueryData(teamListQueryKey, previousTeamList);
      }

      toast.error("Failed to update team", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      await teamSelection.refreshTeamData();
    }
  }

  async function deleteSelectedTeam() {
    const teamId = teamSelection.selectedTeamId;

    if (!teamId) {
      return;
    }

    try {
      await deleteTeamMutation.mutateAsync({ teamId });
      await Promise.all([teamSelection.teamListQuery.refetch(), workspaceQuery.refetch()]);
      toast.success("Team deleted", {
        description: "Shared nodes were detached from this team.",
      });
    } catch (error) {
      toast.error("Failed to delete team", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  }

  async function addTeamMember() {
    const teamId = teamSelection.selectedTeamId;
    const userEmail = memberEmail.trim();

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
      role: memberRole,
      joinedAt: timestamp,
      updatedAt: timestamp,
    };

    queryClient.setQueryData<TeamDetail | undefined>(teamDetailQueryKey, (current) =>
      current ? { ...current, members: [...current.members, optimisticMember] } : current,
    );

    try {
      const addedMember = (await addTeamMemberMutation.mutateAsync({
        teamId,
        userEmail,
        role: memberRole,
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

      setMemberEmail("");
      setMemberRole("viewer");
      toast.success("Member added", {
        description: `${userEmail} has been added to the team.`,
      });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(teamDetailQueryKey, previousTeamDetail);
      }

      toast.error("Failed to add member", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      await teamSelection.refreshTeamData();
    }
  }

  async function updateMemberRole(userId: string, role: TeamRole) {
    const teamId = teamSelection.selectedTeamId;

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
              member.userId === userId ? { ...member, role } : member,
            ),
          }
        : current,
    );

    try {
      await updateTeamMemberRoleMutation.mutateAsync({ teamId, userId, role });
      toast.success("Role updated", { description: "Member role has been updated." });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(teamDetailQueryKey, previousTeamDetail);
      }

      toast.error("Failed to update role", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      await teamSelection.refreshTeamData();
    }
  }

  async function removeMember(userId: string) {
    const teamId = teamSelection.selectedTeamId;

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
      toast.success("Member removed", { description: "Member access has been revoked." });
    } catch (error) {
      if (previousTeamDetail) {
        queryClient.setQueryData(teamDetailQueryKey, previousTeamDetail);
      }

      toast.error("Failed to remove member", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      await Promise.all([teamSelection.refreshTeamData(), workspaceQuery.refetch()]);
    }
  }

  return {
    queryClient,
    memberEmail,
    setMemberEmail,
    memberRole,
    setMemberRole,
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
  };
}
