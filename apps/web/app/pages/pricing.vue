<script setup lang="ts">
definePageMeta({ layout: "default" });

const session = useAuthSession();
const isAuthenticated = computed(() => Boolean(session.value?.data?.user));

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

  const { checkout } = useBilling();
  await checkout("pro");
}
</script>

<template>
  <div
    class="min-h-screen bg-white dark:bg-neutral-950 selection:bg-emerald-500/30"
  >
    <Header />

    <div class="max-w-5xl mx-auto px-6 pt-32 pb-24">
      <div class="text-center mb-16">
        <div
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-6"
        >
          <UIcon name="i-lucide-sparkles" class="size-3.5" />
          Simple Pricing
        </div>

        <h1
          class="text-4xl md:text-6xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-4"
        >
          Start free, upgrade when ready
        </h1>
        <p class="text-lg text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto">
          Everything you need to organize, collaborate, and think strategically — all in one
          spatial workspace.
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <!-- Free Tier -->
        <UCard class="relative overflow-hidden">
          <div class="p-2">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">Free</h3>
            <div class="flex items-baseline gap-1 mb-4">
              <span class="text-4xl font-bold text-neutral-900 dark:text-neutral-100">$0</span>
              <span class="text-neutral-500">/month</span>
            </div>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              Perfect for getting started with spatial thinking.
            </p>

            <UButton
              to="/dashboard"
              block
              size="lg"
              variant="outline"
              color="neutral"
              class="mb-6"
            >
              Get Started
            </UButton>

            <ul class="space-y-3">
              <li
                v-for="feature in features"
                :key="feature.label"
                class="flex items-center gap-3 text-sm"
              >
                <UIcon
                  :name="feature.free === false ? 'i-lucide-x' : 'i-lucide-check'"
                  class="size-4 shrink-0"
                  :class="feature.free === false ? 'text-neutral-400' : 'text-emerald-500'"
                />
                <span
                  :class="feature.free === false ? 'text-neutral-400' : 'text-neutral-600 dark:text-neutral-300'"
                >
                  {{ feature.label }}
                  <span v-if="typeof feature.free === 'string'" class="text-neutral-400">
                    — {{ feature.free }}
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </UCard>

        <!-- Pro Tier -->
        <UCard
          class="relative overflow-hidden ring-2 ring-emerald-500/50"
        >
          <div
            class="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-bl-2xl"
          >
            Popular
          </div>

          <div class="p-2">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">Pro</h3>
            <div class="flex items-baseline gap-1 mb-4">
              <span class="text-4xl font-bold text-neutral-900 dark:text-neutral-100">$19</span>
              <span class="text-neutral-500">/month</span>
            </div>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              For professionals who need the full power of Brainiac.
            </p>

            <UButton
              block
              size="lg"
              color="primary"
              class="mb-6 shadow-lg shadow-emerald-500/20"
              @click="handleCheckout"
            >
              Upgrade to Pro
            </UButton>

            <ul class="space-y-3">
              <li
                v-for="feature in features"
                :key="feature.label"
                class="flex items-center gap-3 text-sm"
              >
                <UIcon name="i-lucide-check" class="size-4 shrink-0 text-emerald-500" />
                <span class="text-neutral-600 dark:text-neutral-300">
                  {{ feature.label }}
                  <span v-if="typeof feature.pro === 'string'" class="text-emerald-500 font-semibold">
                    — {{ feature.pro }}
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
