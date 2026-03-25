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
  <div class="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 px-4">
    <div
      class="pointer-events-auto flex items-center gap-3 rounded-full border border-muted/70 bg-default/90 px-4 py-2 shadow-lg shadow-black/5 backdrop-blur-md"
    >
      <div>
        <div class="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted">
          Workspace
        </div>
        <div class="text-sm font-semibold text-highlighted">
          {{ userName ? `${userName}'s board` : "Personal board" }}
        </div>
      </div>
      <div class="h-8 w-px bg-border" />
      <div class="text-sm text-toned">{{ nodesCount }} node{{ nodesCount === 1 ? "" : "s" }}</div>
      <div class="rounded-full border px-3 py-1 text-xs font-medium" :class="badge.className">
        {{ badge.label }}
      </div>
    </div>
  </div>
</template>
