<script setup lang="ts">
import {
  WORKSPACE_CONTENT_QUALITY_DIMENSIONS,
  getContentQualityRadarSummary,
  workspaceContentQualityDimensionLabels,
  type WorkspaceContentQualityDimension,
  type WorkspaceContentQualityRadarBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceContentQualityRadarBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getContentQualityRadarSummary(props.block));
const chartSize = 280;
const center = chartSize / 2;
const radius = 104;
const labelRadius = 126;
const shortLabels: Record<WorkspaceContentQualityDimension, string> = {
  hook: "Hook",
  value: "Value",
  emotion: "Emotion",
  cta: "CTA",
  platformFit: "Fit",
  brand: "Brand",
  shareability: "Share",
  scrollStop: "Stop",
  authenticity: "Real",
  storytelling: "Story",
};

const axes = computed(() =>
  WORKSPACE_CONTENT_QUALITY_DIMENSIONS.map((dimension, index) => {
    const angle = (-90 + (360 / WORKSPACE_CONTENT_QUALITY_DIMENSIONS.length) * index) * (Math.PI / 180);
    const outerX = center + Math.cos(angle) * radius;
    const outerY = center + Math.sin(angle) * radius;
    const pointRadius = radius * (props.block.scores[dimension] / 10);
    const valueX = center + Math.cos(angle) * pointRadius;
    const valueY = center + Math.sin(angle) * pointRadius;
    const labelX = center + Math.cos(angle) * labelRadius;
    const labelY = center + Math.sin(angle) * labelRadius;

    return {
      dimension,
      outerX,
      outerY,
      valueX,
      valueY,
      labelX,
      labelY,
    };
  }),
);

const ringPolygons = computed(() =>
  [0.25, 0.5, 0.75, 1].map((scale) =>
    WORKSPACE_CONTENT_QUALITY_DIMENSIONS.map((_, index) => {
      const angle = (-90 + (360 / WORKSPACE_CONTENT_QUALITY_DIMENSIONS.length) * index) * (Math.PI / 180);
      const x = center + Math.cos(angle) * radius * scale;
      const y = center + Math.sin(angle) * radius * scale;
      return `${x},${y}`;
    }).join(" "),
  ),
);

const radarPolygonPoints = computed(() =>
  axes.value.map((axis) => `${axis.valueX},${axis.valueY}`).join(" "),
);

function getAverageToneClasses() {
  if (summary.value.averageScore >= 7) {
    return "text-success";
  }

  if (summary.value.averageScore >= 5) {
    return "text-warning";
  }

  return "text-error";
}

function getLabelAnchor(x: number) {
  if (x < center - 12) {
    return "end";
  }

  if (x > center + 12) {
    return "start";
  }

  return "middle";
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "5";
}

function clampScore(value: string) {
  const numeric = Number(value || 5);
  return Math.min(10, Math.max(1, Math.round(numeric)));
}

function updateScore(dimension: WorkspaceContentQualityDimension, value: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "content-quality-radar") {
      return;
    }

    block.scores[dimension] = clampScore(value);
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Average</p>
        <p class="mt-2 text-4xl font-black tracking-tight" :class="getAverageToneClasses()">
          {{ summary.averageScore }}
        </p>
        <p class="mt-1 text-sm text-muted">Live average across all 10 quality dimensions</p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">
          Strongest
        </p>
        <p class="mt-2 text-2xl font-black tracking-tight text-success">
          {{
            summary.strongestDimension
              ? workspaceContentQualityDimensionLabels[summary.strongestDimension]
              : "None"
          }}
        </p>
      </div>

      <div class="rounded-[28px] bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-error/70">Weakest</p>
        <p class="mt-2 text-2xl font-black tracking-tight text-error">
          {{
            summary.weakestDimension
              ? workspaceContentQualityDimensionLabels[summary.weakestDimension]
              : "None"
          }}
        </p>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <section class="rounded-[32px] border border-primary/20 bg-primary/5 p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-highlighted">Radar view</p>
            <p class="text-sm text-muted">
              The filled shape expands where the content is strong and collapses where quality is weak.
            </p>
          </div>

          <div class="text-right">
            <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Score</p>
            <p class="text-4xl font-black tracking-tight" :class="getAverageToneClasses()">
              {{ summary.averageScore }}
            </p>
          </div>
        </div>

        <div class="mt-5 flex justify-center">
          <svg :viewBox="`0 0 ${chartSize} ${chartSize}`" class="size-[280px] overflow-visible">
            <polygon
              v-for="(points, index) in ringPolygons"
              :key="`ring-${index}`"
              :points="points"
              fill="none"
              stroke="currentColor"
              class="text-muted/20"
            />

            <line
              v-for="axis in axes"
              :key="`axis-${axis.dimension}`"
              :x1="center"
              :y1="center"
              :x2="axis.outerX"
              :y2="axis.outerY"
              stroke="currentColor"
              class="text-muted/20"
            />

            <polygon
              :points="radarPolygonPoints"
              fill="currentColor"
              stroke="currentColor"
              class="text-primary/30"
              stroke-width="2"
            />

            <circle
              v-for="axis in axes"
              :key="`point-${axis.dimension}`"
              :cx="axis.valueX"
              :cy="axis.valueY"
              r="3.5"
              class="fill-primary"
            />

            <text
              v-for="axis in axes"
              :key="`label-${axis.dimension}`"
              :x="axis.labelX"
              :y="axis.labelY"
              :text-anchor="getLabelAnchor(axis.labelX)"
              class="fill-muted text-[8px] font-bold uppercase tracking-[0.2em]"
            >
              {{ shortLabels[axis.dimension] }}
            </text>
          </svg>
        </div>
      </section>

      <section class="rounded-[32px] border border-muted/30 bg-default/40 p-5">
        <div class="mb-5">
          <p class="text-sm font-semibold text-highlighted">Dimension controls</p>
          <p class="text-sm text-muted">
            Use the sliders to score the content from 1 to 10. The chart updates immediately.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <article
            v-for="dimension in WORKSPACE_CONTENT_QUALITY_DIMENSIONS"
            :key="dimension"
            class="rounded-[24px] border border-muted/25 bg-elevated/40 p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-highlighted">
                {{ workspaceContentQualityDimensionLabels[dimension] }}
              </p>
              <span class="text-sm font-black text-primary">{{ block.scores[dimension] }}</span>
            </div>

            <input
              :value="block.scores[dimension]"
              type="range"
              min="1"
              max="10"
              class="mt-4 h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
              @input="updateScore(dimension, getInputValue($event))"
            />

            <div class="mt-3 flex items-center justify-between text-xs text-muted">
              <span>1</span>
              <span>10</span>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
