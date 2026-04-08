<script setup lang="ts">
import {
    WORKSPACE_CONTENT_PLATFORMS,
    WORKSPACE_CONTENT_ROI_SORT_OPTIONS,
    createWorkspaceContentRoiItem,
    getContentRoiScore,
    getContentRoiStatus,
    getContentRoiTrackerSummary,
    sortContentRoiItems,
    workspaceContentPlatformLabels,
    workspaceContentRoiSortLabels,
    workspaceContentRoiStatusLabels,
    type WorkspaceContentPlatform,
    type WorkspaceContentRoiSort,
    type WorkspaceContentRoiTrackerBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
    block: WorkspaceContentRoiTrackerBlock;
    tabId: string;
}>();

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getContentRoiTrackerSummary(props.block));
const sortedItems = computed(() =>
    sortContentRoiItems(props.block.items, props.block.sortBy),
);
const topItem = computed(() => sortedItems.value[0] ?? null);
const promisingCount = computed(
    () =>
        props.block.items.filter(
            (item) =>
                getContentRoiStatus(getContentRoiScore(item)) === "promising",
        ).length,
);
const underperformingCount = computed(
    () =>
        props.block.items.filter(
            (item) =>
                getContentRoiStatus(getContentRoiScore(item)) === "low-return",
        ).length,
);

const platformOptions = WORKSPACE_CONTENT_PLATFORMS.map((platform) => ({
    label: workspaceContentPlatformLabels[platform],
    value: platform,
})) satisfies Array<{ label: string; value: WorkspaceContentPlatform }>;

const rowGridStyle = {
    gridTemplateColumns:
        "minmax(16rem,1.6fr) minmax(8rem,0.8fr) minmax(10rem,1fr) minmax(10rem,1fr) minmax(7rem,0.7fr) minmax(6rem,0.6fr) minmax(12rem,1fr) minmax(12rem,1fr) minmax(18rem,1.4fr)",
};

function addItem() {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "content-roi-tracker",
        (entry) => {
            entry.items.unshift(
                createWorkspaceContentRoiItem({
                    title: "",
                }),
            );
        },
    );
}

function mutateItem(
    itemId: string,
    mutator: (item: WorkspaceContentRoiTrackerBlock["items"][number]) => void,
) {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "content-roi-tracker",
        (entry) => {
            const target = entry.items.find(
                (candidate) => candidate.id === itemId,
            );

            if (!target) {
                return;
            }

            mutator(target);
        },
    );
}

function removeItem(itemId: string) {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "content-roi-tracker",
        (entry) => {
            entry.items = entry.items.filter((item) => item.id !== itemId);
        },
    );
}

function setSortBy(sortBy: WorkspaceContentRoiSort) {
    mutateTypedBlock(
        props.tabId,
        props.block.id,
        "content-roi-tracker",
        (entry) => {
            entry.sortBy = sortBy;
        },
    );
}

function updateTitle(itemId: string, value: string | number | undefined) {
    mutateItem(itemId, (entry) => {
        entry.title = String(value ?? "").slice(0, 240);
    });
}

function updatePlatform(
    itemId: string,
    value: WorkspaceContentPlatform | string | undefined,
) {
    mutateItem(itemId, (entry) => {
        entry.platform =
            value === "instagram" ||
            value === "tiktok" ||
            value === "linkedin" ||
            value === "youtube"
                ? value
                : "linkedin";
    });
}

function updateCampaign(itemId: string, value: string | number | undefined) {
    mutateItem(itemId, (entry) => {
        entry.campaign = String(value ?? "").slice(0, 120);
    });
}

function updateGoal(itemId: string, value: string | number | undefined) {
    mutateItem(itemId, (entry) => {
        entry.goal = String(value ?? "").slice(0, 160);
    });
}

function updateReach(itemId: string, value: string | number | undefined) {
    mutateItem(itemId, (entry) => {
        entry.reach = clampInteger(String(value ?? 0), 0, 10_000_000);
    });
}

