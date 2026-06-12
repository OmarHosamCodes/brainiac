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
    <div class="grid w-full max-w-2xl gap-10 px-4 sm:grid-cols-[1fr,auto] sm:items-start sm:gap-16">
      <!-- Left: value description -->
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Pro plan</p>
        <h2 class="mt-2 text-xl font-bold text-highlighted">Agency tools</h2>
        <p class="mt-3 text-sm text-muted">
          Time tracking, project management, and billing for your whole team.
        </p>
        <ul class="mt-6 space-y-3">
          <li class="flex items-start gap-3">
            <UIcon
              name="i-lucide-clock"
              class="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span class="text-sm text-highlighted">
              Track time across projects and members. Week grid, day log, live timer.
            </span>
          </li>
          <li class="flex items-start gap-3">
            <UIcon
              name="i-lucide-folder-kanban"
              class="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span class="text-sm text-highlighted">
              Manage clients and projects with budget tracking and utilization views.
            </span>
          </li>
          <li class="flex items-start gap-3">
            <UIcon
              name="i-lucide-receipt"
              class="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span class="text-sm text-highlighted">
              Report hours by client or project, export to CSV, and manage invoices.
            </span>
          </li>
        </ul>
      </div>

      <!-- Right: action -->
      <div class="flex shrink-0 flex-col items-start gap-3 sm:items-end sm:pt-1">
        <UButton color="primary" size="md" :loading="isLoading" @click="handleUpgrade">
          Upgrade to Pro
        </UButton>
        <UButton color="neutral" variant="ghost" size="sm" to="/#pricing"> View pricing </UButton>
        <p v-if="upgradeError" class="text-[11px] text-error" role="alert">
          {{ upgradeError }}
        </p>
      </div>
    </div>
  </div>
</template>
