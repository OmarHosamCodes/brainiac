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
  <div class="space-y-5">
    <!-- Executive Summary -->
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 class="text-sm font-black text-highlighted tracking-tight">
            Leadership Rhythm Planner
          </h2>
          <p class="text-xs text-muted">Track recurring meetings to prevent cadence gaps.</p>
        </div>
        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          size="sm"
          class="rounded-full"
          @click="addMeeting"
        >
          Add Meeting
        </UButton>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl bg-primary/5 p-4 border border-primary/10">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
            Cadence Health
          </p>
          <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary">
            {{ summary.cadenceHealthPercent }}%
          </p>
        </div>

        <div class="rounded-2xl bg-success/5 p-4 border border-success/10">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/60">Upcoming</p>
          <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-success">
            {{ summary.upcomingCount }}
          </p>
        </div>

        <div class="rounded-2xl bg-error/5 p-4 border border-error/10">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/60">Missed</p>
          <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-error">
            {{ summary.missedCount }}
          </p>
        </div>

        <div class="rounded-2xl bg-secondary/5 p-4 border border-secondary/10">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">Total</p>
          <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-secondary">
            {{ summary.totalMeetings }}
          </p>
        </div>
      </div>

      <div class="rounded-2xl border border-muted/20 bg-default/40 p-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Cadence coverage
          </p>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-primary/60">
              {{ summary.cadenceHealthPercent }}% on track
            </span>
          </div>
        </div>
        <UProgress
          :model-value="summary.cadenceHealthPercent"
          :max="100"
          size="sm"
          class="mt-2 rounded-full"
        />
      </div>
    </section>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 px-1">
      <UButton
        v-for="filter in filterOptions"
        :key="filter"
        :color="block.filter === filter ? 'primary' : 'neutral'"
        :variant="block.filter === filter ? 'subtle' : 'ghost'"
        class="rounded-full px-3"
        size="sm"
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

    <!-- Empty State -->
    <div
      v-if="visibleMeetings.length === 0"
      class="border-dashed border-muted/20 rounded-2xl py-10 text-center bg-elevated/5"
    >
      <div
        class="flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted/30 mx-auto"
      >
        <UIcon name="i-lucide-calendar" size="24" />
      </div>
      <p class="mt-3 text-xs font-bold text-muted">No meetings match this filter</p>
    </div>

    <!-- Meeting Cards -->
    <div v-else class="space-y-3">
      <article
        v-for="meeting in visibleMeetings"
        :key="meeting.id"
        class="rounded-2xl border border-muted/20 p-4 transition-all"
        :class="getMeetingClasses(meeting)"
      >
        <!-- Header: Name + Status + Delete -->
        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div class="min-w-0 flex-1">
            <UInput
              :model-value="meeting.name"
              variant="none"
              placeholder="Meeting name"
              class="w-full"
              :ui="{
                base: 'px-0 text-base font-black text-highlighted placeholder:text-muted/30 uppercase tracking-tight',
              }"
              @update:model-value="
                mutateMeeting(meeting.id, (entry) => {
                  entry.name = ($event ?? '').slice(0, 120);
                })
              "
            />
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <UBadge
              :color="
                isLeadershipMeetingMissed(meeting)
                  ? 'error'
                  : meeting.status === 'done'
                    ? 'success'
                    : 'primary'
              "
              variant="soft"
              size="md"
              class="rounded-lg px-3"
            >
              {{ workspaceLeadershipMeetingStatusLabels[meeting.status] }}
            </UBadge>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="sm"
              class="rounded-lg hover:text-error hover:bg-error/10"
              aria-label="Remove meeting"
              @click="removeMeeting(meeting.id)"
            />
          </div>
        </div>

        <!-- Status Quick Actions -->
        <div class="flex flex-wrap gap-1.5 mb-4">
          <UButton
            v-for="status in statusOptions"
            :key="`${meeting.id}-${status}`"
            size="xs"
            :color="meeting.status === status ? 'primary' : 'neutral'"
            :variant="meeting.status === status ? 'subtle' : 'ghost'"
            class="rounded-full px-3"
            @click="
              mutateMeeting(meeting.id, (entry) => {
                entry.status = status;
              })
            "
          >
            {{ workspaceLeadershipMeetingStatusLabels[status] }}
          </UButton>
        </div>

        <!-- Details Grid -->
        <div class="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <!-- Left: Basic Info -->
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
              >
                Owner
              </label>
              <UInput
                :model-value="meeting.owner"
                variant="subtle"
                size="sm"
                class="rounded-xl"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.owner = ($event ?? '').slice(0, 120);
                  })
                "
              />
            </div>

            <div>
              <label
                class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
              >
                Participants
              </label>
              <UInput
                :model-value="meeting.participants"
                variant="subtle"
                size="sm"
                class="rounded-xl"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.participants = ($event ?? '').slice(0, 240);
                  })
                "
              />
            </div>

            <div>
              <label
                class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
              >
                Frequency
              </label>
              <USelect
                :model-value="meeting.rhythm"
                :items="rhythmOptions"
                variant="subtle"
                size="sm"
                class="rounded-xl"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.rhythm = toRhythm($event);
                  })
                "
              />
            </div>

            <div>
              <label
                class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
              >
                Next Date
              </label>
              <UInput
                :model-value="meeting.nextDate ?? ''"
                type="date"
                variant="subtle"
                size="sm"
                class="rounded-xl"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.nextDate = $event || null;
                  })
                "
              />
            </div>
          </div>

          <!-- Right: Purpose + Status Summary -->
          <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div class="sm:col-span-2">
              <label
                class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
              >
                Purpose & Agenda
              </label>
              <UTextarea
                :model-value="meeting.purpose"
                variant="subtle"
                autoresize
                :rows="3"
                class="rounded-2xl"
                :ui="{ base: 'bg-elevated/5' }"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.purpose = ($event ?? '').slice(0, 4000);
                  })
                "
              />
            </div>

            <div>
              <label
                class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
              >
                Duration (min)
              </label>
              <UInput
                :model-value="String(meeting.durationMinutes)"
                type="number"
                variant="subtle"
                size="sm"
                class="w-20 rounded-xl"
                @update:model-value="
                  mutateMeeting(meeting.id, (entry) => {
                    entry.durationMinutes = Math.min(
                      480,
                      Math.max(15, Math.round(Number($event || entry.durationMinutes))),
                    );
                  })
                "
              />
            </div>

            <div
              class="flex flex-col justify-center rounded-xl border border-muted/20 bg-default/60 px-3 py-2.5 min-w-[120px]"
            >
              <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">{{
                workspaceLeadershipRhythmLabels[meeting.rhythm]
              }}</span>
              <span
                v-if="isLeadershipMeetingUpcoming(meeting)"
                class="mt-1 text-sm font-black text-primary tracking-tight"
                >Upcoming</span
              >
              <span
                v-else-if="isLeadershipMeetingMissed(meeting)"
                class="mt-1 text-sm font-black text-error tracking-tight"
                >Attention</span
              >
              <span v-else class="mt-1 text-sm font-black text-highlighted tracking-tight"
                >On track</span
              >
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
