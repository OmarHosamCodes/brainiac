<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const orpc = useOrpc();
const healthCheck = useQuery(orpc.healthCheck.queryOptions());

onServerPrefetch(async () => {
  try {
    await healthCheck.suspense();
  } catch {}
});

const footerNav = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Agency", to: "/agency" },
  { label: "Marketplace", to: "/marketplace" },
  { label: "Pricing", to: "/#pricing" },
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
    <slot />

    <footer class="w-full border-t border-neutral-200 dark:border-neutral-800/80 mt-auto">
      <div class="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-y-10 md:gap-x-10">
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
            <p class="mt-4 text-sm text-neutral-500 dark:text-neutral-500 max-w-xs leading-relaxed">
              A spatial knowledge workspace with an embedded agent.
            </p>

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
