<script setup lang="ts">
import { shellActionsSlotClass, shellPageClass } from "~/utils/app-shell-ui";

definePageMeta({
  layout: "app",
  middleware: ["auth"],
});

useAppShellPageTitle("Billing");
useAppShellActionsSlot();

const { isPro, subscription, limits, checkout, openPortal, billingQuery } = useBilling();

const formattedRenewalDate = computed(() => {
  if (!subscription.value?.currentPeriodEnd) return null;
  return new Date(subscription.value.currentPeriodEnd).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

const isLifetimeSubscription = computed(() => Boolean(subscription.value?.isLifetime));

const showManageSubscription = computed(
  () => isPro.value && !isLifetimeSubscription.value && !billingQuery.isPending.value,
);

const showUpgrade = computed(() => !isPro.value && !billingQuery.isPending.value);

const limitItems = computed(() => [
  { label: "Workspace Nodes", value: limits.value.workspaceNodes, icon: "i-lucide-layout-grid" },
  { label: "Blocks per Tab", value: limits.value.blocksPerTab, icon: "i-lucide-blocks" },
  { label: "Tabs per Node", value: limits.value.tabsPerNode, icon: "i-lucide-layers" },
  { label: "Teams", value: limits.value.teams, icon: "i-lucide-users" },
  { label: "Team Members", value: limits.value.teamMembers, icon: "i-lucide-user-plus" },
  {
    label: "AI Conversations",
    value: limits.value.aiConversations === -1 ? "Unlimited" : limits.value.aiConversations,
    icon: "i-lucide-brain-circuit",
  },
  {
    label: "Agency Ops",
    value: limits.value.agencyOps ? "Enabled" : "Disabled",
    icon: "i-lucide-briefcase",
  },
  {
    label: "Marketplace Publishing",
    value: limits.value.marketplacePublish ? "Enabled" : "Disabled",
    icon: "i-lucide-store",
  },
]);
</script>

<template>
  <div class="h-full overflow-y-auto bg-default">
    <Teleport to="#app-shell-actions" defer>
      <div :class="shellActionsSlotClass">
        <ShellTopbarActionButton
          v-if="showManageSubscription"
          label="Manage subscription"
          variant="soft"
          @click="openPortal"
        />
        <ShellTopbarActionButton
          v-else-if="showUpgrade"
          label="Upgrade to Pro"
          color="primary"
          variant="solid"
          @click="checkout('pro')"
        />
      </div>
    </Teleport>

    <div :class="[shellPageClass, 'pt-4']">
      <USkeleton v-if="billingQuery.isPending.value" class="h-48 w-full rounded-[32px]" />

      <template v-else>
        <!-- Current Plan -->
        <UCard class="mb-6">
          <div class="flex items-center justify-between p-2">
            <div>
              <div class="mb-1 flex items-center gap-3">
                <h2 class="text-xl font-bold text-highlighted">
                  {{ isPro ? "Pro" : "Free" }} Plan
                </h2>
                <UBadge :color="isPro ? 'primary' : 'neutral'" variant="subtle" size="sm">
                  {{ isPro ? "Active" : "Current" }}
                </UBadge>
              </div>

              <p v-if="isLifetimeSubscription" class="text-sm text-muted">Lifetime access</p>
              <p v-else-if="subscription" class="text-sm text-muted">
                {{ subscription.status === "active" ? "Renews" : "Ends" }}
                {{ formattedRenewalDate }}
              </p>
              <p v-else class="text-sm text-muted">No active subscription</p>
            </div>
          </div>
        </UCard>

        <!-- Plan Limits -->
        <UCard>
          <div class="p-2">
            <h3 class="mb-4 text-lg font-bold text-highlighted">Your Plan Limits</h3>

            <div class="grid gap-4 sm:grid-cols-2">
              <div
                v-for="item in limitItems"
                :key="item.label"
                class="flex items-center gap-3 rounded-2xl bg-elevated p-3"
              >
                <div class="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                  <UIcon :name="item.icon" class="size-4 text-primary" />
                </div>
                <div>
                  <p class="text-xs text-muted">{{ item.label }}</p>
                  <p class="text-sm font-bold text-highlighted">
                    {{ item.value }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </template>
    </div>
  </div>
</template>
