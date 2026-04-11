import { env } from "@brainiac/env/server";
import { type Tier, TIER_LIMITS } from "@brainiac/workspace/tiers";
import type { CustomerState } from "@polar-sh/sdk/models/components/customerstate.js";

export type BillingState = {
  tier: Tier;
  subscription: {
    productId: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  limits: (typeof TIER_LIMITS)[Tier];
};

export function normalizeBillingState(customerState: CustomerState | null): BillingState {
  if (!customerState?.activeSubscriptions?.length) {
    return { tier: "free", subscription: null, limits: TIER_LIMITS.free };
  }

  const proProductIds = env.POLAR_PRODUCT_PRO.split(",").map((id) => id.trim());

  // First try to match configured Pro product IDs
  const proSubscription = customerState.activeSubscriptions.find(
    (sub) => proProductIds.includes(sub.productId),
  );

  if (proSubscription) {
    return {
      tier: "pro",
      subscription: {
        productId: proSubscription.productId,
        status: proSubscription.status,
        currentPeriodEnd: proSubscription.currentPeriodEnd.toISOString(),
      },
      limits: TIER_LIMITS.pro,
    };
  }

  // Fallback: any active subscription counts as Pro
  const anyActive = customerState.activeSubscriptions[0];

  if (anyActive) {
    return {
      tier: "pro",
      subscription: {
        productId: anyActive.productId,
        status: anyActive.status,
        currentPeriodEnd: anyActive.currentPeriodEnd.toISOString(),
      },
      limits: TIER_LIMITS.pro,
    };
  }

  return { tier: "free", subscription: null, limits: TIER_LIMITS.free };
}
