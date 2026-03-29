<script setup lang="ts">
import {
  createWorkspaceLeadershipRhythmFilter,
  createWorkspaceLeadershipRhythmMeeting,
  getLeadershipRhythmPlannerSummary,
  isLeadershipMeetingMissed,
  isLeadershipMeetingUpcoming,
  matchesLeadershipRhythmFilter,
  sortLeadershipRhythmMeetings,
  workspaceLeadershipMeetingStatusLabels,
  workspaceLeadershipRhythmFilterLabels,
  workspaceLeadershipRhythmLabels,
  type WorkspaceLeadershipMeetingStatus,
  type WorkspaceLeadershipRhythm,
  type WorkspaceLeadershipRhythmFilter,
  type WorkspaceLeadershipRhythmPlannerBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceLeadershipRhythmPlannerBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getLeadershipRhythmPlannerSummary(props.block));

const rhythmOptions: Array<{ label: string; value: WorkspaceLeadershipRhythm }> = [
  { label: workspaceLeadershipRhythmLabels.weekly, value: "weekly" },
  { label: workspaceLeadershipRhythmLabels.monthly, value: "monthly" },
  { label: workspaceLeadershipRhythmLabels.quarterly, value: "quarterly" },
];

const filterOptions: WorkspaceLeadershipRhythmFilter[] = ["all", "missed", "upcoming"];
const statusOptions: WorkspaceLeadershipMeetingStatus[] = [
  "scheduled",
  "missed",
  "done",
  "needs-reschedule",
];

const visibleMeetings = computed(() =>
  sortLeadershipRhythmMeetings(props.block.meetings).filter((meeting) =>
    matchesLeadershipRhythmFilter(meeting, props.block.filter),
  ),
);

function toRhythm(value: string) {
  return value === "weekly" || value === "monthly" || value === "quarterly" ? value : "weekly";
}

function addMeeting() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "leadership-rhythm-planner") {
      return;
    }

    block.meetings.push(
      createWorkspaceLeadershipRhythmMeeting({
        name: "New recurring meeting",
        rhythm: "weekly",
        status: "scheduled",
      }),
    );
  });
}

function mutateMeeting(
  meetingId: string,
  mutator: (meeting: WorkspaceLeadershipRhythmPlannerBlock["meetings"][number]) => void,
) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "leadership-rhythm-planner") {
      return;
    }

    const meeting = block.meetings.find((entry) => entry.id === meetingId);

    if (!meeting) {
      return;
    }

    mutator(meeting);
  });
}

function removeMeeting(meetingId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "leadership-rhythm-planner") {
      return;
    }

    block.meetings = block.meetings.filter((meeting) => meeting.id !== meetingId);
  });
}

function getMeetingClasses(meeting: WorkspaceLeadershipRhythmPlannerBlock["meetings"][number]) {
  if (meeting.status === "done") {
    return "border-success/30 bg-success/5";
  }

  if (isLeadershipMeetingMissed(meeting) || meeting.status === "needs-reschedule") {
    return "border-error/30 bg-error/5";
  }

  if (isLeadershipMeetingUpcoming(meeting)) {
    return "border-primary/30 bg-primary/5";
  }

  return "border-muted/30 bg-default/70";
}

