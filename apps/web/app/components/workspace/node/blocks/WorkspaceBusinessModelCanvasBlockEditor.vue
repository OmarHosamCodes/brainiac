<script setup lang="ts">
import {
  analyzeBusinessModelCanvas,
  getBusinessModelCanvasSummary,
  workspaceBusinessModelCanvasCellLabels,
  type WorkspaceBusinessModelCanvasBlock,
  type WorkspaceBusinessModelCanvasCellKey,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { formatDateTime } from "~/utils/format-date-time";

const props = defineProps<{
  block: WorkspaceBusinessModelCanvasBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getBusinessModelCanvasSummary(props.block));

const canvasCells: Array<{
  key: WorkspaceBusinessModelCanvasCellKey;
  area: string;
  placeholder: string;
}> = [
  {
    key: "keyPartners",
    area: "partners",
    placeholder: "Freelancers, tool providers, media partners...",
  },
  {
    key: "keyActivities",
    area: "activities",
    placeholder: "Curriculum design, consulting delivery, content publishing...",
  },
  {
    key: "keyResources",
    area: "resources",
    placeholder: "Brand, curriculum assets, instructor bench, CRM...",
  },
  {
    key: "valuePropositions",
    area: "value",
    placeholder: "Practical outcomes, speed to implementation, trusted guidance...",
  },
  {
    key: "customerRelationships",
    area: "relationships",
    placeholder: "Community, advisory support, office hours, account management...",
  },
  {
    key: "channels",
    area: "channels",
    placeholder: "Content funnel, referrals, sales calls, partnerships...",
  },
  {
    key: "customerSegments",
    area: "segments",
    placeholder: "Founders, senior marketers, in-house teams...",
  },
  {
    key: "costStructure",
    area: "costs",
    placeholder: "Talent, media spend, software, production, delivery costs...",
  },
  {
    key: "revenueStreams",
    area: "revenue",
    placeholder: "Cohorts, retainers, advisory, licensing, workshops...",
  },
];

function getReadinessLabel() {
  switch (summary.value.readiness) {
    case "aligned":
      return "Aligned";
    case "forming":
      return "Forming";
    default:
      return "Early";
  }
}

function runAnalysis() {
  mutateBlock(props.tabId, props.block.id, (block, _tab, _node, timestamp) => {
    if (block.type !== "business-model-canvas") {
      return;
    }

    const analysis = analyzeBusinessModelCanvas(block);
    block.analysis = analysis.narrative;
    block.analysisUpdatedAt = timestamp;
  });
}
</script>

<template>
  <div class="space-y-5">
    <!-- Summary Stats -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-2xl bg-primary/10 border border-primary/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Coverage</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary">
          {{ summary.filledCellCount }}/9
        </p>
      </div>

      <div class="rounded-2xl bg-warning/10 border border-warning/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/70">Missing</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-warning">
          {{ summary.missingCellCount }}
        </p>
      </div>

      <div class="rounded-2xl bg-success/10 border border-success/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">Readiness</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-success">
          {{ getReadinessLabel() }}
        </p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <h2 class="text-sm font-black text-highlighted tracking-tight">Business Model Canvas</h2>
        <p class="text-xs text-muted">Pressure-test how the model creates, delivers, and captures value.</p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-sparkles"
        size="sm"
        class="rounded-full"
        @click="runAnalysis"
      >
        AI Analyze
      </UButton>
    </div>

    <!-- Canvas Grid -->
    <div class="overflow-x-auto pb-2">
      <div class="bmc-grid grid gap-3 lg:min-w-[1000px]">
        <article
          v-for="cell in canvasCells"
          :key="cell.key"
          class="rounded-2xl border p-4 transition-colors"
          :class="[
            `bmc-${cell.area}`,
            block.cells[cell.key].trim()
              ? 'border-muted/20 bg-default/40'
              : 'border-warning/30 bg-warning/5'
          ]"
        >
          <div class="mb-3 flex items-center justify-between gap-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
              {{ workspaceBusinessModelCanvasCellLabels[cell.key] }}
            </p>
            <UBadge
              :color="block.cells[cell.key].trim() ? 'primary' : 'neutral'"
              variant="soft"
              size="sm"
              class="rounded-lg px-2"
            >
              {{ block.cells[cell.key].trim() ? "Filled" : "Empty" }}
            </UBadge>
          </div>

          <UTextarea
            :model-value="block.cells[cell.key]"
            :rows="cell.key === 'costStructure' || cell.key === 'revenueStreams' ? 3 : 5"
            autoresize
            :placeholder="block.cells[cell.key].trim() ? '' : cell.placeholder"
            class="w-full"
            :ui="{ base: 'min-h-24 rounded-xl bg-elevated/10' }"
            @update:model-value="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'business-model-canvas') return;
                entry.cells[cell.key] = ($event ?? '').slice(0, 4000);
              })
            "
          />
        </article>
      </div>
    </div>

    <!-- Missing Cells Guidance -->
    <div
      v-if="summary.missingCellCount > 0"
      class="rounded-2xl border border-warning/20 bg-warning/5 p-4"
    >
      <div class="flex items-start gap-3">
        <div class="flex size-8 items-center justify-center rounded-lg bg-warning/10 text-warning shrink-0">
          <UIcon name="i-lucide-alert-triangle" size="16" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-bold text-warning">Incomplete canvas</p>
          <p class="text-xs text-muted mt-1">
            {{ summary.missingCellCount }} cell{{ summary.missingCellCount !== 1 ? 's' : '' }} need{{ summary.missingCellCount === 1 ? 's' : '' }} attention. Fill all cells for a complete model analysis.
          </p>
        </div>
      </div>
    </div>

    <!-- Analysis Output -->
    <section class="rounded-2xl border border-primary/20 bg-primary/10 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-black text-highlighted tracking-tight">Analysis Output</h3>
          <p class="text-xs text-muted mt-0.5">
            Identifies strengths, gaps, and strategic questions.
          </p>
        </div>

        <p v-if="block.analysisUpdatedAt" class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          Last analyzed {{ formatDateTime(block.analysisUpdatedAt) }}
        </p>
      </div>

      <div
        class="mt-3 rounded-xl border border-muted/20 bg-default/60 p-4 text-sm leading-relaxed text-toned whitespace-pre-line"
      >
        {{ block.analysis || "Run AI Analyze to generate a gap analysis of the current canvas." }}
      </div>
    </section>
  </div>
</template>

<style scoped>
@media (min-width: 1024px) {
  .bmc-grid {
    grid-template-areas:
      "partners activities value relationships segments"
      "partners resources value channels segments"
      "costs costs revenue revenue revenue";
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .bmc-partners {
    grid-area: partners;
  }

  .bmc-activities {
    grid-area: activities;
  }

  .bmc-resources {
    grid-area: resources;
  }

  .bmc-value {
    grid-area: value;
  }

  .bmc-relationships {
    grid-area: relationships;
  }

  .bmc-channels {
    grid-area: channels;
  }

  .bmc-segments {
    grid-area: segments;
  }

  .bmc-costs {
    grid-area: costs;
  }

  .bmc-revenue {
    grid-area: revenue;
  }
}
</style>
