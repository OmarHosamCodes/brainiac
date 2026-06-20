import type { WorkspaceNode } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type UseWorkspaceNodeSharingOptions = {
  node: WorkspaceNode | null;
  workspaceQuery: {
    refetch: () => Promise<unknown>;
  };
};

export function useWorkspaceNodeSharing(options: UseWorkspaceNodeSharingOptions) {
  const { node, workspaceQuery } = options;
  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);

  const teamListQuery = useQuery({
    ...orpc.team.list.queryOptions(),
    enabled: authEnabled,
  });
  const shareNodeMutation = useMutation(orpc.workspace.shareNode.mutationOptions());
  const unshareNodeMutation = useMutation(orpc.workspace.unshareNode.mutationOptions());

  const [nodeShareTeamId, setNodeShareTeamId] = useState("");
  const teams = useMemo(() => teamListQuery.data?.items ?? [], [teamListQuery.data?.items]);
  const currentUserId = session.data?.user?.id ?? "";

  const activeTeamMembership = useMemo(() => {
    if (!node?.teamId) {
      return null;
    }

    return teams.find((team) => team.id === node.teamId) ?? null;
  }, [node?.teamId, teams]);

  const selectedShareTeamMembership = useMemo(() => {
    if (!nodeShareTeamId) {
      return null;
    }

    return teams.find((team) => team.id === nodeShareTeamId) ?? null;
  }, [nodeShareTeamId, teams]);

  const activeTeamRole = activeTeamMembership?.role ?? null;
  const selectedShareTeamRole = selectedShareTeamMembership?.role ?? null;

  const canEditNodeContent = useMemo(() => {
    if (!node) {
      return false;
    }

    const isNodeOwner = !node.ownerUserId || node.ownerUserId === currentUserId;

    if (isNodeOwner) {
      return true;
    }

    if (node.visibility !== "team" || !node.teamId) {
      return false;
    }

    return activeTeamRole === "owner" || activeTeamRole === "editor";
  }, [activeTeamRole, currentUserId, node]);

  const canManageNodeSharing = useMemo(() => {
    if (!node) {
      return false;
    }

    const isNodeOwner = !node.ownerUserId || node.ownerUserId === currentUserId;

    if (!isNodeOwner) {
      return false;
    }

    if (node.visibility === "team" && node.teamId) {
      return activeTeamRole === "owner";
    }

    return selectedShareTeamRole === "owner";
  }, [activeTeamRole, currentUserId, node, selectedShareTeamRole]);

  const nodeVisibilityLabel = useMemo(() => {
    if (!node) {
      return "Unknown";
    }

    if (node.visibility !== "team") {
      return "Private";
    }

    if (!node.ownerUserId || node.ownerUserId === currentUserId) {
      return "Team Shared";
    }

    return "Shared With You";
  }, [currentUserId, node]);

  const nodeVisibilityBadgeClass = useMemo(() => {
    if (!node || node.visibility !== "team") {
      return "border-neutral-300/70 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";
    }

    if (!node.ownerUserId || node.ownerUserId === currentUserId) {
      return "border-emerald-300/60 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300";
    }

    return "border-emerald-300/60 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300";
  }, [currentUserId, node]);

  const nodeOwnerLabel = useMemo(() => {
    const ownerUserId = node?.ownerUserId;

    if (!ownerUserId) {
      return "You";
    }

    if (ownerUserId === currentUserId) {
      return "You";
    }

    return "Teammate";
  }, [currentUserId, node?.ownerUserId]);

  const nodeTeamName = activeTeamMembership?.name ?? null;

  useEffect(() => {
    if (!node) {
      setNodeShareTeamId("");
      return;
    }

    if (node.teamId && teams.some((team) => team.id === node.teamId)) {
      setNodeShareTeamId(node.teamId);
      return;
    }

    if (nodeShareTeamId && teams.some((team) => team.id === nodeShareTeamId)) {
      return;
    }

    setNodeShareTeamId(teams[0]?.id ?? "");
  }, [node, nodeShareTeamId, teams]);

  async function shareCurrentNodeToTeam() {
    if (!node || !nodeShareTeamId || !canManageNodeSharing) {
      if (node && !canManageNodeSharing) {
        toast.warning("Owner role required", {
          description: "Only team owners can share nodes.",
        });
      }

      return;
    }

    try {
      await shareNodeMutation.mutateAsync({
        nodeId: node.id,
        teamId: nodeShareTeamId,
      });
      await workspaceQuery.refetch();
      toast.success("Node shared", {
        description: `${node.title} is now shared with the selected team.`,
      });
    } catch (error) {
      toast.error("Share failed", {
        description: getErrorMessage(error, "Could not share this node."),
      });
    }
  }

  async function unshareCurrentNodeFromTeam() {
    if (!node || !canManageNodeSharing) {
      if (node && !canManageNodeSharing) {
        toast.warning("Owner role required", {
          description: "Only team owners can unshare nodes.",
        });
      }

      return;
    }

    try {
      await unshareNodeMutation.mutateAsync({ nodeId: node.id });
      await workspaceQuery.refetch();
      toast.success("Node unshared", {
        description: `${node.title} is now private again.`,
      });
    } catch (error) {
      toast.error("Unshare failed", {
        description: getErrorMessage(error, "Could not unshare this node."),
      });
    }
  }

  return {
    activeTeamMembership,
    activeTeamRole,
    canEditNodeContent,
    canManageNodeSharing,
    nodeOwnerLabel,
    nodeShareTeamId,
    setNodeShareTeamId,
    nodeTeamName,
    nodeVisibilityBadgeClass,
    nodeVisibilityLabel,
    shareCurrentNodeToTeam,
    shareNodeMutation,
    teamListQuery,
    teams,
    unshareCurrentNodeFromTeam,
    unshareNodeMutation,
  };
}
