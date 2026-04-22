<script setup lang="ts">
import {
  WORKSPACE_TIMELINE_MILESTONE_STATUSES,
  type WorkspaceTimelineBlock,
  type WorkspaceTimelineMilestoneStatus,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceTimelineBlock;
  tabId: string;
}>();

const {
  addTimelineMilestone,
  mutateTimelineMilestone,
  removeTimelineMilestone,
  moveTimelineMilestone,
} = useWorkspaceNodeEditorContext();

const statusLabels: Record<WorkspaceTimelineMilestoneStatus, string> = {
  planned: "Planned",
  active: "Active",
  done: "Done",
  blocked: "Blocked",
};

const statusIcons: Record<WorkspaceTimelineMilestoneStatus, string> = {
  planned: "i-lucide-circle",
  active: "i-lucide-play-circle",
  done: "i-lucide-check-circle-2",
  blocked: "i-lucide-alert-circle",
};

const timelineSummary = computed(() => {
  const total = props.block.milestones.length;
  const activeCount = props.block.milestones.filter(
    (milestone) => milestone.status === "active",
  ).length;
  const doneCount = props.block.milestones.filter(
    (milestone) => milestone.status === "done",
  ).length;
  const blockedCount = props.block.milestones.filter(
    (milestone) => milestone.status === "blocked",
  ).length;

  return {
    total,
    activeCount,
    doneCount,
    blockedCount,
    completionPercent: Math.round((doneCount / Math.max(total, 1)) * 100),
  };
});

function getNextStatus(status: WorkspaceTimelineMilestoneStatus): WorkspaceTimelineMilestoneStatus {
  const currentIndex = WORKSPACE_TIMELINE_MILESTONE_STATUSES.indexOf(status);
  const nextIndex =
    currentIndex < 0 ? 0 : (currentIndex + 1) % WORKSPACE_TIMELINE_MILESTONE_STATUSES.length;
  return WORKSPACE_TIMELINE_MILESTONE_STATUSES[nextIndex] ?? "planned";
}

function toTimelineStatus(value: string): WorkspaceTimelineMilestoneStatus {
  return value === "active" || value === "done" || value === "blocked" ? value : "planned";
}

function getStatusColor(status: WorkspaceTimelineMilestoneStatus) {
  switch (status) {
    case "done":
      return "text-success bg-success/10 border-success/20";
    case "active":
      return "text-primary bg-primary/10 border-primary/20";
    case "blocked":
      return "text-error bg-error/10 border-error/20";
    default:
      return "text-muted bg-muted/10 border-muted/20";
  }
}

const expandedMilestoneId = ref<string | null>(null);

function toggleMilestone(id: string) {
  expandedMilestoneId.value = expandedMilestoneId.value === id ? null : id;
}

function updateMilestoneTitle(milestoneId: string, value: string | number | undefined) {
  mutateTimelineMilestone(props.tabId, props.block.id, milestoneId, (entry) => {
    entry.title = String(value ?? "").slice(0, 160);
  });
}

function updateMilestoneDate(milestoneId: string, value: string | number | undefined) {
  mutateTimelineMilestone(props.tabId, props.block.id, milestoneId, (entry) => {
    const nextValue = String(value ?? "");
    entry.date = nextValue || null;
  });
}

function updateMilestoneStatus(milestoneId: string, value: string) {
  mutateTimelineMilestone(props.tabId, props.block.id, milestoneId, (entry) => {
    entry.status = toTimelineStatus(value);
  });
}

function cycleMilestoneStatus(milestoneId: string) {
  mutateTimelineMilestone(props.tabId, props.block.id, milestoneId, (entry) => {
    entry.status = getNextStatus(entry.status);
  });
}

