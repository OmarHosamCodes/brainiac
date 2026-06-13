<script setup lang="ts">
const { checkout } = useBilling();

const isLoading = ref(false);
const upgradeError = ref("");

async function handleUpgrade() {
  isLoading.value = true;
  upgradeError.value = "";
  try {
    await checkout("pro");
  } catch {
    upgradeError.value = "Something went wrong. Try again.";
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center py-16">
    <div class="w-full max-w-lg px-4 text-center sm:text-left">
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Pro plan</p>
      <h2 class="mt-2 text-xl font-bold text-highlighted">Agency tools</h2>
      <p class="mt-3 text-sm text-muted">
        Track time, manage projects and clients, run reports, and handle billing for your team.
        Available on Pro.
      </p>

      <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <UButton color="primary" size="md" :loading="isLoading" @click="handleUpgrade">
          Upgrade to Pro
        </UButton>
        <UButton color="neutral" variant="ghost" size="sm" to="/#pricing"> View pricing </UButton>
      </div>

      <p v-if="upgradeError" class="mt-3 text-[11px] text-error" role="alert">
        {{ upgradeError }}
      </p>
    </div>
  </div>
</template>
