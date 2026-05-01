<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

definePageMeta({ layout: "marketing" });

const orpc = useOrpc();
const healthCheck = useQuery(orpc.healthCheck.queryOptions());

onServerPrefetch(async () => {
  try {
    await healthCheck.suspense();
  } catch {}
});

const session = useAuthSession();
const isAuthenticated = computed(() => Boolean(session.value?.data?.user));
const { checkout, isPro } = useBilling();

const features = [
  { icon: "i-lucide-layout-grid", label: "Workspace Nodes", free: "10", pro: "200" },
  { icon: "i-lucide-blocks", label: "Blocks per Tab", free: "6", pro: "24" },
  { icon: "i-lucide-layers", label: "Tabs per Node", free: "3", pro: "12" },
  { icon: "i-lucide-users", label: "Teams", free: "1", pro: "5" },
  { icon: "i-lucide-user-plus", label: "Team Members", free: "3", pro: "20" },
  { icon: "i-lucide-brain-circuit", label: "AI Conversations", free: "5", pro: "Unlimited" },
  { icon: "i-lucide-briefcase", label: "Agency Ops", free: false, pro: true },
  { icon: "i-lucide-store", label: "Marketplace Publishing", free: false, pro: true },
] as const;

async function handleCheckout() {
  if (!isAuthenticated.value) {
    await navigateTo("/login");
    return;
  }
  if (isPro.value) {
    await navigateTo("/billing");
    return;
  }
  await checkout("pro");
}

const landingFeatures = [
  {
    eyebrow: "01 / Canvas",
    title: "An infinite plane for thinking",
    body: "Pan, zoom, and place nodes anywhere. Each node holds tabs, each tab holds blocks: task lists, notes, kanban boards, decision matrices. Your work has a place, and the place has a shape.",
    icon: "i-lucide-frame",
  },
  {
    eyebrow: "02 / Agent",
    title: "An agent that mutates the workspace",
    body: "Talk to the agent. It reads your nodes, fetches references, writes new blocks, restructures what's there. Every tool call is visible as plain text. No magic, no mystery, no surprises.",
    icon: "i-lucide-brain-circuit",
  },
  {
    eyebrow: "03 / Blocks",
    title: "Composable units, not templates",
    body: "Tasks, notes, kanban, OKRs, decision matrices, prompts. Blocks compose inside tabs and tabs compose inside nodes. Build the shape your work actually has.",
    icon: "i-lucide-blocks",
  },
];
</script>

