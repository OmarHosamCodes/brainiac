<script setup lang="ts">
// Legacy stub for agency-* block types. The functional UI now lives at /agency.
// We keep the registry entries to satisfy the workspace block schema type
// constraint, but no one should be authoring these blocks anymore.
</script>

<template>
  <div
    class="flex items-start gap-3 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4"
  >
    <UIcon name="i-lucide-info" class="mt-0.5 size-5 shrink-0 text-amber-500" />
    <div class="flex-1">
      <p class="text-sm font-medium text-highlighted">Agency tools have moved</p>
      <p class="mt-1 text-xs text-muted">
        Time tracking and agency management now live on the dedicated Agency page.
      </p>
      <UButton
        to="/agency"
        size="xs"
        color="primary"
        variant="soft"
        icon="i-lucide-arrow-right"
        class="mt-3"
        label="Open Agency"
      />
    </div>
  </div>
</template>
