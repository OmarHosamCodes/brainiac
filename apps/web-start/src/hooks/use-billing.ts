import type { TierLimits } from "@brainiac/workspace/tiers";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient, useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

const freeLimits: TierLimits = {
  workspaceNodes: 10,
  blocksPerTab: 6,
  tabsPerNode: 3,
  teams: 1,
  teamMembers: 3,
  aiConversations: 5,
  agencyOps: false,
  marketplacePublish: false,
};

export function useBilling() {
  const session = useSession();
  const queryClient = useQueryClient();
  const authEnabled = Boolean(session.data?.user);
  const billingQuery = useQuery({
    ...orpc.billing.state.queryOptions(),
    enabled: authEnabled,
    staleTime: 5 * 60 * 1000,
  });

  const tier = billingQuery.data?.tier ?? "free";
  const limits = billingQuery.data?.limits ?? freeLimits;

  return {
    billingQuery,
    tier,
    isPro: tier === "pro",
    limits,
    subscription: billingQuery.data?.subscription ?? null,
    checkout: (slug = "pro") => authClient.checkout({ slug }),
    openPortal: () => authClient.customer.portal(),
    refreshBillingState: () =>
      queryClient.invalidateQueries({ queryKey: orpc.billing.state.queryOptions().queryKey }),
  };
}
