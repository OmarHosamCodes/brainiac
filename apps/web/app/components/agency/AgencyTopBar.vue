<script setup lang="ts">
/**
 * Agency top-bar — replaces the legacy left sidebar.
 *
 * Anatomy: [team badge] · [segmented section nav] · [inline actions slot]
 * Subtitle row below on desktop; inline on mobile popover context.
 *
 * Keyboard: `g` then [w p c r u b s] jumps between segments.
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
const focusedTabIndex = ref(0);

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
  const idx = AGENCY_SEGMENTS.findIndex((entry) => entry.id === nextSegment);
  if (idx >= 0) focusedTabIndex.value = idx;
}

function selectTeam(nextTeamId: string) {
  teamSelectorOpen.value = false;
  if (nextTeamId === props.teamId) return;
  emit("update:teamId", nextTeamId);
}

function tabIdFor(segmentId: AgencySegmentId) {
  return `agency-tab-${segmentId}`;
}

function panelIdFor(segmentId: AgencySegmentId) {
  return `agency-panel-${segmentId}`;
}

function handleTabKeydown(event: KeyboardEvent, index: number) {
  const lastIndex = AGENCY_SEGMENTS.length - 1;
  let nextIndex = index;

  if (event.key === "ArrowRight") {
    event.preventDefault();
    nextIndex = index >= lastIndex ? 0 : index + 1;
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    nextIndex = index <= 0 ? lastIndex : index - 1;
  } else if (event.key === "Home") {
    event.preventDefault();
    nextIndex = 0;
  } else if (event.key === "End") {
    event.preventDefault();
    nextIndex = lastIndex;
  } else {
    return;
  }

  focusedTabIndex.value = nextIndex;
  const nextSegment = AGENCY_SEGMENTS[nextIndex];
  if (nextSegment) selectSegment(nextSegment.id);
}

watch(
  () => props.segment,
  (next) => {
    const idx = AGENCY_SEGMENTS.findIndex((entry) => entry.id === next);
    if (idx >= 0) focusedTabIndex.value = idx;
  },
  { immediate: true },
);

// `g` then [letter] segment jumps.
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
  <div class="agency-topbar space-y-2 border-b border-default pb-3">
    <div class="flex flex-wrap items-center gap-3">
      <!-- Team badge / selector -->
      <UPopover v-if="isMultiTeam" v-model:open="teamSelectorOpen" :content="{ align: 'start' }">
        <button
          type="button"
          :class="[
            'inline-flex items-center gap-2 rounded-full border border-default bg-muted px-3 py-1.5 text-xs font-bold text-highlighted transition-colors hover:bg-elevated',
            agencyFocusRingClass,
          ]"
        >
          <UIcon name="i-lucide-users" class="size-3.5 text-muted" />
          <span class="max-w-[10rem] truncate">{{ currentTeam?.name ?? "Select team" }}</span>
          <UIcon name="i-lucide-chevron-down" class="size-3 text-muted" />
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
        class="inline-flex items-center gap-2 rounded-full border border-default bg-muted px-3 py-1.5 text-xs font-bold text-highlighted"
        :title="`Team · ${currentTeam.name}`"
      >
        <UIcon name="i-lucide-users" class="size-3.5 text-muted" />
        <span class="max-w-[10rem] truncate">{{ currentTeam.name }}</span>
      </div>

      <!-- Segmented section nav, desktop -->
      <nav
        class="hidden flex-1 items-center gap-1 overflow-x-auto lg:flex"
        role="tablist"
        aria-label="Agency sections"
      >
        <button
          v-for="(entry, index) in AGENCY_SEGMENTS"
          :id="tabIdFor(entry.id)"
          :key="entry.id"
          type="button"
          role="tab"
          :aria-selected="entry.id === segment"
          :aria-controls="panelIdFor(entry.id)"
          :tabindex="entry.id === segment ? 0 : -1"
          :class="[
            'agency-topbar__seg inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-elevated hover:text-highlighted',
            agencyFocusRingClass,
            entry.id === segment ? 'bg-primary/10 text-primary' : '',
          ]"
          :title="`${entry.label} (g ${entry.shortcutKey})`"
          @click="selectSegment(entry.id)"
          @keydown="handleTabKeydown($event, index)"
        >
          <UIcon :name="entry.icon" class="size-3.5" />
          <span>{{ entry.label }}</span>
        </button>
      </nav>

      <!-- Segmented section nav, narrow -->
      <UPopover v-model:open="segmentPopoverOpen" :content="{ align: 'start' }" class="lg:hidden">
        <button
          type="button"
          :class="[
            'inline-flex flex-1 items-center justify-between gap-2 rounded-full border border-default bg-default px-3 py-1.5 text-xs font-bold text-highlighted transition-colors hover:bg-elevated',
            agencyFocusRingClass,
          ]"
        >
          <span class="inline-flex items-center gap-2">
            <UIcon :name="currentSegment.icon" class="size-3.5 text-muted" />
            <span>{{ currentSegment.label }}</span>
          </span>
          <UIcon name="i-lucide-chevron-down" class="size-3 text-muted" />
        </button>

        <template #content>
          <div class="w-56 p-1">
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

      <!-- Live sync indicator -->
      <div
        v-if="connectionState"
        class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted"
        :title="liveStatusLabel"
        role="status"
        :aria-live="connectionState === 'error' ? 'assertive' : 'polite'"
      >
        <span
          class="inline-block size-1.5 rounded-full"
          :class="liveStatusDotClass"
          aria-hidden="true"
        />
        <span class="hidden sm:inline">{{ liveStatusLabel }}</span>
      </div>

      <!-- Inline actions slot -->
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <span
          class="hidden items-center gap-1 text-[10px] font-mono text-dimmed xl:inline-flex"
          title="Press g then a letter to jump sections"
        >
          <kbd class="rounded border border-default px-1 py-0.5">g</kbd>
          <span>then</span>
          <kbd class="rounded border border-default px-1 py-0.5">w</kbd>
        </span>
      </div>
    </div>

    <!-- Segment subtitle -->
    <p class="text-base font-semibold text-highlighted">
      {{ currentSegment.subtitle }}
    </p>
  </div>
</template>