function getFilterCount(filter: WorkspaceLeadershipRhythmFilter) {
  return props.block.meetings.filter((meeting) => matchesLeadershipRhythmFilter(meeting, filter))
    .length;
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
          Cadence Health
        </p>
        <p class="mt-2 text-4xl font-black tracking-tight text-primary">
          {{ summary.cadenceHealthPercent }}%
        </p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">Upcoming</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-success">
          {{ summary.upcomingCount }}
        </p>
      </div>

      <div class="rounded-[28px] bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-error/70">Missed</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-error">{{ summary.missedCount }}</p>
      </div>

      <div class="rounded-[28px] bg-secondary/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary/80">Meetings</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-secondary">
          {{ summary.totalMeetings }}
        </p>
      </div>
    </div>

    <section class="rounded-[32px] border border-muted/30 bg-default/70 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-highlighted">Leadership rhythm planner</p>
          <p class="text-sm text-muted">
            Keep the recurring management cadence visible so reviews do not silently disappear.
          </p>
        </div>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          @click="addMeeting"
        >
          Add Recurring Meeting
        </UButton>
      </div>

      <div class="mt-4 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
            Cadence coverage
          </p>
          <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {{ summary.cadenceHealthPercent }}% on track
          </span>
        </div>
        <UProgress
          :model-value="summary.cadenceHealthPercent"
          :max="100"
          color="primary"
          class="rounded-full"
        />
      </div>
    </section>

    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="filter in filterOptions"
        :key="filter"
        :color="block.filter === filter ? 'primary' : 'neutral'"
        :variant="block.filter === filter ? 'soft' : 'ghost'"
        class="rounded-full px-4"
        @click="
          mutateBlock(tabId, block.id, (entry) => {
            if (entry.type !== 'leadership-rhythm-planner') return;
            entry.filter = createWorkspaceLeadershipRhythmFilter(filter);
          })
        "
      >
        {{ workspaceLeadershipRhythmFilterLabels[filter] }} · {{ getFilterCount(filter) }}
      </UButton>
    </div>

    <div
      v-if="visibleMeetings.length === 0"
      class="rounded-[32px] border border-dashed border-muted/40 bg-elevated/10 py-14 text-center"
    >
      <p class="text-sm font-semibold text-muted">No meetings match this filter.</p>
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="meeting in visibleMeetings"
        :key="meeting.id"
        class="rounded-[34px] border p-5"
        :class="getMeetingClasses(meeting)"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              <UInput
                :model-value="meeting.name"
                variant="none"
                placeholder="Meeting name"
                class="min-w-[14rem] flex-1"
                :ui="{ base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60' }"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.name = ($event ?? '').slice(0, 120);
                  })
                "
              />

              <UBadge
                :color="
                  isLeadershipMeetingMissed(meeting)
                    ? 'error'
                    : meeting.status === 'done'
                      ? 'success'
                      : 'primary'
                "
                variant="soft"
                size="sm"
              >
                {{ workspaceLeadershipMeetingStatusLabels[meeting.status] }}
              </UBadge>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="status in statusOptions"
                :key="`${meeting.id}-${status}`"
                size="sm"
                :color="meeting.status === status ? 'primary' : 'neutral'"
                :variant="meeting.status === status ? 'soft' : 'outline'"
                class="rounded-full px-4"
                @click="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.status = status;
                  })
                "
              >
                {{ workspaceLeadershipMeetingStatusLabels[status] }}
              </UButton>
            </div>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            class="rounded-xl hover:bg-error/10 hover:text-error"
            @click="removeMeeting(meeting.id)"
          />
        </div>

        <div class="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.52fr)_minmax(0,0.48fr)]">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Owner" size="sm">
              <UInput
                :model-value="meeting.owner"
                class="rounded-2xl"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.owner = ($event ?? '').slice(0, 120);
                  })
                "
              />
            </UFormField>

            <UFormField label="Participants" size="sm">
              <UInput
                :model-value="meeting.participants"
                class="rounded-2xl"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.participants = ($event ?? '').slice(0, 240);
                  })
                "
              />
            </UFormField>

            <UFormField label="Frequency" size="sm">
              <USelect
                :model-value="meeting.rhythm"
                :items="rhythmOptions"
                class="rounded-2xl"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.rhythm = toRhythm($event);
                  })
                "
              />
            </UFormField>

            <UFormField label="Next Date" size="sm">
              <UInput
                :model-value="meeting.nextDate ?? ''"
                type="date"
                class="rounded-2xl"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.nextDate = $event || null;
                  })
                "
              />
            </UFormField>
          </div>

          <div class="grid gap-4 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,0.3fr)]">
            <UFormField label="Purpose" size="sm" class="sm:col-span-2">
              <UTextarea
                :model-value="meeting.purpose"
                autoresize
                :rows="4"
                class="rounded-2xl"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.purpose = ($event ?? '').slice(0, 4000);
                  })
                "
              />
            </UFormField>

            <UFormField label="Duration (min)" size="sm">
              <UInput
                :model-value="String(meeting.durationMinutes)"
                type="number"
                class="rounded-2xl"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.durationMinutes = Math.min(
                      480,
                      Math.max(15, Math.round(Number($event || entry.durationMinutes))),
                    );
                  })
                "
              />
            </UFormField>

            <div class="flex items-end">
              <div
                class="w-full rounded-[22px] border border-muted/25 bg-elevated/20 px-4 py-3 text-sm text-toned"
              >
                <span class="font-semibold text-highlighted">{{
                  workspaceLeadershipRhythmLabels[meeting.rhythm]
                }}</span>
                <span class="text-muted"> cadence</span>
                <span
                  v-if="isLeadershipMeetingUpcoming(meeting)"
                  class="block text-xs font-semibold uppercase tracking-[0.18em] text-primary"
                  >Upcoming</span
                >
                <span
                  v-else-if="isLeadershipMeetingMissed(meeting)"
                  class="block text-xs font-semibold uppercase tracking-[0.18em] text-error"
                  >Needs attention</span
                >
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
