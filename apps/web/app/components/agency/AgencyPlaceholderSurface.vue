<script setup lang="ts">
/**
 * Agency placeholder surface — honest empty-state for segments whose data
 * model isn't backed yet. Aspirational by design: teaches the eventual shape.
 */
defineProps<{
  icon: string;
  title: string;
  body: string;
  /** Optional bullet list teaching what this surface will eventually show. */
  hints?: string[];
}>();
</script>

<template>
  <div class="rounded-2xl border border-dashed border-default bg-muted/20 px-6 py-12 text-center">
    <UIcon :name="icon" class="mx-auto size-7 text-muted" />
    <p class="mt-4 text-sm font-bold text-highlighted">{{ title }}</p>
    <p class="mx-auto mt-1 max-w-md text-xs text-muted">{{ body }}</p>

    <ul
      v-if="hints && hints.length > 0"
      class="mx-auto mt-6 max-w-md space-y-2 text-left text-xs text-muted"
    >
      <li v-for="(hint, index) in hints" :key="index" class="flex items-start gap-2">
        <UIcon name="i-lucide-corner-down-right" class="size-3.5 shrink-0 text-dimmed mt-0.5" />
        <span>{{ hint }}</span>
      </li>
    </ul>
  </div>
</template>
