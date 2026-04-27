<script setup lang="ts">
const { checkout } = useBilling();

async function handleUpgrade() {
  await checkout("pro");
}
</script>

<template>
  <div
    class="flex min-h-[60vh] items-center justify-center rounded-3xl border border-dashed border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-zinc-950/40 to-zinc-950/60 p-8 backdrop-blur-sm"
  >
    <div class="max-w-md text-center">
      <div
        class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20"
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
