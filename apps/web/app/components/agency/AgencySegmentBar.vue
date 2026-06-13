<script setup lang="ts">
/**
 * In-page agency section tabs. The shell topbar keeps team + current section;
 * this strip carries full segment navigation without crowding the shell.
 */
import type { AgencySegmentId } from "./agency-segments";
import { AGENCY_SEGMENTS } from "./agency-segments";
import { agencyFocusRingClass } from "~/utils/agency-ui";

const props = defineProps<{
  segment: AgencySegmentId;
}>();

const emit = defineEmits<{
  "update:segment": [value: AgencySegmentId];
}>();

function tabIdFor(segmentId: AgencySegmentId) {
  return `agency-tab-${segmentId}`;
}

function panelIdFor(segmentId: AgencySegmentId) {
  return `agency-panel-${segmentId}`;
}

function selectSegment(nextSegment: AgencySegmentId) {
  if (nextSegment === props.segment) return;
  emit("update:segment", nextSegment);
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

  const nextSegment = AGENCY_SEGMENTS[nextIndex];
  if (nextSegment) selectSegment(nextSegment.id);
}
</script>

<template>
  <nav
    class="agency-segment-bar -mx-6 border-b border-default px-6 lg:-mx-8 lg:px-8"
    role="tablist"
    aria-label="Agency sections"
  >
    <div class="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-elevated hover:text-highlighted',
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
    </div>
  </nav>
</template>
