<script setup lang="ts">
import UserMenu from "./UserMenu.vue";

const route = useRoute();

const items = computed(() => [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: "i-lucide-layout-dashboard",
    active: route.path.startsWith("/dashboard"),
  },
  {
    label: "Agency",
    to: "/agency",
    icon: "i-lucide-briefcase",
    active: route.path.startsWith("/agency"),
  },
  {
    label: "Marketplace",
    to: "/marketplace",
    icon: "i-lucide-shopping-bag",
    active: route.path.startsWith("/marketplace"),
  },
]);
</script>

<template>
  <nav
    class="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 rounded-full border border-neutral-200/50 dark:border-neutral-800/50 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-xl shadow-2xl shadow-black/10 ring-1 ring-black/[0.03] transition-all duration-300 hover:scale-[1.02]"
  >
    <ULink
      to="/"
      class="flex items-center justify-center size-9 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-lg transition hover:scale-105 active:scale-95 group relative overflow-hidden"
    >
      <UIcon name="i-lucide-brain-circuit" class="size-5" />
    </ULink>

    <div class="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

    <div class="flex items-center gap-1">
      <ULink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="relative flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all group overflow-hidden"
        :class="[
          item.active
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50',
        ]"
      >
        <UIcon :name="item.icon" class="size-4" />
        {{ item.label }}
        <div
          v-if="item.active"
          class="absolute inset-0 bg-primary-500/10 dark:bg-primary-400/10 -z-10 rounded-full"
        />
      </ULink>
    </div>

    <div class="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

    <div class="flex items-center gap-1">
      <UColorModeButton
        variant="ghost"
        size="sm"
        class="rounded-full size-9 items-center justify-center"
      />
      <UserMenu />
    </div>
  </nav>
</template>
