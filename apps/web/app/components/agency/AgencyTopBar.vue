<script setup lang="ts">
/**
 * Agency top-bar — replaces the legacy left sidebar.
 *
 * Anatomy: [team badge] · [segmented section nav] · [inline actions slot]
 *
 * Below `lg`, segments collapse into a popover; the team badge stays inline.
 *
 * Keyboard: `g` then [t p c r u b s] jumps between segments. Listener is
 * scoped to the agency surface and ignores typing into inputs.
 */
import type { AgencySegmentId } from "./agency-segments";
import { AGENCY_SEGMENTS } from "./agency-segments";

const props = defineProps<{
  segment: AgencySegmentId;
  teamId: string;
  teams: Array<{ id: string; name: string }>;
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

// `g` then [letter] segment jumps. Mirrors common task-app convention.
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
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
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

  // Inside prefix window.
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
  <div class="agency-topbar flex flex-wrap items-center gap-3 border-b border-default pb-3">
    <!-- Team badge / selector. Read-only badge when single team. -->
    <UPopover
      v-if="isMultiTeam"
      v-model:open="teamSelectorOpen"
      :content="{ align: 'start' }"
    >
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full border border-default bg-muted px-3 py-1.5 text-xs font-bold text-highlighted transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <UIcon name="i-lucide-users" class="size-3.5 text-muted" />
        <span class="truncate max-w-[10rem]">{{ currentTeam?.name ?? "Select team" }}</span>
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
            <UIcon
              v-if="team.id === teamId"
              name="i-lucide-check"
              class="size-3.5 shrink-0"
            />
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
      <span class="truncate max-w-[10rem]">{{ currentTeam.name }}</span>
    </div>

    <!-- Segmented section nav, desktop. -->
    <nav
      class="hidden lg:flex flex-1 items-center gap-1 overflow-x-auto"
      role="tablist"
      aria-label="Agency sections"
    >
      <button
        v-for="entry in AGENCY_SEGMENTS"
        :key="entry.id"
        type="button"
        role="tab"
        :aria-selected="entry.id === segment"
        class="agency-topbar__seg inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-elevated hover:text-highlighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        :class="entry.id === segment ? 'bg-primary/10 text-primary' : ''"
        :title="`${entry.label} (g ${entry.shortcutKey})`"
        @click="selectSegment(entry.id)"
      >
        <UIcon :name="entry.icon" class="size-3.5" />
        <span>{{ entry.label }}</span>
      </button>
    </nav>

    <!-- Segmented section nav, narrow: popover. -->
    <UPopover
      v-model:open="segmentPopoverOpen"
      :content="{ align: 'start' }"
      class="lg:hidden"
    >
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-between gap-2 rounded-full border border-default bg-default px-3 py-1.5 text-xs font-bold text-highlighted transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span class="inline-flex items-center gap-2">
          <UIcon :name="currentSegment.icon" class="size-3.5 text-primary" />
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

    <!-- Inline actions slot, supplied by section. -->
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
