<script setup lang="ts">
/**
 * Compact agency header for the app shell context slot: team + current section.
 * Full segment tabs live in AgencySegmentBar below the shell.
 */
import type { AgencyLiveConnectionState } from "~/utils/agency-live-rpc";

import type { AgencySegmentId } from "./agency-segments";
import { AGENCY_SEGMENTS } from "./agency-segments";
import { agencyFocusRingClass } from "~/utils/agency-ui";

const props = defineProps<{
  segment: AgencySegmentId;
  teamId: string;
  teams: Array<{ id: string; name: string }>;
  connectionState?: AgencyLiveConnectionState;
}>();

const emit = defineEmits<{
  "update:segment": [value: AgencySegmentId];
  "update:teamId": [value: string];
}>();

const teamSelectorOpen = ref(false);
const segmentPopoverOpen = ref(false);

const currentSegment = computed(
  () => AGENCY_SEGMENTS.find((entry) => entry.id === props.segment) ?? AGENCY_SEGMENTS[0]!,
);
const currentTeam = computed(
  () => props.teams.find((team) => team.id === props.teamId) ?? props.teams[0] ?? null,
);
const isMultiTeam = computed(() => props.teams.length > 1);

const liveStatusLabel = computed(() => {
  const state = props.connectionState;
  if (!state) return "";
  switch (state) {
    case "live":
      return "Live sync";
    case "reconnecting":
      return "Reconnecting";
    case "error":
      return "Sync interrupted";
    case "connecting":
      return "Connecting";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
});

const liveStatusDotClass = computed(() => {
  const state = props.connectionState;
  if (!state) return "bg-muted";
  switch (state) {
    case "live":
      return "bg-success";
    case "error":
      return "bg-error";
    case "reconnecting":
    case "connecting":
      return "bg-muted";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
});

function selectSegment(nextSegment: AgencySegmentId) {
  segmentPopoverOpen.value = false;
  if (nextSegment === props.segment) return;
  emit("update:segment", nextSegment);
}

function selectTeam(nextTeamId: string) {
  teamSelectorOpen.value = false;
  if (nextTeamId === props.teamId) return;
  emit("update:teamId", nextTeamId);
}

let pendingPrefix = false;
let prefixTimer: ReturnType<typeof setTimeout> | null = null;

function clearPrefix() {
  pendingPrefix = false;
  if (prefixTimer) {
    clearTimeout(prefixTimer);
    prefixTimer = null;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    clearPrefix();
    return;
  }
  const target = event.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  ) {
    clearPrefix();
    return;
  }

  const key = event.key.toLowerCase();

  if (!pendingPrefix) {
    if (key === "g") {
      pendingPrefix = true;
      prefixTimer = setTimeout(clearPrefix, 1_000);
      return;
    }
    return;
  }

  const match = AGENCY_SEGMENTS.find((entry) => entry.shortcutKey === key);
  if (match) {
    event.preventDefault();
    selectSegment(match.id);
  }
  clearPrefix();
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  clearPrefix();
});
</script>

<template>
  <div class="flex min-w-0 items-center gap-2">
    <UPopover v-if="isMultiTeam" v-model:open="teamSelectorOpen" :content="{ align: 'start' }">
      <button
        type="button"
        :class="[
          'inline-flex max-w-[9rem] items-center gap-1.5 rounded-full border border-default bg-muted px-2.5 py-1 text-xs font-bold text-highlighted transition-colors hover:bg-elevated',
          agencyFocusRingClass,
        ]"
      >
        <UIcon name="i-lucide-users" class="size-3.5 shrink-0 text-muted" />
        <span class="truncate">{{ currentTeam?.name ?? "Team" }}</span>
        <UIcon name="i-lucide-chevron-down" class="size-3 shrink-0 text-muted" />
      </button>

      <template #content>
        <div class="w-56 p-1">
          <button
            v-for="team in teams"
            :key="team.id"
            type="button"
            class="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-muted transition-colors hover:bg-elevated hover:text-highlighted"
            :class="team.id === teamId ? 'bg-primary/10 text-primary' : ''"
            @click="selectTeam(team.id)"
          >
            <span class="truncate">{{ team.name }}</span>
            <UIcon v-if="team.id === teamId" name="i-lucide-check" class="size-3.5 shrink-0" />
          </button>
        </div>
      </template>
    </UPopover>

    <div
      v-else-if="currentTeam"
      class="inline-flex max-w-[9rem] items-center gap-1.5 rounded-full border border-default bg-muted px-2.5 py-1 text-xs font-bold text-highlighted"
      :title="`Team · ${currentTeam.name}`"
    >
      <UIcon name="i-lucide-users" class="size-3.5 shrink-0 text-muted" />
      <span class="truncate">{{ currentTeam.name }}</span>
    </div>

    <span class="hidden text-dimmed sm:inline" aria-hidden="true">/</span>

    <UPopover v-model:open="segmentPopoverOpen" :content="{ align: 'start' }">
      <button
        type="button"
        :class="[
          'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-highlighted transition-colors hover:bg-elevated',
          agencyFocusRingClass,
        ]"
      >
        <UIcon :name="currentSegment.icon" class="size-3.5 text-muted" />
        <span>{{ currentSegment.label }}</span>
        <UIcon name="i-lucide-chevron-down" class="size-3 text-muted" />
      </button>

      <template #content>
        <div class="w-52 p-1">
          <button
            v-for="entry in AGENCY_SEGMENTS"
            :key="entry.id"
            type="button"
            class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-muted transition-colors hover:bg-elevated hover:text-highlighted"
            :class="entry.id === segment ? 'bg-primary/10 text-primary' : ''"
            @click="selectSegment(entry.id)"
          >
            <UIcon :name="entry.icon" class="size-3.5" />
            <span>{{ entry.label }}</span>
          </button>
        </div>
      </template>
    </UPopover>

    <div
      v-if="connectionState"
      class="ml-1 inline-flex shrink-0 items-center"
      :title="liveStatusLabel"
      role="status"
      :aria-label="liveStatusLabel"
      :aria-live="connectionState === 'error' ? 'assertive' : 'polite'"
    >
      <span
        class="inline-block size-1.5 rounded-full"
        :class="liveStatusDotClass"
        aria-hidden="true"
      />
    </div>
  </div>
</template>
