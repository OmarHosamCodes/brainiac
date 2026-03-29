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
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-3xl bg-primary/10 border border-primary/20 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Coverage</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-primary">
          {{ summary.filledCellCount }}/9
        </p>
      </div>

      <div class="rounded-3xl bg-warning/10 border border-warning/20 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/70">Missing</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-warning">
          {{ summary.missingCellCount }}
        </p>
      </div>

      <div class="rounded-3xl bg-success/10 border border-success/20 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">Readiness</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-success">
          {{ getReadinessLabel() }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Business model canvas</p>
        <p class="text-sm text-muted">
          Fill the nine cells to pressure-test how the model creates, delivers, and captures value.
        </p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-sparkles"
        class="rounded-full px-4"
        @click="runAnalysis"
      >
        AI Analyze
      </UButton>
    </div>

    <div class="overflow-x-auto pb-2">
      <div class="bmc-grid grid gap-4 lg:min-w-[1080px]">
        <article
          v-for="cell in canvasCells"
          :key="cell.key"
          class="rounded-3xl border border-muted/20 bg-default/40 p-4"
          :class="`bmc-${cell.area}`"
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
              {{ workspaceBusinessModelCanvasCellLabels[cell.key] }}
            </p>
            <UBadge
              :color="block.cells[cell.key].trim() ? 'primary' : 'neutral'"
              variant="soft"
              size="sm"
              class="rounded-2xl"
            >
              {{ block.cells[cell.key].trim() ? "Filled" : "Open" }}
            </UBadge>
          </div>

          <UTextarea
            :model-value="block.cells[cell.key]"
            :rows="cell.key === 'costStructure' || cell.key === 'revenueStreams' ? 4 : 6"
            autoresize
            :placeholder="cell.placeholder"
            class="w-full"
            :ui="{ base: 'min-h-32 rounded-2xl bg-elevated/10' }"
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

    <section class="rounded-3xl border border-primary/20 bg-primary/10 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-highlighted">Analysis output</p>
          <p class="text-sm text-muted">
            Identifies strengths, missing pieces, and the next strategic questions to answer.
          </p>
        </div>

        <p v-if="block.analysisUpdatedAt" class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          Last analyzed {{ formatDateTime(block.analysisUpdatedAt) }}
        </p>
      </div>

      <div
        class="mt-4 rounded-2xl border border-muted/20 bg-default/60 p-4 text-sm leading-relaxed text-toned whitespace-pre-line"
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
