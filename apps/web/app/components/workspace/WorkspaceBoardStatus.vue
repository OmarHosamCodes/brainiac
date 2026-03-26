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
  <div class="flex items-center gap-4 px-4 py-3 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl shadow-2xl transition-all duration-300">
    <div class="flex size-10 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
        <UIcon name="i-lucide-layout-grid" class="size-5" />
    </div>

    <div class="flex-1 min-w-0">
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 leading-none mb-1">
        {{ userName ? `${userName}'s Workspace` : "Personal Workspace" }}
      </p>
      <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{{ nodesCount }} Nodes</span>
          <div class="size-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900 text-zinc-500" :class="badge.className">
            {{ badge.label }}
          </div>
      </div>
    </div>
  </div>
</template>
