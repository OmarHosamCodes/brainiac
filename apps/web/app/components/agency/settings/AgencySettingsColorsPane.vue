<script setup lang="ts">
import { agencyEmptyPanelClass, agencySectionTitleClass } from "~/utils/agency-ui";
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 :class="agencySectionTitleClass">Project colors</h2>
      <p class="mt-1 text-sm text-muted">
        Each project gets a stable color, auto-assigned from a 12-hue palette.
      </p>
    </div>

    <div :class="agencyEmptyPanelClass">
      <UIcon name="i-lucide-palette" class="mx-auto size-6 text-muted" />
      <p class="mt-3 text-sm font-bold text-highlighted">Coming soon</p>
      <p class="mx-auto mt-1 max-w-md text-xs text-muted">
        Once override ships, you will be able to lock a hue per project here. The palette is
        OKLCH-based and tuned for both light and dark themes.
      </p>
    </div>
  </div>
</template>
