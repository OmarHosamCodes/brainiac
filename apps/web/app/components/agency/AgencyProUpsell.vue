<script setup lang="ts">
const { checkout } = useBilling();

async function handleUpgrade() {
  await checkout("pro");
}
</script>

<template>
  <div
    class="flex min-h-[60vh] items-center justify-center rounded-3xl border border-dashed border-primary/30 bg-elevated p-8"
  >
    <div class="max-w-md text-center">
      <div
        class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"
      >
        <UIcon name="i-lucide-sparkles" class="size-7" />
      </div>
      <h2 class="text-xl font-semibold text-highlighted">Agency tools are a Pro feature</h2>
      <p class="mt-2 text-sm text-muted">
        Track time, manage clients and projects, and report across your team. Upgrade to unlock the
        full agency toolkit.
      </p>
      <div class="mt-6 flex items-center justify-center gap-2">
        <UButton color="primary" size="md" icon="i-lucide-zap" @click="handleUpgrade">
          Upgrade to Pro
        </UButton>
        <UButton color="neutral" variant="ghost" size="md" to="/pricing"> See pricing </UButton>
      </div>
    </div>
  </div>
</template>
