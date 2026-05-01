<script setup lang="ts">
/**
 * Persistent agency timer module — lives in the global app shell topbar.
 *
 * States:
 *   unavailable  — no current agency team. Renders nothing.
 *   idle         — link to /agency to start a timer (calmer than a popover).
 *   running      — Operator Emerald pill, mono ticking duration, stop button.
 *   saving       — running visuals + spinner.
 *   sync-failed  — neutral pill with retry.
 */
import { usePersistentTimer } from "~/composables/usePersistentTimer";
import { projectHueStyle } from "~/utils/project-palette";
import { formatDuration } from "~/utils/format-duration";

const router = useRouter();
const route = useRoute();

const { state, activeTimer, elapsedSeconds, stop, refetch } = usePersistentTimer();

const onAgencyRoute = computed(() => route.path.startsWith("/agency"));

function goToAgency() {
  if (!onAgencyRoute.value) {
    router.push("/agency");
  }
}

const projectStyle = computed(() =>
  activeTimer.value ? projectHueStyle(activeTimer.value.projectId) : {},
);
</script>

<template>
  <!-- Idle: compact link, calmer than empty space, only when team is selected. -->
  <button
    v-if="state === 'idle'"
    type="button"
    class="hidden md:inline-flex items-center gap-2 rounded-full border border-default bg-default px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-elevated hover:text-highlighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    title="Start a timer in Agency"
    @click="goToAgency"
  >
    <UIcon name="i-lucide-play" class="size-3.5" />
    <span>Start timer</span>
  </button>

  <!-- Sync-failed: neutral retry pill. -->
  <button
    v-else-if="state === 'sync-failed'"
    type="button"
    class="inline-flex items-center gap-2 rounded-full border border-default bg-default px-3 py-1.5 text-xs font-bold text-error transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
    title="Couldn't sync the timer. Retry."
    @click="refetch()"
  >
    <UIcon name="i-lucide-alert-triangle" class="size-3.5" />
    <span>Retry</span>
  </button>

  <!-- Running / saving: Operator Emerald pill with hue dot, project, duration. -->
  <div
    v-else-if="(state === 'running' || state === 'saving') && activeTimer"
    class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs"
    :class="state === 'running' ? 'agency-timer--running' : ''"
    :style="projectStyle"
  >
    <button
      type="button"
      class="flex min-w-0 items-center gap-2 text-left text-primary transition-colors hover:text-highlighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full"
      :title="`Open ${activeTimer.projectName} in Agency`"
      @click="goToAgency"
    >
      <span
        class="agency-timer__dot inline-block size-2 shrink-0 rounded-full"
        aria-hidden="true"
      />
      <span class="truncate font-bold max-w-[12rem]">
        {{ activeTimer.description || activeTimer.projectName }}
      </span>
      <span class="font-mono font-bold tabular-nums text-highlighted">
        {{ formatDuration(elapsedSeconds, "short") }}
      </span>
    </button>

    <button
      type="button"
      class="flex size-6 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/15 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      :disabled="state === 'saving'"
      :title="state === 'saving' ? 'Saving timer' : 'Stop and save timer'"
      :aria-label="state === 'saving' ? 'Saving timer' : 'Stop and save timer'"
      @click="stop"
    >
      <UIcon
        :name="state === 'saving' ? 'i-lucide-loader-2' : 'i-lucide-square'"
        class="size-3.5"
        :class="state === 'saving' ? 'animate-spin' : ''"
      />
    </button>
  </div>
</template>

<style scoped>
.agency-timer__dot {
  background-color: var(--project-hue, var(--ui-color-primary-500));
}

:global(.dark) .agency-timer__dot {
  background-color: var(--project-hue-dark, var(--ui-color-primary-400));
}

.agency-timer--running .agency-timer__dot {
  animation: agency-timer-pulse 1.6s ease-in-out infinite;
}

@keyframes agency-timer-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(1.15);
  }
}

@media (prefers-reduced-motion: reduce) {
  .agency-timer--running .agency-timer__dot {
    animation: none;
  }
}
</style>
