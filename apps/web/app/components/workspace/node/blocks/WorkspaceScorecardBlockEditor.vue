<script setup lang="ts">
import type { WorkspaceScorecardBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
    block: WorkspaceScorecardBlock;
    tabId: string;
}>();

const { addScorecardMetric, mutateScorecardMetric, removeScorecardMetric } =
    useWorkspaceNodeEditorContext();

const summary = computed(() => {
    const metricCount = props.block.metrics.length;
    const atTarget = props.block.metrics.filter(
        (metric) => metric.value >= metric.target,
    ).length;
    const avgProgress =
        metricCount === 0
            ? 0
            : Math.round(
                  props.block.metrics.reduce(
                      (sum, metric) =>
                          sum + getMetricProgress(metric.value, metric.target),
                      0,
                  ) / metricCount,
              );

    return {
        metricCount,
        atTarget,
        behindTarget: Math.max(metricCount - atTarget, 0),
        avgProgress,
    };
});

function toNumber(value: string | number | undefined, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function getMetricProgress(value: number, target: number) {
    if (target === 0) {
        return value > 0 ? 100 : 0;
    }

    return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function getMetricStatus(value: number, target: number) {
    const progress = getMetricProgress(value, target);

    if (progress >= 100) {
        return {
            label: "At target",
            tone: "success" as const,
            textClass: "text-success",
            badgeColor: "success" as const,
            cardClass: "border-success/20 bg-success/5",
        };
    }

    if (progress >= 50) {
        return {
            label: "On track",
            tone: "warning" as const,
            textClass: "text-warning",
            badgeColor: "warning" as const,
            cardClass: "border-warning/20 bg-warning/5",
        };
    }

    return {
        label: "Behind",
        tone: "error" as const,
        textClass: "text-error",
        badgeColor: "error" as const,
        cardClass: "border-error/20 bg-error/5",
    };
}

function updateMetricLabel(
    metricId: string,
    value: string | number | undefined,
) {
    mutateScorecardMetric(props.tabId, props.block.id, metricId, (entry) => {
        entry.label = String(value ?? "").slice(0, 120);
    });
}

function updateMetricValue(
    metricId: string,
    value: string | number | undefined,
) {
    mutateScorecardMetric(props.tabId, props.block.id, metricId, (entry) => {
        entry.value = toNumber(value, 0);
    });
}

function updateMetricTarget(
    metricId: string,
    value: string | number | undefined,
) {
    mutateScorecardMetric(props.tabId, props.block.id, metricId, (entry) => {
        entry.target = toNumber(value, 100);
    });
}

function updateMetricUnit(
    metricId: string,
    value: string | number | undefined,
) {
    mutateScorecardMetric(props.tabId, props.block.id, metricId, (entry) => {
        entry.unit = String(value ?? "").slice(0, 24);
    });
}

function removeMetric(metricId: string) {
    removeScorecardMetric(props.tabId, props.block.id, metricId);
}
</script>

<template>
    <div class="space-y-8">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div
                class="flex flex-col items-center justify-center rounded-3xl border border-primary/10 bg-primary/5 p-5 text-center"
            >
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    Total Metrics
                </p>
                <p
                    class="mt-1 text-2xl font-black tracking-tight text-primary sm:text-3xl"
                >
                    {{ summary.metricCount }}
                </p>
            </div>

            <div
                class="flex flex-col items-center justify-center rounded-3xl border border-success/10 bg-success/5 p-5 text-center"
            >
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    At Target
                </p>
                <p
                    class="mt-1 text-2xl font-black tracking-tight text-success sm:text-3xl"
                >
                    {{ summary.atTarget }}
                </p>
            </div>

            <div
                class="flex flex-col items-center justify-center rounded-3xl border border-error/10 bg-error/5 p-5 text-center"
            >
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    Needs Attention
                </p>
                <p
                    class="mt-1 text-2xl font-black tracking-tight text-error sm:text-3xl"
                >
                    {{ summary.behindTarget }}
                </p>
            </div>

            <div
                class="flex flex-col items-center justify-center rounded-3xl border border-warning/10 bg-warning/5 p-5 text-center"
            >
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    Avg Progress
                </p>
                <p
                    class="mt-1 text-2xl font-black tracking-tight text-warning sm:text-3xl"
                >
                    {{ summary.avgProgress }}%
                </p>
            </div>
        </div>

        <div class="space-y-4">
            <div class="flex items-center justify-between gap-3 px-2">
                <div>
                    <h3
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Key Performance Indicators
                    </h3>
                    <p class="mt-1 text-sm text-muted">
                        Track the current value, target, and unit for each
                        metric in one place.
                    </p>
                </div>

                <UButton
                    color="primary"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-plus"
                    class="rounded-full px-4"
                    aria-label="Add scorecard metric"
                    @click="addScorecardMetric(tabId, block.id)"
                >
                    Add Metric
                </UButton>
            </div>

            <div
                v-if="block.metrics.length > 0"
                class="grid gap-4 md:grid-cols-2"
            >
                <article
                    v-for="metric in block.metrics"
                    :key="metric.id"
                    class="rounded-3xl border p-5 transition-colors"
                    :class="
                        getMetricStatus(metric.value, metric.target).cardClass
                    "
                >
                    <div class="flex items-start justify-between gap-4">
                        <div class="min-w-0 flex-1 space-y-2">
                            <UInput
                                :model-value="metric.label"
                                variant="none"
                                placeholder="Metric title"
                                class="w-full"
                                :ui="{
                                    base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/40',
                                }"
                                :aria-label="`Metric title for ${metric.label || 'scorecard metric'}`"
                                @update:model-value="
                                    updateMetricLabel(metric.id, $event)
                                "
                            />

                            <div class="flex flex-wrap items-center gap-2">
                                <UBadge
                                    :color="
                                        getMetricStatus(
                                            metric.value,
                                            metric.target,
                                        ).badgeColor
                                    "
                                    variant="soft"
                                    class="rounded-2xl"
                                >
                                    {{
                                        getMetricStatus(
                                            metric.value,
                                            metric.target,
                                        ).label
                                    }}
                                </UBadge>
                                <UBadge
                                    color="neutral"
                                    variant="soft"
                                    class="rounded-2xl"
                                >
                                    {{
                                        getMetricProgress(
                                            metric.value,
                                            metric.target,
                                        )
                                    }}% progress
                                </UBadge>
                            </div>
                        </div>

                        <UButton
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            icon="i-lucide-trash-2"
                            class="rounded-xl hover:text-error"
                            :aria-label="`Remove ${metric.label || 'scorecard'} metric`"
                            @click="removeMetric(metric.id)"
                        />
                    </div>

                    <div
                        class="mt-6 flex flex-wrap items-end justify-between gap-4"
                    >
                        <div>
                            <p
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                            >
                                Current vs Target
                            </p>
                            <div class="mt-2 flex items-end gap-2">
                                <span
                                    class="text-3xl font-black tracking-tight sm:text-4xl"
                                    :class="
                                        getMetricStatus(
                                            metric.value,
                                            metric.target,
                                        ).textClass
                                    "
                                >
                                    {{ metric.value }}
                                </span>
                                <span
                                    class="pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                                >
                                    / {{ metric.target }}
                                    {{ metric.unit || "units" }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="mt-5 space-y-3">
                        <div
                            class="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em]"
                        >
                            <span class="text-muted/60">Progress</span>
                            <span
                                :class="
                                    getMetricStatus(metric.value, metric.target)
                                        .textClass
                                "
                            >
                                {{
                                    getMetricProgress(
                                        metric.value,
                                        metric.target,
                                    )
                                }}%
                            </span>
                        </div>

                        <UProgress
                            :model-value="
                                getMetricProgress(metric.value, metric.target)
                            "
                            size="sm"
                            class="rounded-full"
                        />
                    </div>

                    <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div class="space-y-1">
                            <p
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                            >
                                Current
                            </p>
                            <UInput
                                :model-value="String(metric.value)"
                                type="number"
                                size="sm"
                                class="rounded-xl"
                                :aria-label="`Current value for ${metric.label || 'scorecard metric'}`"
                                @update:model-value="
                                    updateMetricValue(metric.id, $event)
                                "
                            />
                        </div>

                        <div class="space-y-1">
                            <p
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                            >
                                Target
                            </p>
                            <UInput
                                :model-value="String(metric.target)"
                                type="number"
                                size="sm"
                                class="rounded-xl"
                                :aria-label="`Target value for ${metric.label || 'scorecard metric'}`"
                                @update:model-value="
                                    updateMetricTarget(metric.id, $event)
                                "
                            />
                        </div>

                        <div class="space-y-1">
                            <p
                                class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                            >
                                Unit
                            </p>
                            <UInput
                                :model-value="metric.unit"
                                size="sm"
                                placeholder="%"
                                class="rounded-xl"
                                :aria-label="`Unit for ${metric.label || 'scorecard metric'}`"
                                @update:model-value="
                                    updateMetricUnit(metric.id, $event)
                                "
                            />
                        </div>
                    </div>
                </article>
            </div>

            <div
                v-else
                class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
            >
                <div class="mb-4 flex items-center justify-center">
                    <UIcon
                        name="i-lucide-bar-chart-3"
                        class="size-8 text-muted/40"
                    />
                </div>
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    No metrics defined
                </p>
                <p class="mt-2 text-sm text-muted">
                    Add a metric to track performance against a target.
                </p>
                <UButton
                    color="primary"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-plus"
                    class="mt-4 rounded-full px-4"
                    aria-label="Add first scorecard metric"
                    @click="addScorecardMetric(tabId, block.id)"
                >
                    Add Metric
                </UButton>
            </div>
        </div>
    </div>
</template>
