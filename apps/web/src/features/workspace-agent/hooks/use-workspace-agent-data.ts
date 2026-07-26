import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentSurface, DashboardAgentToolPreset } from "@orch/agent/types";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

export function useWorkspaceAgentData(args: {
  activeConversationId: string | null;
  surface: AgentSurface;
  toolPreset: DashboardAgentToolPreset;
  toolsMenuOpen: boolean;
}) {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const authEnabled = Boolean(session.data?.user);
  const conversationsListQueryOptions = orpc.agent.conversations.list.queryOptions();
  const conversationsQuery = useQuery({ ...conversationsListQueryOptions, enabled: authEnabled });
  const modelCatalogQuery = useQuery({
    ...orpc.agent.modelCatalog.queryOptions(),
    enabled: authEnabled,
    staleTime: 10 * 60 * 1000,
  });
  const accountStatusQuery = useQuery({
    ...orpc.agent.accountStatus.queryOptions(),
    enabled: authEnabled,
    staleTime: 60 * 1000,
  });
  const activeConversationQuery = useQuery({
    ...orpc.agent.conversations.get.queryOptions({
      input: { conversationId: args.activeConversationId ?? "" },
    }),
    enabled: Boolean(authEnabled && args.activeConversationId),
  });
  const toolsCatalogQuery = useQuery({
    ...orpc.agent.tools.catalog.queryOptions({
      input: {
        surface: args.surface,
        mode: args.surface === "agency" ? "ask" : args.toolPreset,
      },
    }),
    enabled: Boolean(authEnabled && args.toolsMenuOpen),
    staleTime: 5 * 60 * 1000,
  });

  return {
    queryClient,
    conversationsListQueryOptions,
    conversationsQuery,
    modelCatalogQuery,
    accountStatusQuery,
    activeConversationQuery,
    toolsCatalogQuery,
    renameConversationMutation: useMutation(orpc.agent.conversations.rename.mutationOptions()),
    deleteConversationMutation: useMutation(orpc.agent.conversations.delete.mutationOptions()),
  };
}
