<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";

import { useAgencyTimeTrackingStore } from "~/stores/agency-time-tracking";
import { withAgencyLiveQueryOptions } from "~/utils/agency-query-options";
import { formatDuration } from "~/utils/format-duration";

const props = defineProps<{
  teamId: string;
  taskId: string;
  projectId?: string;
  taskTitle?: string;
  projectName?: string;
}>();

const orpc = useOrpc();
const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
const { isTimerMutationPending } = storeToRefs(agencyTimeTrackingStore);

const now = ref(Date.now());
let tickerHandle: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  tickerHandle = setInterval(() => {
    now.value = Date.now();
  }, 1_000);
});

onBeforeUnmount(() => {
  if (tickerHandle) {
    clearInterval(tickerHandle);
    tickerHandle = null;
  }
});

const activeTimerQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.timer.getActive.queryOptions({
        input: { teamId: props.teamId || undefined },
      }),
      enabled: Boolean(props.teamId),
    }),
  ),
);

const activeTimer = computed(() => activeTimerQuery.data.value?.timer ?? null);
const isRunningForThisTask = computed(
  () => activeTimer.value?.taskId === props.taskId && activeTimer.value.teamId === props.teamId,
);

const elapsedSeconds = computed(() => {
  if (!activeTimer.value || !isRunningForThisTask.value) return 0;
  const startedAt = new Date(activeTimer.value.startedAt).getTime();
  if (Number.isNaN(startedAt)) return 0;
  return Math.max(0, Math.floor((now.value - startedAt) / 1_000));
});

async function toggleTimer() {
  if (!props.teamId || !props.projectId || !props.taskId) return;

  if (isRunningForThisTask.value && activeTimer.value) {
    await agencyTimeTrackingStore.stopTimer({
      teamId: props.teamId,
      description: activeTimer.value.description,
      linkUrl: activeTimer.value.linkUrl ?? "",
      tagIds: activeTimer.value.tags.map((t) => t.id),
      selectedTags: activeTimer.value.tags,
    });
    return;
  }

  await agencyTimeTrackingStore.startTimer({
    teamId: props.teamId,
    project: { id: props.projectId, name: props.projectName ?? "" },
    task: { id: props.taskId, title: props.taskTitle ?? "" },
    description: "",
    linkUrl: "",
    tagIds: [],
    selectedTags: [],
    successDescription: "Timer started for this task.",
  });
}
</script>

<template>
  <UButton
    :icon="isRunningForThisTask ? 'i-lucide-square' : 'i-lucide-play'"
    :color="isRunningForThisTask ? 'warning' : 'primary'"
    :variant="isRunningForThisTask ? 'soft' : 'solid'"
    size="xs"
    class="tabular-nums"
    :disabled="!projectId || !taskId || isTimerMutationPending"
    :loading="isTimerMutationPending"
    @click="toggleTimer"
  >
    {{ isRunningForThisTask ? formatDuration(elapsedSeconds) : "Track" }}
  </UButton>
</template>
