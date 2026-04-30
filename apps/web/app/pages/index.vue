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

const features = [
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

const footerNav = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Agency", to: "/agency" },
  { label: "Marketplace", to: "/marketplace" },
  { label: "Pricing", to: "/pricing" },
];

const footerLegal = [
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
];

const year = new Date().getFullYear();
</script>

<template>
  <div
    class="min-h-screen w-full flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 selection:bg-primary/20"
  >
    <!-- ── Hero ─────────────────────────────────────────────────────── -->
    <section class="relative w-full">
      <div class="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 pt-20 md:pt-28 pb-24 md:pb-32">
        <!-- Wordmark, sits above the headline as a quiet anchor -->
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
          <span class="text-neutral-400 dark:text-neutral-500">for the way you actually think.</span>
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
          <UButton to="/pricing" size="xl" variant="ghost" color="neutral"> See pricing </UButton>
        </div>
      </div>

      <!-- Hairline divider into the body -->
      <div class="border-t border-neutral-200 dark:border-neutral-800/80" />
    </section>

    <!-- ── Features: editorial alternating sections ─────────────────── -->
    <section class="w-full">
      <div class="max-w-6xl mx-auto px-6 md:px-10 lg:px-16">
        <div
          v-for="(feature, idx) in features"
          :key="feature.eyebrow"
          class="grid grid-cols-1 md:grid-cols-12 gap-y-8 md:gap-x-10 py-20 md:py-28 border-b border-neutral-200 dark:border-neutral-800/80 last:border-b-0"
        >
          <!-- Eyebrow column -->
          <div
            class="md:col-span-3 md:col-start-1 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500"
            :class="{ 'md:order-2 md:col-start-10': idx % 2 === 1 }"
          >
            <div class="flex items-center gap-2">
              <UIcon :name="feature.icon" class="size-4 text-primary-600 dark:text-primary-400" />
              <span>{{ feature.eyebrow }}</span>
            </div>
          </div>

          <!-- Content column -->
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

    <!-- ── Pricing teaser ───────────────────────────────────────────── -->
    <section class="w-full border-t border-neutral-200 dark:border-neutral-800/80">
      <div
        class="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-28 flex flex-col md:flex-row md:items-end md:justify-between gap-8"
      >
        <div class="max-w-2xl">
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
          <p class="mt-5 text-base md:text-lg text-neutral-600 dark:text-neutral-400 max-w-lg">
            Start with 10 nodes, 6 blocks per tab, and the AI agent. Upgrade for 200 nodes, agency
            ops, and marketplace publishing.
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <UButton
            to="/pricing"
            size="lg"
            color="neutral"
            variant="outline"
            trailing-icon="i-lucide-arrow-right"
          >
            Compare plans
          </UButton>
        </div>
      </div>
    </section>

    <!-- ── Footer ───────────────────────────────────────────────────── -->
    <footer class="w-full border-t border-neutral-200 dark:border-neutral-800/80 mt-auto">
      <div class="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-y-10 md:gap-x-10">
          <!-- Brand + status -->
          <div class="md:col-span-5">
            <div
              class="flex items-center gap-2.5 text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              <span
                class="flex items-center justify-center size-7 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
              >
                <UIcon name="i-lucide-brain-circuit" class="size-4" />
              </span>
              Brainiac
            </div>
            <p
              class="mt-4 text-sm text-neutral-500 dark:text-neutral-500 max-w-xs leading-relaxed"
            >
              A spatial knowledge workspace with an embedded agent.
            </p>

            <!-- System status: a quiet inline line, not a floating chrome -->
            <div
              class="mt-6 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500"
            >
              <span
                class="size-1.5 rounded-full"
                :class="
                  healthCheck.isSuccess.value
                    ? 'bg-primary-500'
                    : 'bg-neutral-300 dark:bg-neutral-700'
                "
              />
              <span>
                {{ healthCheck.isSuccess.value ? "All systems operational" : "Status unavailable" }}
              </span>
              <span
                v-if="healthCheck.isSuccess.value"
                class="text-neutral-300 dark:text-neutral-600"
              >
                · {{ healthCheck.data.value }}ms
              </span>
            </div>
          </div>

          <!-- Product nav -->
          <div class="md:col-span-3 md:col-start-7">
            <div
              class="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 mb-4"
            >
              Product
            </div>
            <ul class="space-y-2.5">
              <li v-for="item in footerNav" :key="item.to">
                <ULink
                  :to="item.to"
                  class="text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                  {{ item.label }}
                </ULink>
              </li>
            </ul>
          </div>

          <!-- Legal + theme -->
          <div class="md:col-span-2 md:col-start-11">
            <div
              class="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 mb-4"
            >
              Legal
            </div>
            <ul class="space-y-2.5 mb-6">
              <li v-for="item in footerLegal" :key="item.to">
                <ULink
                  :to="item.to"
                  class="text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                  {{ item.label }}
                </ULink>
              </li>
            </ul>
            <UColorModeButton
              variant="ghost"
              color="neutral"
              size="sm"
              class="-ml-2 rounded-full"
            />
          </div>
        </div>

        <!-- Bottom rule -->
        <div
          class="mt-12 md:mt-16 pt-6 border-t border-neutral-200 dark:border-neutral-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
        >
          <p class="text-xs text-neutral-400 dark:text-neutral-500">
            &copy; {{ year }} Brainiac. All rights reserved.
          </p>
          <p class="text-xs text-neutral-400 dark:text-neutral-500">
            Built for people who think on canvases.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
