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

function getInputValue(event: Event) {
    return (event.target as HTMLInputElement | null)?.value ?? "";
}

function getSelectValue(event: Event) {
    return (event.target as HTMLSelectElement | null)?.value ?? "";
}

function toTimelineStatus(value: string): WorkspaceTimelineMilestoneStatus {
    return value === "active" || value === "done" || value === "blocked"
        ? value
        : "planned";
}

function getStatusTone(status: WorkspaceTimelineMilestoneStatus) {
    switch (status) {
        case "done":
            return "border-success/30 bg-success/5 text-success";
        case "active":
            return "border-primary/30 bg-primary/5 text-primary";
        case "blocked":
            return "border-error/30 bg-error/5 text-error";
        default:
            return "border-muted/60 bg-elevated/40 text-muted";
    }
}
</script>

<template>
    <div class="space-y-4">
        <div
            class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-muted/60 bg-elevated/20 p-4"
        >
            <div>
                <p class="text-sm font-medium text-highlighted">
                    Structured timeline
                </p>
                <p class="text-sm text-muted">
                    Capture milestones, dates, status, and notes in one ordered
                    view.
                </p>
            </div>

            <div class="flex items-center gap-2">
                <UBadge color="neutral" variant="soft"
                    >{{ block.milestones.length }} milestones</UBadge
                >
                <UButton
                    color="primary"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-plus"
                    @click="addTimelineMilestone(tabId, block.id)"
                >
                    Add milestone
                </UButton>
            </div>
        </div>

        <div class="space-y-3">
            <article
                v-for="(milestone, milestoneIndex) in block.milestones"
                :key="milestone.id"
                class="rounded-2xl border border-muted/60 bg-default p-4"
            >
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <UBadge
                                variant="soft"
                                :class="getStatusTone(milestone.status)"
                            >
                                {{ statusLabels[milestone.status] }}
                            </UBadge>
                            <span
                                class="text-xs uppercase tracking-[0.15em] text-muted"
                            >
                                {{ milestone.date || "No date" }}
                            </span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1">
                        <UButton
                            color="neutral"
                            variant="ghost"
                            size="sm"
                            icon="i-lucide-chevron-up"
                            :disabled="milestoneIndex === 0"
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
                            size="sm"
                            icon="i-lucide-chevron-down"
                            :disabled="
                                milestoneIndex === block.milestones.length - 1
                            "
                            @click="
                                moveTimelineMilestone(
                                    tabId,
                                    block.id,
                                    milestone.id,
                                    'down',
                                )
                            "
                        />
                        <UButton
                            color="neutral"
                            variant="ghost"
                            size="sm"
                            icon="i-lucide-trash-2"
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

                <div
                    class="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px]"
                >
                    <UInput
                        :model-value="milestone.title"
                        placeholder="Milestone title"
                        @update:model-value="
                            mutateTimelineMilestone(
                                tabId,
                                block.id,
                                milestone.id,
                                (entry) => {
                                    entry.title = ($event ?? '').slice(0, 160);
                                },
                            )
                        "
                    />

                    <input
                        :value="milestone.date ?? ''"
                        type="date"
                        class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        @change="
                            mutateTimelineMilestone(
                                tabId,
                                block.id,
                                milestone.id,
                                (entry) => {
                                    const value = getInputValue($event);
                                    entry.date = value || null;
                                },
                            )
                        "
                    />

                    <select
                        :value="milestone.status"
                        class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        @change="
                            mutateTimelineMilestone(
                                tabId,
                                block.id,
                                milestone.id,
                                (entry) => {
                                    entry.status = toTimelineStatus(
                                        getSelectValue($event),
                                    );
                                },
                            )
                        "
                    >
                        <option
                            v-for="status in WORKSPACE_TIMELINE_MILESTONE_STATUSES"
                            :key="status"
                            :value="status"
                        >
                            {{ statusLabels[status] }}
                        </option>
                    </select>
                </div>

                <UTextarea
                    :model-value="milestone.note"
                    :rows="3"
                    autoresize
                    class="mt-3"
                    placeholder="Supporting note"
                    @update:model-value="
                        mutateTimelineMilestone(
                            tabId,
                            block.id,
                            milestone.id,
                            (entry) => {
                                entry.note = ($event ?? '').slice(0, 2000);
                            },
                        )
                    "
                />
            </article>

            <div
                v-if="block.milestones.length === 0"
                class="rounded-2xl border border-dashed border-muted/70 bg-elevated/20 p-6 text-sm text-muted"
            >
                No milestones yet.
            </div>
        </div>
    </div>
</template>
