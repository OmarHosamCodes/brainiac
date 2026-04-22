import type { WorkspaceNode } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { computed, ref, watch, type ComputedRef } from "vue";

import { getErrorMessage } from "~/utils/get-error-message";

type UseWorkspaceNodeSharingOptions = {
  node: ComputedRef<WorkspaceNode | null>;
  workspaceQuery: {
    refetch: () => Promise<unknown>;
  };
};

export function useWorkspaceNodeSharing(options: UseWorkspaceNodeSharingOptions) {
  const { node, workspaceQuery } = options;
  const authSession = useAuthSession();
  const orpc = useOrpc();
  const toast = useToast();
  const authEnabled = computed(() => Boolean(authSession.value?.data?.user));

  const teamListQuery = useQuery(
    computed(() => ({
      ...orpc.team.list.queryOptions(),
      enabled: authEnabled.value,
    })),
  );
  const shareNodeMutation = useMutation(orpc.workspace.shareNode.mutationOptions());
  const unshareNodeMutation = useMutation(orpc.workspace.unshareNode.mutationOptions());

  const nodeShareTeamId = ref("");
  const teams = computed(() => teamListQuery.data.value?.items ?? []);
  const currentUserId = computed(() => authSession.value?.data?.user?.id ?? "");

  const activeTeamMembership = computed(() => {
    const currentNode = node.value;

    if (!currentNode?.teamId) {
      return null;
    }

    return teams.value.find((team) => team.id === currentNode.teamId) ?? null;
  });

  const selectedShareTeamMembership = computed(() => {
    if (!nodeShareTeamId.value) {
      return null;
    }

    return teams.value.find((team) => team.id === nodeShareTeamId.value) ?? null;
  });

  const activeTeamRole = computed(() => activeTeamMembership.value?.role ?? null);
  const selectedShareTeamRole = computed(() => selectedShareTeamMembership.value?.role ?? null);

  const canEditNodeContent = computed(() => {
    const currentNode = node.value;

    if (!currentNode) {
      return false;
    }

    const isNodeOwner = !currentNode.ownerUserId || currentNode.ownerUserId === currentUserId.value;

    if (isNodeOwner) {
      return true;
    }

    if (currentNode.visibility !== "team" || !currentNode.teamId) {
      return false;
    }

    return activeTeamRole.value === "owner" || activeTeamRole.value === "editor";
  });

  const canManageNodeSharing = computed(() => {
    const currentNode = node.value;

    if (!currentNode) {
      return false;
    }

    const isNodeOwner = !currentNode.ownerUserId || currentNode.ownerUserId === currentUserId.value;

    if (!isNodeOwner) {
      return false;
    }

    if (currentNode.visibility === "team" && currentNode.teamId) {
      return activeTeamRole.value === "owner";
    }

    return selectedShareTeamRole.value === "owner";
  });

  const nodeVisibilityLabel = computed(() => {
    const currentNode = node.value;

    if (!currentNode) {
      return "Unknown";
    }

    if (currentNode.visibility !== "team") {
      return "Private";
    }

    if (!currentNode.ownerUserId || currentNode.ownerUserId === currentUserId.value) {
      return "Team Shared";
    }

    return "Shared With You";
  });

  const nodeVisibilityBadgeClass = computed(() => {
    const currentNode = node.value;

    if (!currentNode || currentNode.visibility !== "team") {
      return "border-neutral-300/70 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";
    }

    if (!currentNode.ownerUserId || currentNode.ownerUserId === currentUserId.value) {
      return "border-primary-300/60 bg-primary-100/80 text-primary-700 dark:border-primary-800/70 dark:bg-primary-950/50 dark:text-primary-300";
    }

    return "border-emerald-300/60 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300";
  });

  const nodeOwnerLabel = computed(() => {
    const ownerUserId = node.value?.ownerUserId;

    if (!ownerUserId) {
      return "You";
    }

    if (ownerUserId === currentUserId.value) {
      return "You";
    }

    return "Teammate";
  });

  watch(
    [node, teams],
    ([currentNode, currentTeams]) => {
      if (!currentNode) {
        nodeShareTeamId.value = "";
        return;
      }

      if (currentNode.teamId && currentTeams.some((team) => team.id === currentNode.teamId)) {
        nodeShareTeamId.value = currentNode.teamId;
        return;
      }

      if (nodeShareTeamId.value && currentTeams.some((team) => team.id === nodeShareTeamId.value)) {
        return;
      }

      nodeShareTeamId.value = currentTeams[0]?.id ?? "";
    },
    { immediate: true },
  );

  async function shareCurrentNodeToTeam() {
    if (!node.value || !nodeShareTeamId.value || !canManageNodeSharing.value) {
      if (node.value && !canManageNodeSharing.value) {
        toast.add({
          title: "Owner role required",
          description: "Only team owners can share nodes.",
          color: "warning",
        });
      }

      return;
    }

    try {
      await shareNodeMutation.mutateAsync({
        nodeId: node.value.id,
        teamId: nodeShareTeamId.value,
      });
      await workspaceQuery.refetch();
      toast.add({
        title: "Node shared",
        description: `${node.value.title} is now shared with the selected team.`,
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Share failed",
        description: getErrorMessage(error, "Could not share this node."),
        color: "error",
      });
    }
  }

  async function unshareCurrentNodeFromTeam() {
    if (!node.value || !canManageNodeSharing.value) {
      if (node.value && !canManageNodeSharing.value) {
        toast.add({
          title: "Owner role required",
          description: "Only team owners can unshare nodes.",
          color: "warning",
        });
      }

      return;
    }

    try {
      await unshareNodeMutation.mutateAsync({
        nodeId: node.value.id,
      });
      await workspaceQuery.refetch();
      toast.add({
        title: "Node unshared",
        description: `${node.value.title} is private again.`,
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Unshare failed",
        description: getErrorMessage(error, "Could not unshare this node."),
        color: "error",
      });
    }
  }

  return {
    teamListQuery,
    teams,
    activeTeamMembership,
    activeTeamRole,
    selectedShareTeamRole,
    canEditNodeContent,
    nodeShareTeamId,
    canManageNodeSharing,
    nodeVisibilityLabel,
    nodeVisibilityBadgeClass,
    nodeOwnerLabel,
    shareNodeMutation,
    unshareNodeMutation,
    shareCurrentNodeToTeam,
    unshareCurrentNodeFromTeam,
  };
}