function updateLeads(itemId: string, value: string | number | undefined) {
    mutateItem(itemId, (entry) => {
        entry.leads = clampInteger(String(value ?? 0), 0, 100_000);
    });
}

function updateConversionInfluence(
    itemId: string,
    value: string | number | undefined,
) {
    mutateItem(itemId, (entry) => {
        entry.conversionInfluence = clampInteger(String(value ?? 0), 1, 10);
    });
}

function updateRepurposeValue(
    itemId: string,
    value: string | number | undefined,
) {
    mutateItem(itemId, (entry) => {
        entry.repurposeValue = clampInteger(String(value ?? 0), 1, 10);
    });
}

function clampInteger(value: string, min: number, max: number) {
    const numeric = Number(value || 0);

    if (!Number.isFinite(numeric)) {
        return min;
    }

    return Math.min(max, Math.max(min, Math.round(numeric)));
}

function getStatusClasses(score: number) {
    const status = getContentRoiStatus(score);

    switch (status) {
        case "high-return":
            return "border-success/35 bg-success/5 text-success";
        case "promising":
            return "border-warning/35 bg-warning/5 text-warning";
        default:
            return "border-error/35 bg-error/5 text-error";
    }
}

function getPerformanceSummary(score: number) {
    const status = getContentRoiStatus(score);

    switch (status) {
        case "high-return":
            return "Strong commercial signal with clear lead and repurposing value.";
        case "promising":
            return "Worth iterating further to improve conversion or distribution quality.";
        default:
            return "Needs a sharper angle, better distribution, or a different format.";
    }
}
</script>

