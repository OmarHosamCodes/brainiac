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

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

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

const dimensionPlaybook: Record<WorkspaceContentQualityDimension, string> = {
  hook: "Lead with a clear outcome in the first line to stop the scroll.",
  value: "State the concrete takeaway in plain language within the first 15 seconds.",
  emotion: "Anchor the message to one emotion that matches the audience moment.",
  cta: "End with one direct next step and remove optional or conflicting asks.",
  platformFit: "Match format, cadence, and length to the channel where this will publish.",
  brand: "Reinforce the same voice and positioning used across your core messaging.",
  shareability: "Package the insight so someone can quote or forward it immediately.",
  scrollStop: "Use a stronger opening visual and bolder first sentence framing.",
  authenticity: "Replace generic claims with specific stories, proof, or concrete detail.",
  storytelling: "Move through setup, tension, and payoff in a tighter sequence.",
};

const axes = computed(() =>
  WORKSPACE_CONTENT_QUALITY_DIMENSIONS.map((dimension, index) => {
    const angle =
      (-90 + (360 / WORKSPACE_CONTENT_QUALITY_DIMENSIONS.length) * index) * (Math.PI / 180);
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
      const angle =
        (-90 + (360 / WORKSPACE_CONTENT_QUALITY_DIMENSIONS.length) * index) * (Math.PI / 180);
      const x = center + Math.cos(angle) * radius * scale;
      const y = center + Math.sin(angle) * radius * scale;
      return `${x},${y}`;
    }).join(" "),
  ),
);

const radarPolygonPoints = computed(() => axes.value.map((axis) => `${axis.valueX},${axis.valueY}`).join(" "));

const rankedDimensions = computed(() =>
  [...WORKSPACE_CONTENT_QUALITY_DIMENSIONS].sort(
    (left, right) => props.block.scores[right] - props.block.scores[left],
  ),
);

const focusDimensions = computed(() => rankedDimensions.value.slice(-3).reverse());

const qualityBand = computed(() => {
  if (summary.value.averageScore >= 8) {
    return {
      label: "Execution-ready",
      tone: "success" as const,
      interpretation: "Quality is strong enough to scale confidently across channels.",
    };
  }

  if (summary.value.averageScore >= 6.5) {
    return {
      label: "Solid baseline",
      tone: "primary" as const,
      interpretation: "Core quality is stable, with a few areas still limiting conversion.",
    };
  }

  if (summary.value.averageScore >= 5) {
    return {
      label: "Needs tightening",
      tone: "warning" as const,
      interpretation: "Content has potential but weak dimensions are reducing impact.",
    };
  }

  return {
    label: "High risk",
    tone: "error" as const,
    interpretation: "Quality is too inconsistent; improve weakest dimensions before scaling.",
  };
});

function mutateRadarBlock(mutator: (block: WorkspaceContentQualityRadarBlock) => void) {
  mutateTypedBlock(props.tabId, props.block.id, "content-quality-radar", mutator);
}

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

function clampScore(value: string | number | undefined) {
  const numeric = Number(value || 5);
  return Math.min(10, Math.max(1, Math.round(numeric)));
}

function updateScore(dimension: WorkspaceContentQualityDimension, value: string | number | undefined) {
  mutateRadarBlock((block) => {
    block.scores[dimension] = clampScore(value);
  });
}