function updateMilestoneNote(milestoneId: string, value: string | number | undefined) {
  mutateTimelineMilestone(props.tabId, props.block.id, milestoneId, (entry) => {
    entry.note = String(value ?? "").slice(0, 2000);
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- Timeline Header -->
    <div class="space-y-4 rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Milestone Journey
          </p>
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted/40">
            Chronological project roadmap
          </p>
        </div>
        <UButton
          color="primary"
          variant="soft"
          size="sm"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          aria-label="Add timeline milestone"
          @click="addTimelineMilestone(tabId, block.id)"
        >
          Add Milestone
        </UButton>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UBadge variant="subtle" class="rounded-2xl">
          {{ timelineSummary.total }} milestones
        </UBadge>
        <UBadge color="primary" variant="soft" class="rounded-2xl">
          {{ timelineSummary.activeCount }} active
        </UBadge>
        <UBadge color="success" variant="soft" class="rounded-2xl">
          {{ timelineSummary.doneCount }} done
        </UBadge>
        <UBadge color="error" variant="soft" class="rounded-2xl">
          {{ timelineSummary.blockedCount }} blocked
        </UBadge>
        <UBadge color="neutral" variant="soft" class="rounded-2xl">
          {{ timelineSummary.completionPercent }}% complete
        </UBadge>
      </div>
    </div>

    <!-- Vertical Timeline Container -->
    <div class="relative pl-8 space-y-8">
      <!-- Continuous Line -->
      <div
        class="absolute left-[15px] top-4 bottom-4 w-0.5 bg-linear-to-b from-primary/30 via-muted/20 to-transparent"
      />

      <article
        v-for="(milestone, index) in block.milestones"
        :key="milestone.id"
        class="group relative"
      >
        <!-- Milestone Dot -->
        <div
          class="absolute -left-[21px] top-0 z-10 size-5 rounded-full border-2 bg-default transition-all duration-300 group-hover:scale-125"
          :class="getStatusColor(milestone.status)"
        >
          <div
            v-if="milestone.status === 'active'"
            class="absolute inset-0 animate-ping rounded-full bg-primary/20"
          />
        </div>

        <!-- Milestone Card -->
        <div
          class="rounded-3xl border border-muted/20 bg-default/40 p-5 transition-all hover:border-primary/20 hover:bg-default/60 hover:shadow-xl hover:shadow-black/5"
          :class="{
            'ring-1 ring-primary/20': expandedMilestoneId === milestone.id,
          }"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">
                  {{ milestone.date || "No Date Set" }}
                </span>
                <UBadge
                  variant="subtle"
                  size="xs"
                  class="cursor-pointer rounded-lg text-[9px] uppercase font-bold"
                  :class="getStatusColor(milestone.status)"
                  :aria-label="`Cycle status for ${milestone.title || 'milestone'}`"
                  @click.stop="cycleMilestoneStatus(milestone.id)"
                >
                  <UIcon :name="statusIcons[milestone.status]" class="mr-1 size-3" />
                  {{ statusLabels[milestone.status] }}
                </UBadge>
              </div>

              <UInput
                :model-value="milestone.title"
                variant="none"
                placeholder="Milestone name..."
                class="w-full"
                :ui="{
                  base: 'px-0 py-0 text-lg font-bold text-highlighted leading-tight',
                }"
                @update:model-value="updateMilestoneTitle(milestone.id, $event)"
              />

              <p
                v-if="milestone.note && expandedMilestoneId !== milestone.id"
                class="mt-2 text-sm text-toned line-clamp-2"
              >
                {{ milestone.note }}
              </p>
            </div>

            <div class="flex items-center gap-1">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                :icon="
                  expandedMilestoneId === milestone.id
                    ? 'i-lucide-chevron-up'
                    : 'i-lucide-settings-2'
                "
                class="rounded-lg text-muted/70 transition-colors hover:text-highlighted"
                :aria-label="
                  expandedMilestoneId === milestone.id
                    ? 'Hide milestone details'
                    : 'Show milestone details'
                "
                :aria-expanded="expandedMilestoneId === milestone.id"
                @click="toggleMilestone(milestone.id)"
              />

              <div class="flex flex-col gap-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-chevron-up"
                  :disabled="index === 0"
                  class="rounded-lg h-6 text-muted/70 transition-colors hover:text-highlighted"
                  :aria-label="`Move ${milestone.title || 'milestone'} up`"
                  @click="moveTimelineMilestone(tabId, block.id, milestone.id, 'up')"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-chevron-down"
                  :disabled="index === block.milestones.length - 1"
                  class="rounded-lg h-6 text-muted/70 transition-colors hover:text-highlighted"
                  :aria-label="`Move ${milestone.title || 'milestone'} down`"
                  @click="moveTimelineMilestone(tabId, block.id, milestone.id, 'down')"
                />
              </div>

              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                class="rounded-lg text-muted/70 transition-colors hover:text-error"
                :aria-label="`Remove ${milestone.title || 'milestone'}`"
                @click="removeTimelineMilestone(tabId, block.id, milestone.id)"
              />
            </div>
          </div>

          <!-- Expanded Details -->
          <div
            v-if="expandedMilestoneId === milestone.id"
            class="mt-6 space-y-6 border-t border-muted/10 pt-6"
          >
            <div class="grid grid-cols-2 gap-4">
              <UFormField size="sm">
                <template #label>
                  <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >Milestone Date</span
                  >
                </template>
                <UInput
                  :model-value="milestone.date ?? ''"
                  type="date"
                  icon="i-lucide-calendar"
                  class="rounded-xl"
                  @update:model-value="updateMilestoneDate(milestone.id, $event)"
                />
              </UFormField>

              <UFormField size="sm">
                <template #label>
                  <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >Status</span
                  >
                </template>
                <USelect
                  :model-value="milestone.status"
                  :items="
                    WORKSPACE_TIMELINE_MILESTONE_STATUSES.map((s) => ({
                      label: statusLabels[s],
                      value: s,
                    }))
                  "
                  class="rounded-xl"
                  @update:model-value="updateMilestoneStatus(milestone.id, $event)"
                />
              </UFormField>
            </div>

            <UFormField size="sm">
              <template #label>
                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                  >Supporting Note</span
                >
              </template>
              <UTextarea
                :model-value="milestone.note"
                variant="soft"
                placeholder="Add context, challenges, or success criteria..."
                autoresize
                :max-rows="10"
                class="rounded-2xl"
                :ui="{
                  base: 'text-sm text-toned leading-relaxed',
                }"
                @update:model-value="updateMilestoneNote(milestone.id, $event)"
              />
            </UFormField>
          </div>
        </div>
      </article>

      <!-- Empty State -->
      <div
        v-if="block.milestones.length === 0"
        class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
      >
        <UIcon name="i-lucide-milestone" class="size-8 text-muted/20 mb-3" />
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          No milestones defined
        </p>
        <UButton
          color="primary"
          variant="link"
          size="sm"
          class="mt-2"
          @click="addTimelineMilestone(tabId, block.id)"
        >
          Create the first one
        </UButton>
      </div>
    </div>
  </div>
</template>
