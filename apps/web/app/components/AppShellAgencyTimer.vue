<script setup lang="ts">
/**
 * Persistent agency timer module — lives in the global app shell topbar.
 *
 * States:
 *   unavailable  — no current agency team. Renders nothing.
 *   idle         — no header control; timers start from the Agency Time tab.
 *   running      — Operator Emerald pill, mono ticking duration, no controls.
 *   saving       — running visuals + spinner-only indicator.
 *   sync-failed  — renders nothing; the Time tab owns recovery controls.
 */
import { usePersistentTimer } from "~/composables/usePersistentTimer";
import { projectHueStyle } from "~/utils/project-palette";
import { formatDuration } from "~/utils/format-duration";

const router = useRouter();
const route = useRoute();

const { state, activeTimer, elapsedSeconds } = usePersistentTimer();

const onAgencyRoute = computed(() => route.path.startsWith("/agency"));

function goToAgency() {
  if (!onAgencyRoute.value) {
    router.push("/agency");
  }
}

const projectStyle = computed(() =>
  activeTimer.value ? projectHueStyle(activeTimer.value.projectId) : {},
);

const timerLabel = computed(() => {
  const timer = activeTimer.value;
  if (!timer) return "";
  return timer.description || timer.taskTitle || timer.projectName;
});
</script>

<template>
  <!-- Running / saving: read-only Operator Emerald indicator. -->
  <button
    v-if="(state === 'running' || state === 'saving') && activeTimer"
    type="button"
    class="inline-flex min-w-0 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-left text-xs text-primary transition-colors hover:bg-primary/15 hover:text-highlighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    :class="state === 'running' ? 'agency-timer--running' : ''"
    :style="projectStyle"
    :title="`Timer running on ${activeTimer.taskTitle || activeTimer.projectName}`"
    @click="goToAgency"
  >
    <span class="agency-timer__dot inline-block size-2 shrink-0 rounded-full" aria-hidden="true" />
    <span class="truncate font-bold max-w-[12rem]">
      {{ timerLabel }}
    </span>
    <span class="font-mono font-bold tabular-nums text-highlighted">
      {{ formatDuration(elapsedSeconds) }}
    </span>
    <span v-if="state === 'saving'" class="inline-flex" role="status" aria-label="Saving timer">
      <UIcon name="i-lucide-loader-2" class="size-3.5 animate-spin" />
    </span>
  </button>
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
  0%,
  100% {
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