<template>
    <div class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    Top Platform
                </p>
                <p
                    class="mt-2 text-2xl font-black tracking-tight text-highlighted sm:text-3xl"
                >
                    {{
                        summary.topPlatform
                            ? workspaceContentPlatformLabels[
                                  summary.topPlatform
                              ]
                            : "None"
                    }}
                </p>
                <p class="mt-1 text-sm text-muted">
                    Highest average ROI across current rows
                </p>
            </div>

            <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    Top Campaign
                </p>
                <p
                    class="mt-2 text-2xl font-black tracking-tight text-highlighted sm:text-3xl"
                >
                    {{ summary.topCampaign || "No campaign" }}
                </p>
                <p class="mt-1 text-sm text-muted">
                    Most impactful marketing push
                </p>
            </div>

            <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    Influenced Leads
                </p>
                <p
                    class="mt-2 text-2xl font-black tracking-tight text-highlighted sm:text-3xl"
                >
                    {{ summary.totalInfluencedLeads }}
                </p>
                <p class="mt-1 text-sm text-muted">
                    Lead count weighted by conversion influence
                </p>
            </div>

            <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    Average ROI
                </p>
                <p
                    class="mt-2 text-2xl font-black tracking-tight text-highlighted sm:text-3xl"
                >
                    {{ summary.averageScore }}
                </p>
                <p class="mt-1 text-sm text-muted">
                    {{ summary.highReturnCount }} high-return pieces right now
                </p>
            </div>
        </div>

        <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-4">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                        <p class="text-sm font-semibold text-highlighted">
                            Commercial impact tracker
                        </p>
                        <UBadge
                            color="success"
                            variant="soft"
                            class="rounded-2xl px-3"
                        >
                            {{ summary.highReturnCount }} high return
                        </UBadge>
                        <UBadge
                            color="warning"
                            variant="soft"
                            class="rounded-2xl px-3"
                        >
                            {{ promisingCount }} promising
                        </UBadge>
                        <UBadge
                            color="error"
                            variant="soft"
                            class="rounded-2xl px-3"
                        >
                            {{ underperformingCount }} underperforming
                        </UBadge>
                    </div>

                    <p class="text-sm text-muted">
                        Track which pieces actually create leads, influence
                        conversions, and keep paying back through repurposing.
                    </p>

                    <p v-if="topItem" class="text-xs text-toned">
                        Best current performer:
                        <span class="font-semibold text-highlighted">
                            {{ topItem.title || "Untitled content" }}
                        </span>
                        on
                        {{ workspaceContentPlatformLabels[topItem.platform] }}.
                    </p>
                </div>

                <div class="flex flex-wrap gap-2">
                    <div class="flex flex-wrap gap-2">
                        <UButton
                            v-for="sortBy in WORKSPACE_CONTENT_ROI_SORT_OPTIONS"
                            :key="sortBy"
                            color="neutral"
                            :variant="
                                block.sortBy === sortBy ? 'solid' : 'soft'
                            "
                            class="rounded-full px-4"
                            :aria-pressed="block.sortBy === sortBy"
                            @click="setSortBy(sortBy)"
                        >
                            Sort: {{ workspaceContentRoiSortLabels[sortBy] }}
                        </UButton>
                    </div>

                    <UButton
                        color="primary"
                        variant="soft"
                        icon="i-lucide-plus"
                        class="rounded-full px-4"
                        aria-label="Add content ROI row"
                        @click="addItem"
                    >
                        Add Content Piece
                    </UButton>
                </div>
            </div>
        </div>

        <div
            v-if="sortedItems.length === 0"
            class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
        >
            <p class="text-sm font-semibold text-muted">
                No content ROI rows yet.
            </p>
            <p class="mt-2 text-sm text-muted">
                Add the first content piece to compare commercial performance
                across campaigns and platforms.
            </p>
        </div>

        <div v-else class="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
            <div
                class="grid min-w-[1520px] gap-px overflow-hidden rounded-3xl border border-muted/20 bg-muted/20"
                :style="rowGridStyle"
            >
                <div
                    v-for="label in [
                        'Content',
                        'Platform',
                        'Campaign',
                        'Goal',
                        'Reach',
                        'Leads',
                        'Conversion Influence',
                        'Repurpose Value',
                        'ROI Status',
                    ]"
                    :key="label"
                    class="bg-elevated/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    {{ label }}
                </div>

                <template v-for="item in sortedItems" :key="item.id">
                    <div class="flex items-center bg-default/40 p-3">
                        <UInput
                            :model-value="item.title"
                            variant="none"
                            placeholder="Content piece"
                            class="w-full"
                            :ui="{
                                base: 'px-0 text-sm font-bold text-highlighted placeholder:text-muted/60',
                            }"
                            :aria-label="`Content title for ${item.title || 'new row'}`"
                            @update:model-value="updateTitle(item.id, $event)"
                        />
                    </div>

                    <div class="flex items-center bg-default/40 p-3">
                        <USelect
                            :model-value="item.platform"
                            :items="platformOptions"
                            size="sm"
                            class="w-full rounded-2xl"
                            :aria-label="`Platform for ${item.title || 'content row'}`"
                            @update:model-value="
                                updatePlatform(
                                    item.id,
                                    $event as
                                        | WorkspaceContentPlatform
                                        | undefined,
                                )
                            "
                        />
                    </div>

                    <div class="flex items-center bg-default/40 p-3">
                        <UInput
                            :model-value="item.campaign"
                            placeholder="Campaign"
                            size="sm"
                            class="w-full rounded-2xl"
                            :aria-label="`Campaign for ${item.title || 'content row'}`"
                            @update:model-value="
                                updateCampaign(item.id, $event)
                            "
                        />
                    </div>

                    <div class="flex items-center bg-default/40 p-3">
                        <UInput
                            :model-value="item.goal"
                            placeholder="Goal"
                            size="sm"
                            class="w-full rounded-2xl"
                            :aria-label="`Goal for ${item.title || 'content row'}`"
                            @update:model-value="updateGoal(item.id, $event)"
                        />
                    </div>

                    <div class="flex items-center bg-default/40 p-3">
                        <UInput
                            :model-value="String(item.reach)"
                            type="number"
                            min="0"
                            size="sm"
                            class="w-full rounded-2xl"
                            :aria-label="`Reach for ${item.title || 'content row'}`"
                            @update:model-value="updateReach(item.id, $event)"
                        />
                    </div>

                    <div class="flex items-center bg-default/40 p-3">
                        <UInput
                            :model-value="String(item.leads)"
                            type="number"
                            min="0"
                            size="sm"
                            class="w-full rounded-2xl"
                            :aria-label="`Leads for ${item.title || 'content row'}`"
                            @update:model-value="updateLeads(item.id, $event)"
                        />
                    </div>

                    <div class="flex flex-col justify-center bg-default/40 p-3">
                        <div class="flex items-center justify-between gap-2">
                            <span
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                                >Score</span
                            >
                            <span class="text-sm font-black text-primary">{{
                                item.conversionInfluence
                            }}</span>
                        </div>
                        <input
                            :value="item.conversionInfluence"
                            type="range"
                            min="1"
                            max="10"
                            class="mt-2 h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
                            :aria-label="`Conversion influence for ${item.title || 'content row'}`"
                            @input="
                                updateConversionInfluence(
                                    item.id,
                                    ($event.target as HTMLInputElement)?.value,
                                )
                            "
                        />
                    </div>

                    <div class="flex flex-col justify-center bg-default/40 p-3">
                        <div class="flex items-center justify-between gap-2">
                            <span
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                                >Score</span
                            >
                            <span class="text-sm font-black text-primary">{{
                                item.repurposeValue
                            }}</span>
                        </div>
                        <input
                            :value="item.repurposeValue"
                            type="range"
                            min="1"
                            max="10"
                            class="mt-2 h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
                            :aria-label="`Repurpose value for ${item.title || 'content row'}`"
                            @input="
                                updateRepurposeValue(
                                    item.id,
                                    ($event.target as HTMLInputElement)?.value,
                                )
                            "
                        />
                    </div>

                    <div class="bg-default/40 p-3">
                        <div
                            class="min-w-0 rounded-2xl border p-3"
                            :class="getStatusClasses(getContentRoiScore(item))"
                        >
                            <div class="flex items-start justify-between gap-4">
                                <div class="min-w-0 flex-1">
                                    <p
                                        class="text-[10px] font-bold uppercase tracking-[0.18em]"
                                    >
                                        {{
                                            workspaceContentRoiStatusLabels[
                                                getContentRoiStatus(
                                                    getContentRoiScore(item),
                                                )
                                            ]
                                        }}
                                    </p>
                                    <p
                                        class="mt-1 text-2xl font-black tracking-tight"
                                    >
                                        {{ getContentRoiScore(item) }}
                                    </p>
                                    <p
                                        class="mt-1 text-xs leading-relaxed opacity-70"
                                    >
                                        {{
                                            getPerformanceSummary(
                                                getContentRoiScore(item),
                                            )
                                        }}
                                    </p>
                                    <p
                                        class="mt-2 text-xs leading-relaxed opacity-70"
                                    >
                                        {{ item.leads }} leads, sorted by
                                        {{
                                            workspaceContentRoiSortLabels[
                                                block.sortBy
                                            ]
                                        }}
                                    </p>
                                </div>

                                <UButton
                                    color="neutral"
                                    variant="ghost"
                                    icon="i-lucide-trash-2"
                                    size="xs"
                                    class="rounded-lg hover:bg-error/10 hover:text-error"
                                    :aria-label="`Remove ${item.title || 'content row'}`"
                                    @click="removeItem(item.id)"
                                />
                            </div>

                            <UProgress
                                :model-value="getContentRoiScore(item)"
                                color="primary"
                                size="sm"
                                class="mt-3 rounded-full"
                            />
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
