<script setup lang="ts">
defineProps<{
  badge: {
    label: string;
    className: string;
  };
  nodesCount: number;
  userName?: string | null;
}>();
</script>

<template>
  <div
    class="flex items-center gap-4 px-4 py-3 rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-xl shadow-2xl transition-all duration-300"
  >
    <div
      class="flex size-10 items-center justify-center rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
    >
      <UIcon name="i-lucide-layout-grid" class="size-5" />
    </div>

    <div class="flex-1 min-w-0">
      <p
        class="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 leading-none mb-1"
      >
        {{ userName ? `${userName}'s Workspace` : "Personal Workspace" }}
      </p>
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-neutral-900 dark:text-neutral-100"
          >{{ nodesCount }} Nodes</span
        >
        <div class="size-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        <div
          class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-50 dark:bg-neutral-900 text-neutral-500"
          :class="badge.className"
        >
          {{ badge.label }}
        </div>
      </div>
    </div>
  </div>
</template>
