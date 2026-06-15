import type { TierLimits } from "@brainiac/workspace/tiers";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

const DEFAULT_LIMITS: TierLimits = {
  workspaceNodes: 10,
  blocksPerTab: 6,
  tabsPerNode: 3,
  teams: 1,
  teamMembers: 3,
  aiConversations: 5,
  agencyOps: false,
  marketplacePublish: false,
};

export function useBilling(enabled = true) {
  const queryClient = useQueryClient();
  const session = authClient.useSession();

  const billingQuery = useQuery({
    ...orpc.billing.state.queryOptions(),
    enabled: enabled && Boolean(session.data?.user),
    staleTime: 5 * 60 * 1000,
  });

  const tier = billingQuery.data?.tier ?? "free";
  const isPro = tier === "pro";
  const limits = billingQuery.data?.limits ?? DEFAULT_LIMITS;
  const subscription = billingQuery.data?.subscription ?? null;

  async function checkout(slug = "pro") {
    await authClient.checkout({ slug });
  }

  async function openPortal() {
    await authClient.customer.portal();
  }

  function refreshBillingState() {
    queryClient.invalidateQueries({ queryKey: orpc.billing.state.queryOptions().queryKey });
  }

  return {
    billingQuery,
    tier,
    isPro,
    limits,
    subscription,
    checkout,
    openPortal,
    refreshBillingState,
  };
}