function getScoreToneClasses(score: number) {
  if (score >= 8) {
    return "text-success";
  }

  if (score >= 6) {
    return "text-primary";
  }

  if (score >= 4) {
    return "text-warning";
  }

  return "text-error";
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Average</p>
        <p class="mt-2 text-2xl font-black tracking-tight sm:text-3xl" :class="getAverageToneClasses()">
          {{ summary.averageScore }}
        </p>
        <p class="mt-1 text-sm text-muted">Live average across all 10 quality dimensions</p>
      </div>

      <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Quality band</p>
        <p class="mt-2 text-2xl font-black tracking-tight sm:text-3xl" :class="getAverageToneClasses()">
          {{ qualityBand.label }}
        </p>
        <p class="mt-1 text-sm text-muted">{{ qualityBand.interpretation }}</p>
      </div>

      <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Strongest</p>
        <p class="mt-2 text-2xl font-black tracking-tight text-success sm:text-3xl">
          {{
            summary.strongestDimension
              ? workspaceContentQualityDimensionLabels[summary.strongestDimension]
              : "None"
          }}
        </p>
        <p class="mt-1 text-sm text-muted">The highest-performing quality pillar</p>
      </div>

      <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Weakest</p>
        <p class="mt-2 text-2xl font-black tracking-tight text-error sm:text-3xl">
          {{
            summary.weakestDimension
              ? workspaceContentQualityDimensionLabels[summary.weakestDimension]
              : "None"
          }}
        </p>
        <p class="mt-1 text-sm text-muted">Priority area for the next content iteration</p>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <section class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-highlighted">Radar view</p>
            <p class="text-sm text-muted">
              The filled shape expands where content quality is strong and collapses where execution needs work.
            </p>
          </div>

          <div class="text-right">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Score</p>
            <p class="text-2xl font-black tracking-tight sm:text-3xl" :class="getAverageToneClasses()">
              {{ summary.averageScore }}
            </p>
          </div>
        </div>

        <div class="mt-5 flex justify-center">
          <svg :viewBox="`0 0 ${chartSize} ${chartSize}`" class="size-70 overflow-visible">
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
              class="fill-muted/60 text-[8px] font-bold uppercase tracking-[0.2em]"
            >
              {{ shortLabels[axis.dimension] }}
            </text>
          </svg>
        </div>

        <div class="mt-4 rounded-2xl border border-muted/20 bg-default/50 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted/70">Focus next</p>
          <div class="mt-3 space-y-2">
            <article
              v-for="dimension in focusDimensions"
              :key="dimension"
              class="rounded-xl border border-muted/20 bg-default/70 p-3"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-semibold text-highlighted">
                  {{ workspaceContentQualityDimensionLabels[dimension] }}
                </p>
                <span class="text-xs font-black" :class="getScoreToneClasses(block.scores[dimension])">
                  {{ block.scores[dimension] }}/10
                </span>
              </div>
              <p class="mt-1 text-xs text-muted">{{ dimensionPlaybook[dimension] }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-muted/20 bg-default/40 p-5">
        <div class="mb-5">
          <p class="text-sm font-semibold text-highlighted">Dimension controls</p>
          <p class="text-sm text-muted">
            Score each pillar from 1 to 10. Use the benchmark note to decide what to improve before publishing.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <article
            v-for="dimension in WORKSPACE_CONTENT_QUALITY_DIMENSIONS"
            :key="dimension"
            class="rounded-2xl border border-muted/20 bg-elevated/10 p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-highlighted">
                {{ workspaceContentQualityDimensionLabels[dimension] }}
              </p>
              <span class="text-sm font-black" :class="getScoreToneClasses(block.scores[dimension])">
                {{ block.scores[dimension] }}
              </span>
            </div>

            <input
              :value="block.scores[dimension]"
              type="range"
              min="1"
              max="10"
              class="mt-4 h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
              :aria-label="`Score for ${workspaceContentQualityDimensionLabels[dimension]}`"
              @input="updateScore(dimension, ($event.target as HTMLInputElement).value)"
            />

            <div class="mt-3 flex items-center justify-between gap-2">
              <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">1</div>
              <UInput
                :model-value="String(block.scores[dimension])"
                type="number"
                min="1"
                max="10"
                step="1"
                size="xs"
                class="w-20"
                :aria-label="`Numeric score for ${workspaceContentQualityDimensionLabels[dimension]}`"
                @update:model-value="updateScore(dimension, $event as string | number | undefined)"
              />
              <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">10</div>
            </div>

            <p class="mt-3 text-xs text-muted">{{ dimensionPlaybook[dimension] }}</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
