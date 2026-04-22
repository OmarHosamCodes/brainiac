<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

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
  <div class="min-h-screen bg-white dark:bg-neutral-950">
    <Header />

    <div class="max-w-3xl mx-auto px-6 pt-32 pb-24">
      <h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-8">Billing</h1>

      <USkeleton v-if="billingQuery.isPending.value" class="h-48 w-full rounded-[32px]" />

      <template v-else>
        <!-- Current Plan -->
        <UCard class="mb-6">
          <div class="flex items-center justify-between p-2">
            <div>
              <div class="flex items-center gap-3 mb-1">
                <h2 class="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  {{ isPro ? "Pro" : "Free" }} Plan
                </h2>
                <UBadge :color="isPro ? 'primary' : 'neutral'" variant="subtle" size="sm">
                  {{ isPro ? "Active" : "Current" }}
                </UBadge>
              </div>

              <p v-if="isLifetimeSubscription" class="text-sm text-neutral-500">Lifetime access</p>
              <p v-else-if="subscription" class="text-sm text-neutral-500">
                {{ subscription.status === "active" ? "Renews" : "Ends" }}
                {{ formattedRenewalDate }}
              </p>
              <p v-else class="text-sm text-neutral-500">No active subscription</p>
            </div>

            <div class="flex gap-3">
              <UButton
                v-if="isPro && !isLifetimeSubscription"
                variant="outline"
                color="neutral"
                @click="openPortal"
              >
                Manage Subscription
              </UButton>
              <UButton
                v-else-if="!isPro"
                color="primary"
                class="shadow-lg shadow-emerald-500/20"
                @click="checkout('pro')"
              >
                Upgrade to Pro
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- Plan Limits -->
        <UCard>
          <div class="p-2">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Your Plan Limits
            </h3>

            <div class="grid sm:grid-cols-2 gap-4">
              <div
                v-for="item in limitItems"
                :key="item.label"
                class="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900"
              >
                <div class="flex items-center justify-center size-9 rounded-xl bg-emerald-500/10">
                  <UIcon :name="item.icon" class="size-4 text-emerald-500" />
                </div>
                <div>
                  <p class="text-xs text-neutral-500">{{ item.label }}</p>
                  <p class="text-sm font-bold text-neutral-900 dark:text-neutral-100">
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