<template>
  <MarketingPageShell>
    <section class="relative w-full">
      <div class="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 pt-20 md:pt-28 pb-24 md:pb-32">
        <div
          class="flex items-center gap-2.5 text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-16 md:mb-20"
        >
          <span
            class="flex items-center justify-center size-7 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
          >
            <UIcon name="i-lucide-brain-circuit" class="size-4" />
          </span>
          Brainiac
        </div>

        <h1
          class="text-[2.5rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.02] max-w-4xl"
        >
          A spatial workspace
          <span class="text-neutral-400 dark:text-neutral-500"
            >for the way you actually think.</span
          >
        </h1>

        <p
          class="mt-8 md:mt-10 text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-xl leading-relaxed"
        >
          Brainiac gives every piece of your work a place on an infinite canvas, then puts an AI
          agent next to you that can read and reshape it in real time.
        </p>

        <div class="mt-10 md:mt-12 flex flex-wrap items-center gap-3">
          <UButton
            :to="isAuthenticated ? '/dashboard' : '/login'"
            size="xl"
            color="primary"
            trailing-icon="i-lucide-arrow-right"
          >
            {{ isAuthenticated ? "Open workspace" : "Get started" }}
          </UButton>
          <UButton href="#pricing" size="xl" variant="ghost" color="neutral"> See pricing </UButton>
        </div>
      </div>

      <div class="border-t border-neutral-200 dark:border-neutral-800/80" />
    </section>

    <section class="w-full">
      <div class="max-w-6xl mx-auto px-6 md:px-10 lg:px-16">
        <div
          v-for="(feature, idx) in landingFeatures"
          :key="feature.eyebrow"
          class="grid grid-cols-1 md:grid-cols-12 gap-y-8 md:gap-x-10 py-20 md:py-28 border-b border-neutral-200 dark:border-neutral-800/80 last:border-b-0"
        >
          <div
            class="md:col-span-3 md:col-start-1 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500"
            :class="{ 'md:order-2 md:col-start-10': idx % 2 === 1 }"
          >
            <div class="flex items-center gap-2">
              <UIcon :name="feature.icon" class="size-4 text-primary-600 dark:text-primary-400" />
              <span>{{ feature.eyebrow }}</span>
            </div>
          </div>

          <div
            class="md:col-span-8"
            :class="idx % 2 === 1 ? 'md:order-1 md:col-start-1' : 'md:col-start-5'"
          >
            <h2 class="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] max-w-2xl">
              {{ feature.title }}
            </h2>
            <p
              class="mt-5 md:mt-6 text-base md:text-lg text-neutral-600 dark:text-neutral-400 max-w-xl leading-relaxed"
            >
              {{ feature.body }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section
      id="pricing"
      class="w-full border-t border-neutral-200 dark:border-neutral-800/80 scroll-mt-8"
    >
      <div class="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-28">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-y-8 md:gap-x-10">
          <div class="md:col-span-4">
            <div
              class="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 mb-4"
            >
              Pricing
            </div>
            <h2 class="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
              Free to try.
              <span class="text-neutral-400 dark:text-neutral-500"
                >Pro when you need the room.</span
              >
            </h2>
            <p
              class="mt-5 text-base md:text-lg text-neutral-600 dark:text-neutral-400 max-w-sm leading-relaxed"
            >
              Start with 10 nodes, 6 blocks per tab, and the AI agent. Upgrade for 200 nodes, agency
              ops, and marketplace publishing.
            </p>

            <div class="mt-8 flex flex-col gap-4">
              <div>
                <div class="flex items-baseline gap-1">
                  <span class="text-4xl font-bold">$0</span>
                  <span class="text-neutral-400">/month</span>
                </div>
                <p class="mt-1 text-sm text-neutral-500">10 nodes, single user</p>
              </div>
              <UButton
                :to="isAuthenticated ? '/dashboard' : '/login'"
                variant="outline"
                color="neutral"
                size="lg"
              >
                Get started
              </UButton>
            </div>

            <div class="mt-10 border-t border-neutral-200 dark:border-neutral-800/80 pt-8">
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-bold">$19</span>
                <span class="text-neutral-400">/month</span>
              </div>
              <p class="mt-1 text-sm text-neutral-500">200 nodes, teams, agency ops</p>
              <UButton
                size="lg"
                :color="isAuthenticated && isPro ? 'neutral' : 'primary'"
                :variant="isAuthenticated && isPro ? 'outline' : 'solid'"
                class="mt-4"
                @click="handleCheckout"
              >
                {{ isAuthenticated && isPro ? "Current plan" : "Upgrade to Pro" }}
              </UButton>
            </div>
          </div>

          <div class="md:col-span-7 md:col-start-6">
            <div class="border-t border-neutral-200 dark:border-neutral-800/80">
              <div
                v-for="feature in features"
                :key="feature.label"
                class="grid grid-cols-[1fr_auto_auto] gap-x-6 py-4 border-b border-neutral-200 dark:border-neutral-800/80 items-center"
              >
                <div class="flex items-center gap-3">
                  <UIcon
                    :name="feature.icon"
                    class="size-4 text-neutral-400 dark:text-neutral-500 shrink-0"
                  />
                  <span class="text-sm text-neutral-700 dark:text-neutral-300">{{
                    feature.label
                  }}</span>
                </div>
                <span
                  class="text-sm tabular-nums text-right"
                  :class="
                    feature.free === false
                      ? 'text-neutral-300 dark:text-neutral-700'
                      : 'text-neutral-600 dark:text-neutral-400'
                  "
                >
                  {{ feature.free === false ? "" : feature.free }}
                </span>
                <span
                  class="text-sm font-semibold tabular-nums text-right"
                  :class="
                    feature.pro === true
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-neutral-900 dark:text-neutral-100'
                  "
                >
                  {{ feature.pro === true ? "Included" : feature.pro }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </MarketingPageShell>
</template>
