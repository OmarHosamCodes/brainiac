import type { WorkspaceNode } from "@brainiac/workspace";
import { useMutation } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { computed } from "vue";

import type { useTeamSelection } from "~/composables/useTeamSelection";
import { getErrorMessage } from "~/utils/get-error-message";

type TeamSelectionState = ReturnType<typeof useTeamSelection>;

type WorkspaceBoardState = {
  nodes: Ref<WorkspaceNode[]>;
  selectedNodeIds: Ref<string[]>;
  workspaceQuery: {
    refetch: () => Promise<unknown>;
  };
};

type NodeSharingOptions = {
  teamSelection: TeamSelectionState;
  workspaceBoard: WorkspaceBoardState;
};

export function useNodeSharing(options: NodeSharingOptions) {
  const { teamSelection, workspaceBoard } = options;
  const orpc = useOrpc();
  const toast = useToast();

  const shareNodeMutation = useMutation(orpc.workspace.shareNode.mutationOptions());
  const unshareNodeMutation = useMutation(orpc.workspace.unshareNode.mutationOptions());

  const selectedNode = computed(() => {
    const nodeId = workspaceBoard.selectedNodeIds.value[0];

    if (!nodeId) {
      return null;
    }

    return workspaceBoard.nodes.value.find((node) => node.id === nodeId) ?? null;
  });

  const selectedNodeTeamRole = computed(() => {
    const currentNode = selectedNode.value;

    if (!currentNode) {
      return null;
    }

    if (currentNode.visibility === "team" && currentNode.teamId) {
      return teamSelection.teams.value.find((team) => team.id === currentNode.teamId)?.role ?? null;
    }

    if (!teamSelection.selectedTeamId.value) {
      return null;
    }

    return (
      teamSelection.teams.value.find((team) => team.id === teamSelection.selectedTeamId.value)?.role ??
      null
    );
  });

  const canManageSelectedNodeSharing = computed(() => selectedNodeTeamRole.value === "owner");

  async function shareSelectedNode() {
    if (!selectedNode.value || !teamSelection.selectedTeamId.value || !canManageSelectedNodeSharing.value) {
      if (selectedNode.value && !canManageSelectedNodeSharing.value) {
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
        nodeId: selectedNode.value.id,
        teamId: teamSelection.selectedTeamId.value,
      });
      await workspaceBoard.workspaceQuery.refetch();
      toast.add({
        title: "Node shared",
        description: `${selectedNode.value.title} is now visible to team members.`,
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Failed to share node",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    }
  }

  async function unshareSelectedNode() {
    if (!selectedNode.value || !canManageSelectedNodeSharing.value) {
      if (selectedNode.value && !canManageSelectedNodeSharing.value) {
        toast.add({
          title: "Owner role required",
          description: "Only team owners can unshare nodes.",
          color: "warning",
        });
      }

      return;
    }

    try {
      await unshareNodeMutation.mutateAsync({ nodeId: selectedNode.value.id });
      await workspaceBoard.workspaceQuery.refetch();
      toast.add({
        title: "Node unshared",
        description: `${selectedNode.value.title} is private again.`,
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Failed to unshare node",
        description: getErrorMessage(error, "Please try again."),
        color: "error",
      });
    }
  }

  return {
    shareNodeMutation,
    unshareNodeMutation,
    selectedNode,
    selectedNodeTeamRole,
    canManageSelectedNodeSharing,
    shareSelectedNode,
    unshareSelectedNode,
  };
}
