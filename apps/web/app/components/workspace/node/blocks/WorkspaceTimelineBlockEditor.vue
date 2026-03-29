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

function getNextStatus(status: WorkspaceTimelineMilestoneStatus): WorkspaceTimelineMilestoneStatus {
    const currentIndex = WORKSPACE_TIMELINE_MILESTONE_STATUSES.indexOf(status);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % WORKSPACE_TIMELINE_MILESTONE_STATUSES.length;
    return WORKSPACE_TIMELINE_MILESTONE_STATUSES[nextIndex] ?? "planned";
}

function toTimelineStatus(value: string): WorkspaceTimelineMilestoneStatus {
    return value === "active" || value === "done" || value === "blocked"
        ? value
        : "planned";
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
</script>

<template>
    <div class="space-y-6">
        <!-- Timeline Header -->
        <div class="flex items-center justify-between px-2">
            <div class="space-y-1">
                <h3
                    class="text-sm font-bold uppercase tracking-widest text-muted/60"
                >
                    Milestone Journey
                </h3>
                <p class="text-xs text-muted/40">
                    Chronological project roadmap
                </p>
            </div>
            <UButton
                color="primary"
                variant="soft"
                size="sm"
                icon="i-lucide-plus"
                class="rounded-full px-4"
                @click="addTimelineMilestone(tabId, block.id)"
            >
                Add Milestone
            </UButton>
        </div>

        <!-- Vertical Timeline Container -->
        <div class="relative pl-8 space-y-8">
            <!-- Continuous Line -->
            <div
                class="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/30 via-muted/20 to-transparent"
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
                        'ring-1 ring-primary/20':
                            expandedMilestoneId === milestone.id,
                    }"
                >
                    <div class="flex items-start justify-between gap-4">
                        <div
                            class="flex-1 min-w-0"
                            @click="toggleMilestone(milestone.id)"
                        >
                            <div class="flex flex-wrap items-center gap-2 mb-1">
                                <span
                                    class="text-[10px] font-black uppercase tracking-widest opacity-60"
                                >
                                    {{ milestone.date || "No Date Set" }}
                                </span>
                                <UBadge
                                    variant="subtle"
                                    size="xs"
                                    class="cursor-pointer rounded-lg text-[9px] uppercase font-bold"
                                    :class="getStatusColor(milestone.status)"
                                    @click.stop="
                                        mutateTimelineMilestone(
                                            tabId,
                                            block.id,
                                            milestone.id,
                                            (entry) => (entry.status = getNextStatus(entry.status)),
                                        )
                                    "
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
                                @update:model-value="
                                    mutateTimelineMilestone(
                                        tabId,
                                        block.id,
                                        milestone.id,
                                        (entry) =>
                                            (entry.title = ($event ?? '').slice(
                                                0,
                                                160,
                                            )),
                                    )
                                "
                            />

                            <p
                                v-if="
                                    milestone.note &&
                                    expandedMilestoneId !== milestone.id
                                "
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
                                class="rounded-lg opacity-0 group-hover:opacity-100"
                                @click="toggleMilestone(milestone.id)"
                            />

                            <div
                                class="flex flex-col gap-1 opacity-0 group-hover:opacity-100"
                            >
                                <UButton
                                    color="neutral"
                                    variant="ghost"
                                    size="xs"
                                    icon="i-lucide-chevron-up"
                                    :disabled="index === 0"
                                    class="rounded-lg h-6"
                                    @click="
                                        moveTimelineMilestone(
                                            tabId,
                                            block.id,
                                            milestone.id,
                                            'up',
                                        )
                                    "
                                />
                                <UButton
                                    color="neutral"
                                    variant="ghost"
                                    size="xs"
                                    icon="i-lucide-chevron-down"
                                    :disabled="
                                        index === block.milestones.length - 1
                                    "
                                    class="rounded-lg h-6"
                                    @click="
                                        moveTimelineMilestone(
                                            tabId,
                                            block.id,
                                            milestone.id,
                                            'down',
                                        )
                                    "
                                />
                            </div>

                            <UButton
                                color="neutral"
                                variant="ghost"
                                size="xs"
                                icon="i-lucide-trash-2"
                                class="rounded-lg opacity-0 group-hover:opacity-100 hover:text-error"
                                @click="
                                    removeTimelineMilestone(
                                        tabId,
                                        block.id,
                                        milestone.id,
                                    )
                                "
                            />
                        </div>
                    </div>

                    <!-- Expanded Details -->
                    <div
                        v-if="expandedMilestoneId === milestone.id"
                        class="mt-6 space-y-4 border-t border-muted/10 pt-6"
                    >
                        <div class="grid grid-cols-2 gap-4">
                            <UFormField label="Milestone Date" size="sm">
                                <UInput
                                    :model-value="milestone.date ?? ''"
                                    type="date"
                                    icon="i-lucide-calendar"
                                    class="rounded-xl"
                                    @update:model-value="
                                        mutateTimelineMilestone(
                                            tabId,
                                            block.id,
                                            milestone.id,
                                            (entry) =>
                                                (entry.date = $event || null),
                                        )
                                    "
                                />
                            </UFormField>

                            <UFormField label="Status" size="sm">
                                <USelect
                                    :model-value="milestone.status"
                                    :items="
                                        WORKSPACE_TIMELINE_MILESTONE_STATUSES.map(
                                            (s) => ({
                                                label: statusLabels[s],
                                                value: s,
                                            }),
                                        )
                                    "
                                    class="rounded-xl"
                                    @update:model-value="
                                        mutateTimelineMilestone(
                                            tabId,
                                            block.id,
                                            milestone.id,
                                            (entry) =>
                                                (entry.status =
                                                    toTimelineStatus($event)),
                                        )
                                    "
                                />
                            </UFormField>
                        </div>

                        <UFormField label="Supporting Note" size="sm">
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
                                @update:model-value="
                                    mutateTimelineMilestone(
                                        tabId,
                                        block.id,
                                        milestone.id,
                                        (entry) =>
                                            (entry.note = ($event ?? '').slice(
                                                0,
                                                2000,
                                            )),
                                    )
                                "
                            />
                        </UFormField>
                    </div>
                </div>
            </article>

            <!-- Empty State -->
            <div
                v-if="block.milestones.length === 0"
                class="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-muted/30 bg-default/20 py-20 text-center"
            >
                <UIcon
                    name="i-lucide-milestone"
                    class="size-10 text-muted/40 mb-4"
                />
                <p
                    class="text-sm font-bold text-muted/60 uppercase tracking-widest"
                >
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
