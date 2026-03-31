<script setup lang="ts">
import type { WorkspaceWorkforceManagementBlock } from "@brainiac/workspace";

defineProps<{
  block: WorkspaceWorkforceManagementBlock;
  tabId: string;
}>();
</script>

<template>
  <div class="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-6">
    <div class="flex items-start gap-3">
      <span
        class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"
      >
        <UIcon name="i-lucide-users-round" class="size-5" />
      </span>

      <div class="space-y-2">
        <p class="text-sm font-semibold text-highlighted">Workforce Management placeholder</p>
        <p class="text-sm text-muted">
          This temporary block is team-only and will be replaced with the full Workforce Management
          experience in a later update.
        </p>
      </div>
    </div>
  </div>
</template>
