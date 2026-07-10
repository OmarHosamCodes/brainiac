import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

export function useDashboardAgentData(activeConversationId: string | null) {
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
      input: { conversationId: activeConversationId ?? "" },
    }),
    enabled: Boolean(authEnabled && activeConversationId),
  });

  return {
    queryClient,
    conversationsListQueryOptions,
    conversationsQuery,
    modelCatalogQuery,
    accountStatusQuery,
    activeConversationQuery,
    chatTurnMutation: useMutation(orpc.agent.chat.turn.mutationOptions()),
    renameConversationMutation: useMutation(orpc.agent.conversations.rename.mutationOptions()),
    deleteConversationMutation: useMutation(orpc.agent.conversations.delete.mutationOptions()),
  };
}
