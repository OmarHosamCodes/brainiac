<script setup lang="ts">
defineProps<{
  content: string;
  selected: boolean;
}>();
</script>

<template>
  <div class="node-card flex h-full min-h-0 flex-col px-4 pb-4 pt-1">
    <div class="mb-2 flex shrink-0 items-center justify-end">
      <span
        class="rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide"
        :class="
          selected
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-muted/60 bg-elevated/80 text-toned'
        "
      >
        {{ selected ? "Selected" : "Saved" }}
      </span>
    </div>
    <p class="min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-toned">
      {{ content || "No content yet. Right-click the card to edit." }}
    </p>
  </div>
</template>

<style scoped>
.node-card {
  height: 100%;
}
</style>
