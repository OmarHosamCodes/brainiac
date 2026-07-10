import type { TierLimits } from "@brainiac/workspace/tiers";

import { useShellBootGate } from "@/features/app-shell/shell/use-shell-boot-gate";
import { useBilling } from "@/features/billing/billing-queries";

export type BillingPageViewModel = {
  isBooting: boolean;
  isPro: boolean;
  limits: TierLimits;
  subscriptionSummary: string;
  showManageSubscription: boolean;
  showUpgrade: boolean;
  manageSubscription: () => void;
  upgrade: () => void;
};

export function useBillingPage(): BillingPageViewModel {
  const { isPro, subscription, limits, checkout, openPortal, billingQuery } = useBilling();
  const { isBooting } = useShellBootGate(!billingQuery.isPending);

  const formattedRenewalDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const isLifetimeSubscription = Boolean(subscription?.isLifetime);
  const subscriptionSummary = isLifetimeSubscription
    ? "Lifetime access"
    : subscription
      ? `${subscription.status === "active" ? "Renews" : "Ends"}${
          formattedRenewalDate ? ` ${formattedRenewalDate}` : ""
        }`
      : "No active subscription";

  return {
    isBooting,
    isPro,
    limits,
    subscriptionSummary,
    showManageSubscription: isPro && !isLifetimeSubscription && !billingQuery.isPending,
    showUpgrade: !isPro && !billingQuery.isPending,
    manageSubscription: () => void openPortal(),
    upgrade: () => void checkout("pro"),
  };
}
