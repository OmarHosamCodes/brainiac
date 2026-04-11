import type { TierLimits } from "@brainiac/workspace/tiers";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";

export function useBilling() {
  const orpc = useOrpc();
  const authClient = useAuthClient();
  const session = useAuthSession();
  const queryClient = useQueryClient();

  const authEnabled = computed(() => Boolean(session.value?.data?.user));

  const billingQuery = useQuery(
    computed(() => ({
      ...orpc.billing.state.queryOptions(),
      enabled: authEnabled.value,
      staleTime: 5 * 60 * 1000, // 5 minutes
    })),
  );

  const tier = computed(() => billingQuery.data.value?.tier ?? "free");
  const isPro = computed(() => tier.value === "pro");
  const limits = computed<TierLimits>(() => {
    if (billingQuery.data.value?.limits) {
      return billingQuery.data.value.limits;
    }
    return {
      workspaceNodes: 10,
      blocksPerTab: 6,
      tabsPerNode: 3,
      teams: 1,
      teamMembers: 3,
      aiConversations: 5,
      agencyOps: false,
      marketplacePublish: false,
    };
  });
  const subscription = computed(() => billingQuery.data.value?.subscription ?? null);

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
